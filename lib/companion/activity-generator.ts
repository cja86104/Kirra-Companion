/**
 * Activity Generator
 *
 * Generates contextual activities for companions based on:
 * - Personality traits (from companion DNA)
 * - Current interests
 * - Time of day
 * - Current mood
 * - Energy levels
 * - Backstory + memories + recent chats (via loadActivityContext)
 * - Recently-used templates (anti-repetition, SPEC §6.4)
 *
 * Activities are the building blocks of the simulated life.
 *
 * Section D (Phase 6) wiring:
 *   1. loadActivityContext + interests + recent template_ids in parallel
 *   2. eligibility filter — adds personalityGate evaluation
 *   3. score — adds anti-repetition penalty per SPEC §6.4
 *   4. enrichActivity — single AI call producing the specific moment
 *   5. CompanionActivityInsert built from EnrichedActivityOutput
 *
 * Per Phase 6D Q1=(a): enriched.specifics is intentionally NOT persisted
 * (companion_activities has no metadata column today; SPEC §5.4 was wrong
 * about the schema). Specifics survive in user-visible form via narrative.
 */

import { createClient as createAdminClient } from '@supabase/supabase-js';

import type {
  ActivityTemplate,
  ActivityCategory,
  TimeOfDay,
  CompanionMoodState,
  CompanionInterest,
  CompanionActivityInsert,
} from '@/types/life-simulation';
import type { Companion, CompanionDNA } from '@/types/database';

import { ALL_TEMPLATES } from './activity-templates';
import { loadActivityContext, type ActivityEnrichmentContext } from './activity-context';
import { enrichActivity } from './activity-enrichment';

/**
 * Get an admin Supabase client for background processes.
 *
 * Activity generation runs primarily inside `runSimulationTick` (called from
 * the `/api/cron/life-simulation` endpoint with no user session) and from
 * user-facing routes that have already verified ownership at the route
 * layer. In both cases the DB reads here (companion interests, recent
 * template_ids) are system operations driving the autonomous simulation,
 * not direct user actions. The user-scoped SSR client would fail in the
 * cron path (no cookies → anon → RLS blocks everything), so this library
 * uses the service role. Matches the pattern in
 * `lib/companion/life-simulation.ts` and `lib/companion/dna-evolution.ts`.
 */
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase admin credentials');
  return createAdminClient(url, key);
}

// ============================================================================
// Activity Templates
// ============================================================================

/**
 * Activity catalog. Sourced from the personality-gated split files in
 * `lib/companion/activity-templates/`; re-exported here as ACTIVITY_TEMPLATES
 * to preserve historical import paths.
 */
export const ACTIVITY_TEMPLATES: readonly ActivityTemplate[] = ALL_TEMPLATES;

// ============================================================================
// Internal helpers
// ============================================================================

/**
 * Pull a numeric field from the loosely-typed personality_base Json column.
 * Returns undefined if the column is missing, isn't an object, isn't keyed
 * by the requested name, or stores something other than a number. Mirrors
 * the helper in activity-context.ts (kept local here so this file does not
 * reach into Section B's internals).
 */
function readNumberFromJson(
  json: Companion['personality_base'],
  key: string
): number | undefined {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return undefined;
  const value = (json as { [k: string]: unknown })[key];
  return typeof value === 'number' ? value : undefined;
}

/**
 * Project the loosely-typed personality_base Json column into a flat
 * Record<string, number> for the existing scoring logic. Non-numeric
 * entries are silently dropped. Replaces the previous
 * `as unknown as Record<string, number>` cast at the generator entry
 * point.
 */
function readPersonalityRecord(
  json: Companion['personality_base']
): Record<string, number> {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return {};
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(json as Record<string, unknown>)) {
    if (typeof value === 'number') out[key] = value;
  }
  return out;
}

/**
 * Escape regex metacharacters in a user-supplied keyword so it can be
 * embedded inside a `\b…\b` pattern safely. Source set matches the MDN
 * recommended escape list. Used by `evaluatePersonalityGate` so a keyword
 * like "sci-fi" or "d&d" doesn't break the match.
 */
function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================================
// Anti-repetition (SPEC §6.4)
// ============================================================================

const RECENT_TEMPLATE_LOOKBACK_HOURS = 48;
const RECENT_TEMPLATE_LIMIT = 10;
const RECENT_TEMPLATE_BASE_PENALTY = 0.3;
const RECENT_TEMPLATE_DECAY_PER_INDEX = 0.07;

