/**
 * Activity Generator
 *
 * Generates contextual activities for companions based on:
 * - Personality traits (from companion DNA)
 * - Current interests
 * - Time of day
 * - Current mood
 * - Energy levels
 *
 * Activities are the building blocks of the simulated life.
 */

import { generateSimpleCompletion } from '@/lib/ai/chat-client';
import { ALL_TEMPLATES } from './activity-templates';
import type {
  ActivityTemplate,
  ActivityCategory,
  ActivityOutcome,
  TimeOfDay,
  CompanionMoodState,
  CompanionInterest,
  CompanionActivityInsert,
} from '@/types/life-simulation';
import type { Companion, CompanionDNA } from '@/types/database';
import { createClient as createAdminClient } from '@supabase/supabase-js';

/**
 * Get an admin Supabase client for background processes.
 *
 * Activity generation runs primarily inside `runSimulationTick` (called from
 * the `/api/cron/life-simulation` endpoint with no user session) and from
 * user-facing routes that have already verified ownership at the route
 * layer. In both cases the DB reads here (companion interests) are system
 * operations driving the autonomous simulation, not direct user actions.
 * The user-scoped SSR client would fail in the cron path (no cookies →
 * anon → RLS blocks everything), so this library uses the service role.
 * Matches the pattern in `lib/companion/life-simulation.ts` and
 * `lib/companion/dna-evolution.ts`.
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
// Activity Selection Logic
// ============================================================================

/**
 * Get templates suitable for the current context
 */
function getEligibleTemplates(
  personality: Record<string, number>,
  interests: CompanionInterest[],
  mood: CompanionMoodState,
  timeOfDay: TimeOfDay
): ActivityTemplate[] {
  const eligible: ActivityTemplate[] = [];

  for (const template of ACTIVITY_TEMPLATES) {
    // Check time of day preference
    if (template.timeOfDayPreference && !template.timeOfDayPreference.includes(timeOfDay)) {
      continue;
    }

    // Check energy requirements
    if (template.intensity === 'high' && mood.energy_level < 40) {
      continue;
    }
    if (template.intensity === 'medium' && mood.energy_level < 20) {
      continue;
    }

    // Boost creative activities if creativity is high
    if (template.category === 'creative' && mood.creativity_level < 30) {
      // Still eligible but less likely
    }

    // Social activities more likely when social need is high
    if (template.category === 'social' && mood.social_need < 20) {
      continue;
    }

    eligible.push(template);
  }

  return eligible;
}

/**
 * Score a template based on companion preferences
 */
function scoreTemplate(
  template: ActivityTemplate,
  personality: Record<string, number>,
  interests: CompanionInterest[],
  mood: CompanionMoodState
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
  const interestCategories = interests.map(i => i.interest_category);
  if (template.category === 'hobby') {
    const hasRelatedInterest = interests.some(i =>
      i.interest_category === 'games' || i.interest_category === 'entertainment' || i.interest_category === 'collecting'
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

  // Add some randomness
  score *= 0.8 + Math.random() * 0.4;

  return score;
}

/**
 * Select an outcome based on weighted probabilities
 */
function selectOutcome(template: ActivityTemplate): { outcome: ActivityOutcome; narrative: string } {
  const totalWeight = template.possibleOutcomes.reduce((sum, o) => sum + o.weight, 0);
  let random = Math.random() * totalWeight;

  for (const outcomeOption of template.possibleOutcomes) {
    random -= outcomeOption.weight;
    if (random <= 0) {
      const narrative = outcomeOption.narratives[
        Math.floor(Math.random() * outcomeOption.narratives.length)
      ];
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
 * Generate an activity for a companion
 */
export async function generateActivity(
  companion: Companion & { companion_dna?: CompanionDNA },
  mood: CompanionMoodState,
  timeOfDay: TimeOfDay
): Promise<CompanionActivityInsert | null> {
  const supabase = getAdminClient();

  // Get companion's interests
  const { data: interests } = await supabase
    .from('companion_interests')
    .select('*')
    .eq('companion_id', companion.id)
    .order('strength', { ascending: false })
    .limit(10);

  const personality = (companion.personality_base as unknown as Record<string, number>) || {};

  // Get eligible templates
  const eligible = getEligibleTemplates(
    personality,
    (interests || []) as CompanionInterest[],
    mood,
    timeOfDay
  );

  if (eligible.length === 0) {
    return null;
  }

  // Score and select template
  const scored = eligible.map(template => ({
    template,
    score: scoreTemplate(template, personality, (interests || []) as CompanionInterest[], mood),
  }));

  // Sort by score and pick from top candidates with some randomness
  scored.sort((a, b) => b.score - a.score);
  const topCandidates = scored.slice(0, Math.min(5, scored.length));
  const selected = topCandidates[Math.floor(Math.random() * topCandidates.length)].template;

  // Select outcome
  const { outcome, narrative } = selectOutcome(selected);

  // Find related interest if applicable
  let relatedInterestId: string | null = null;
  if (interests && interests.length > 0) {
    const categoryMap: Record<ActivityCategory, string[]> = {
      hobby: ['games', 'entertainment', 'collecting'],
      learning: ['sciences', 'humanities', 'technology'],
      creative: ['arts', 'crafts'],
      social: ['social'],
      reflection: ['wellness'],
      entertainment: ['entertainment', 'games', 'travel'],
    };

    const relatedCategories = categoryMap[selected.category] || [];
    const relatedInterest = interests.find(i =>
      relatedCategories.includes((i as CompanionInterest).interest_category)
    );
    if (relatedInterest) {
      relatedInterestId = (relatedInterest as CompanionInterest).id;
    }
  }

  // Generate enhanced narrative using AI
  let enhancedNarrative = narrative;
  try {
    const prompt = `You are ${companion.name}. You just completed this activity: "${selected.name}"
Your current mood: ${mood.primary}
The basic narrative: "${narrative}"

Write a slightly more personal version of this narrative (1-2 sentences, 20-50 words) that reflects your personality. Be warm and genuine. Don't use any names.`;

    const result = await generateSimpleCompletion(
      'You are a creative writer helping generate authentic companion activity narratives.',
      prompt,
      { temperature: 0.85, maxTokens: 80 }
    );
    enhancedNarrative = result.content.trim() || narrative;
  } catch {
    // Use original narrative if AI fails
  }

  const now = new Date();
  const startedAt = new Date(now.getTime() - selected.durationMinutes * 60 * 1000);

  return {
    companion_id: companion.id,
    template_id: selected.id,
    activity_name: selected.name,
    activity_category: selected.category,
    description: selected.description,
    narrative: enhancedNarrative,
    started_at: startedAt.toISOString(),
    ended_at: now.toISOString(),
    duration_minutes: selected.durationMinutes,
    outcome,
    mood_effects_applied: selected.moodEffects,
    related_interest_id: relatedInterestId,
    thinking_of_user: false, // Will be updated by life-simulation.ts
    user_mention_context: null,
  };
}

/**
 * Get activity templates by category
 */
export function getTemplatesByCategory(category: ActivityCategory): ActivityTemplate[] {
  return ACTIVITY_TEMPLATES.filter(t => t.category === category);
}

/**
 * Get all unique activity categories
 */
export function getActivityCategories(): ActivityCategory[] {
  const categories = new Set(ACTIVITY_TEMPLATES.map(t => t.category));
  return Array.from(categories);
}