/**
 * Load the last 10 `template_id` values for this companion from the past 48h,
 * most-recent first. Used by `scoreTemplate` to discount templates the
 * companion just used — solves the "same 4 activities" symptom.
 *
 * Failures degrade to an empty list (returns the same shape as a no-history
 * companion) so the simulation tick continues to make progress. Logged with
 * companion id to match the rest of the activity pipeline.
 */
async function loadRecentTemplateIds(
  supabase: ReturnType<typeof getAdminClient>,
  companionId: string
): Promise<string[]> {
  const since = new Date(
    Date.now() - RECENT_TEMPLATE_LOOKBACK_HOURS * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await supabase
    .from('companion_activities')
    .select('template_id')
    .eq('companion_id', companionId)
    .gte('started_at', since)
    .order('started_at', { ascending: false })
    .limit(RECENT_TEMPLATE_LIMIT);

  if (error) {
    console.error('[activity-generator] recent template_id query failed', {
      companionId,
      error: error.message,
    });
    return [];
  }

  return (data ?? []).map((row) => row.template_id);
}

// ============================================================================
// Personality gate (SPEC §6.1)
// ============================================================================

/**
 * Evaluate the optional personalityGate on a template. Returns true when
 * EVERY present gate passes — relationship type, affection/trust floors,
 * required personality traits, interest keyword presence, and quirk
 * exclusions. Templates without a gate are universally eligible.
 *
 * Interest keyword matching uses a case-insensitive word-boundary regex
 * against the merged interest list AND the backstory excerpt — a
 * substring match would over-match (e.g., keyword "art" hitting
 * "depart"). Word boundaries catch free-text interests, controlled-vocab
 * interests, and personality-defining details that only live in the
 * backstory, without false positives on unrelated words.
 */
function evaluatePersonalityGate(
  template: ActivityTemplate,
  context: ActivityEnrichmentContext,
  companion: Companion
): boolean {
  const gate = template.personalityGate;
  if (!gate) return true;

  if (gate.relationshipTypes && gate.relationshipTypes.length > 0) {
    if (!gate.relationshipTypes.includes(companion.relationship_type)) {
      return false;
    }
  }

  if (gate.minAffection !== undefined && companion.affection_level < gate.minAffection) {
    return false;
  }

  if (gate.minTrust !== undefined && companion.trust_level < gate.minTrust) {
    return false;
  }

  if (gate.requiredPersonalityTraits && gate.requiredPersonalityTraits.length > 0) {
    for (const req of gate.requiredPersonalityTraits) {
      const value = readNumberFromJson(companion.personality_base, req.trait);
      if (value === undefined || value < req.min) return false;
    }
  }

  if (gate.interestKeywords && gate.interestKeywords.length > 0) {
    const haystack = [
      ...context.companion.interests,
      context.companion.backstoryExcerpt,
    ].join(' ');
    const hasKeyword = gate.interestKeywords.some((keyword) =>
      new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'i').test(haystack)
    );
    if (!hasKeyword) return false;
  }

  if (gate.excludedQuirks && gate.excludedQuirks.length > 0) {
    const quirksLower = context.companion.quirks.map((q) => q.toLowerCase());
    const blocked = gate.excludedQuirks.some((excluded) => {
      const needle = excluded.toLowerCase();
      return quirksLower.some((q) => q.includes(needle));
    });
    if (blocked) return false;
  }

  return true;
}

// ============================================================================
// Eligibility + Scoring
// ============================================================================

/**
 * Filter templates that are eligible for the current context. Combines the
 * existing time-of-day / energy / social-need filters with the new
 * personalityGate check.
 *
 * If gate evaluation drops every template, falls back to the un-gated
 * subset that passed the time/energy filters and emits a console.warn so
 * the over-tuned gate is observable in production logs. SPEC §6.2 calls
 * this "the universally-eligible fallback when personality-gated templates
 * are sparse" — it ensures `generateActivity` never silently returns null
 * because the personality gate over-constrained.
 */
function getEligibleTemplates(
  mood: CompanionMoodState,
  timeOfDay: TimeOfDay,
  context: ActivityEnrichmentContext,
  companion: Companion
): ActivityTemplate[] {
  const baseEligible: ActivityTemplate[] = [];

  for (const template of ACTIVITY_TEMPLATES) {
    if (template.timeOfDayPreference && !template.timeOfDayPreference.includes(timeOfDay)) {
      continue;
    }
    if (template.intensity === 'high' && mood.energy_level < 40) continue;
    if (template.intensity === 'medium' && mood.energy_level < 20) continue;
    if (template.category === 'social' && mood.social_need < 20) continue;

    baseEligible.push(template);
  }

  const gated = baseEligible.filter((template) =>
    evaluatePersonalityGate(template, context, companion)
  );

  if (gated.length > 0) return gated;

  console.warn('[activity-generator] personality-gate fallback engaged', {
    companionId: companion.id,
    timeOfDay,
    baseEligibleCount: baseEligible.length,
    gatedCount: 0,
  });

  return baseEligible.filter((template) => template.personalityGate === undefined);
}

/**
 * Score a template based on companion preferences plus the SPEC §6.4
 * anti-repetition penalty: any template that appears in the recent-templates
 * list takes a multiplicative discount, with the most-recent match
 * discounted hardest (30% of score) and progressively older matches
 * decaying back toward 100%.
 */
function scoreTemplate(
  template: ActivityTemplate,
  personality: Record<string, number>,
  interests: CompanionInterest[],
  mood: CompanionMoodState,
  recentTemplateIds: string[]
): number {
  let score = 1.0;

  // Personality-based scoring
  if (template.category === 'creative') {
    score *= 0.5 + (personality.openness || 0.5) * 1.0;
  }
  if (template.category === 'social') {
    score *= 0.5 + (personality.extraversion || 0.5) * 1.0;
  }
  if (template.category === 'learning') {
    score *= 0.5 + (personality.curiosity || 0.5) * 1.0;
  }
  if (template.category === 'reflection') {
    score *= 0.5 + (1 - (personality.extraversion || 0.5)) * 0.8;
  }

  // Interest-based scoring
  const interestCategories = interests.map((i) => i.interest_category);
  if (template.category === 'hobby') {
    const hasRelatedInterest = interests.some(
      (i) =>
        i.interest_category === 'games' ||
        i.interest_category === 'entertainment' ||
        i.interest_category === 'collecting'
    );
    if (hasRelatedInterest) score *= 1.3;
  }
  if (template.category === 'creative') {
    if (interestCategories.includes('arts') || interestCategories.includes('crafts')) {
      score *= 1.4;
    }
  }

  // Mood-based scoring
  if (mood.primary === 'energetic' || mood.primary === 'excited') {
    if (template.intensity === 'high' || template.intensity === 'medium') {
      score *= 1.2;
    }
  }
  if (mood.primary === 'tired' || mood.primary === 'calm') {
    if (template.intensity === 'low') {
      score *= 1.3;
    }
  }
  if (mood.primary === 'curious') {
    if (template.category === 'learning') {
      score *= 1.4;
    }
  }
  if (mood.primary === 'loving' || mood.primary === 'nostalgic') {
    if (template.category === 'social') {
      score *= 1.5;
    }
  }

  // Social need affects social activity scoring
  if (template.category === 'social') {
    score *= 0.5 + (mood.social_need / 100) * 1.0;
  }

  // Creativity level affects creative activity scoring
  if (template.category === 'creative') {
    score *= 0.6 + (mood.creativity_level / 100) * 0.8;
  }

  // Anti-repetition penalty (SPEC §6.4) — the index of the matched template
  // in the recent-list determines how aggressively the score is cut. Most
  // recent (index 0) → 30% of score; older entries decay toward 100%.
  const recentIdx = recentTemplateIds.indexOf(template.id);
  if (recentIdx !== -1) {
    score *= RECENT_TEMPLATE_BASE_PENALTY + recentIdx * RECENT_TEMPLATE_DECAY_PER_INDEX;
  }

  // Add some randomness
  score *= 0.8 + Math.random() * 0.4;

  return score;
}

/**
 * Select an outcome based on weighted probabilities
 */
function selectOutcome(template: ActivityTemplate): {
  outcome: ActivityTemplate['possibleOutcomes'][number]['outcome'];
  narrative: string;
} {
  const totalWeight = template.possibleOutcomes.reduce((sum, o) => sum + o.weight, 0);
  let random = Math.random() * totalWeight;

  for (const outcomeOption of template.possibleOutcomes) {
    random -= outcomeOption.weight;
    if (random <= 0) {
      const narrative =
        outcomeOption.narratives[Math.floor(Math.random() * outcomeOption.narratives.length)];
      return { outcome: outcomeOption.outcome, narrative };
    }
  }

  // Fallback
  const lastOption = template.possibleOutcomes[template.possibleOutcomes.length - 1];
  return {
    outcome: lastOption.outcome,
    narrative: lastOption.narratives[0],
  };
}

// ============================================================================
// Main Generator Function
// ============================================================================

/**
 * Generate an activity for a companion. Public signature is unchanged from
 * pre-Section-D: callers in `runSimulationTick` continue to invoke
 * `generateActivity(companion, mood, timeOfDay)` and receive a
 * `CompanionActivityInsert | null`.
 *
 * Internals (Section D):
 *   1. Load companion_interests, full activity context, and the recent
 *      template_id list in parallel.
 *   2. Filter eligible templates (time/energy/social-need + personalityGate).
 *   3. Score with anti-repetition penalty; pick from top 5 with randomness.
 *   4. Select an outcome → fallback narrative for the AI path.
 *   5. Call `enrichActivity` for the specific name/description/narrative
 *      and the AI's thinking_of_user signal. enrichActivity never throws
 *      and never returns null — graceful degradation is built in.
 *   6. Build CompanionActivityInsert from the validated AI output.
 */
export async function generateActivity(
  companion: Companion & { companion_dna?: CompanionDNA },
  mood: CompanionMoodState,
  timeOfDay: TimeOfDay
): Promise<CompanionActivityInsert | null> {
  const supabase = getAdminClient();

  // ── 1. Parallel loads ─────────────────────────────────────────────────────
  const interestsPromise = supabase
    .from('companion_interests')
    .select('*')
    .eq('companion_id', companion.id)
    .order('strength', { ascending: false })
    .limit(10);

  const [interestsResult, context, recentTemplateIds] = await Promise.all([
    interestsPromise,
    loadActivityContext(companion, mood, timeOfDay),
    loadRecentTemplateIds(supabase, companion.id),
  ]);

  if (interestsResult.error) {
    console.error('[activity-generator] companion_interests query failed', {
      companionId: companion.id,
      error: interestsResult.error.message,
    });
  }
  const interests = (interestsResult.data ?? []) as CompanionInterest[];

  const personality = readPersonalityRecord(companion.personality_base);

  // ── 2. Eligibility (time/energy/social + personalityGate) ─────────────────
  const eligible = getEligibleTemplates(mood, timeOfDay, context, companion);

  if (eligible.length === 0) {
    return null;
  }

  // ── 3. Score with anti-repetition; pick from top candidates ──────────────
  const scored = eligible.map((template) => ({
    template,
    score: scoreTemplate(template, personality, interests, mood, recentTemplateIds),
  }));

  scored.sort((a, b) => b.score - a.score);
  const topCandidates = scored.slice(0, Math.min(5, scored.length));
  const selected = topCandidates[Math.floor(Math.random() * topCandidates.length)].template;

  // ── 4. Select outcome (fallback narrative for the AI path) ────────────────
  const { outcome, narrative } = selectOutcome(selected);

  // ── Resolve related interest id (unchanged) ───────────────────────────────
  let relatedInterestId: string | null = null;
  if (interests.length > 0) {
    const categoryMap: Record<ActivityCategory, string[]> = {
      hobby: ['games', 'entertainment', 'collecting'],
      learning: ['sciences', 'humanities', 'technology'],
      creative: ['arts', 'crafts'],
      social: ['social'],
      reflection: ['wellness'],
      entertainment: ['entertainment', 'games', 'travel'],
    };

    const relatedCategories = categoryMap[selected.category] ?? [];
    const relatedInterest = interests.find((i) =>
      relatedCategories.includes(i.interest_category)
    );
    if (relatedInterest) {
      relatedInterestId = relatedInterest.id;
    }
  }

  // ── 5. AI enrichment — never throws, always returns a valid output ────────
  const enriched = await enrichActivity({
    companionId: companion.id,
    template: selected,
    context,
    fallbackNarrative: narrative,
  });

  // ── 6. Persist ────────────────────────────────────────────────────────────
  // Per Phase 6D Q1=(a): enriched.specifics is intentionally not persisted
  // because companion_activities has no metadata column today. The specific
  // details survive in user-visible form via enriched.narrative.
  const now = new Date();
  const startedAt = new Date(now.getTime() - selected.durationMinutes * 60 * 1000);

  return {
    companion_id: companion.id,
    template_id: selected.id,
    activity_name: enriched.activity_name,
    activity_category: selected.category,
    description: enriched.description,
    narrative: enriched.narrative,
    started_at: startedAt.toISOString(),
    ended_at: now.toISOString(),
    duration_minutes: selected.durationMinutes,
    outcome,
    mood_effects_applied: selected.moodEffects,
    related_interest_id: relatedInterestId,
    thinking_of_user: enriched.thinking_of_user,
    user_mention_context: enriched.user_thought_context,
  };
}

/**
 * Get activity templates by category
 */
export function getTemplatesByCategory(category: ActivityCategory): ActivityTemplate[] {
  return ACTIVITY_TEMPLATES.filter((t) => t.category === category);
}

/**
 * Get all unique activity categories
 */
export function getActivityCategories(): ActivityCategory[] {
  const categories = new Set(ACTIVITY_TEMPLATES.map((t) => t.category));
  return Array.from(categories);
}
