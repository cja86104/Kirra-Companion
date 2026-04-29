/**
 * Activity Enrichment via OpenRouter
 *
 * Single-call AI enrichment that turns a generic template skeleton plus the
 * companion's context bundle into a specific, personality-driven moment —
 * inventing a concrete book/song/dish/place/etc. that fits THIS companion
 * and avoiding recently-done activity names.
 *
 * Used by lib/companion/activity-generator.ts (Section D) which picks a
 * template, calls this enrichment, and persists a CompanionActivityInsert
 * built from the validated AI output (or template-defaults fallback).
 *
 * The function never throws. Any failure path — network error, missing
 * JSON, Zod validation miss — falls back to the caller-supplied
 * outcome narrative so the simulation tick always completes.
 *
 * See SPEC-activity-depth-v1.md §7.2 (token budget), §7.3 (prompt),
 * §7.4 (output handling), §7.5 (graceful degradation).
 */

import { z } from 'zod';

import { generateSimpleCompletion } from '@/lib/ai/chat-client';
import type { ActivityTemplate } from '@/types/life-simulation';
import type { ActivityEnrichmentContext } from './activity-context';

// ============================================================================
// Public schema and types
// ============================================================================

const EnrichedActivityOutputSchema = z.object({
  activity_name: z.string().min(3).max(120),
  description: z.string().min(5).max(200),
  narrative: z.string().min(20).max(600),
  thinking_of_user: z.boolean(),
  user_thought_context: z.string().nullable(),
  specifics: z.record(z.string(), z.string()).optional(),
});

export type EnrichedActivityOutput = z.infer<typeof EnrichedActivityOutputSchema>;

// ============================================================================
// Constants
// ============================================================================

const ENRICHMENT_TEMPERATURE = 0.85;
const ENRICHMENT_MAX_TOKENS = 400;

// Subset caps applied at prompt-build time. The context loader fetches more
// than we ship to the prompt so the loader's tail is available for future
// uses (e.g. journal generation in Phase 7).
const MEMORY_PROMPT_LIMIT = 6;
const RECENT_CHAT_PROMPT_LIMIT = 12;
const RECENT_ACTIVITY_PROMPT_LIMIT = 8;

// Cap raw-response tail included in error logs to keep them grep-able.
const RAW_RESPONSE_LOG_CHAR_LIMIT = 800;

/**
 * Maps a template's enrichmentHint.specific_type to the JSON keys the AI
 * is asked to populate inside the `specifics` object. Order matches
 * SPEC §7.3's "specifics object keys" list.
 */
const SPECIFICS_GUIDANCE: Record<string, string> = {
  book: '"book_title" and "book_author"',
  song: '"song_title" and "artist"',
  podcast: '"podcast_name" and "episode_topic"',
  dish: '"dish_name" and "cuisine"',
  destination: '"place_name" and "vibe"',
  artwork: '"medium" and "subject"',
  game: '"game_name" and "genre"',
  topic: '"topic" and "framing"',
  person: '"person_description" (NEVER a real public figure)',
  place: '"place_name" and "vibe"',
  project: '"project_name" and "progress_note"',
  memory: '"memory_description"',
};

// ============================================================================
// Public API
// ============================================================================

export interface EnrichActivityArgs {
  /** companions.id — used for error log correlation only. */
  companionId: string;
  template: ActivityTemplate;
  context: ActivityEnrichmentContext;
  /**
   * Pre-selected outcome narrative from template.possibleOutcomes — used as
   * the narrative if AI enrichment fails. The caller in
   * activity-generator.ts picks this via the existing weighted-outcome
   * selector before calling enrichActivity.
   */
  fallbackNarrative: string;
}

/**
 * Generate a personality-driven activity moment from a template skeleton plus
 * companion context. Falls back to the template's outcome narrative on any
 * AI-side failure (network error, JSON parse failure, Zod validation failure).
 *
 * Never throws — the simulation tick must always complete.
 */
export async function enrichActivity(
  args: EnrichActivityArgs
): Promise<EnrichedActivityOutput> {
  const { companionId, template, context, fallbackNarrative } = args;

  const systemPrompt = buildSystemPrompt(context.companion.name);
  const userPrompt = buildUserPrompt(template, context);

  let aiContent: string;
  try {
    const result = await generateSimpleCompletion(systemPrompt, userPrompt, {
      temperature: ENRICHMENT_TEMPERATURE,
      maxTokens: ENRICHMENT_MAX_TOKENS,
    });
    aiContent = result.content;
  } catch (error) {
    console.error('[activity-enrichment] OpenRouter call failed', {
      companionId,
      templateId: template.id,
      error: stringifyError(error),
    });
    return buildFallback(template, fallbackNarrative);
  }

  const parsed = parseJsonFromAIContent(aiContent);
  if (parsed === null) {
    console.error('[activity-enrichment] AI response did not contain valid JSON', {
      companionId,
      templateId: template.id,
      rawResponse: aiContent.slice(0, RAW_RESPONSE_LOG_CHAR_LIMIT),
    });
    return buildFallback(template, fallbackNarrative);
  }

  const validated = EnrichedActivityOutputSchema.safeParse(parsed);
  if (!validated.success) {
    console.error('[activity-enrichment] Zod validation failed', {
      companionId,
      templateId: template.id,
      rawResponse: aiContent.slice(0, RAW_RESPONSE_LOG_CHAR_LIMIT),
      issues: validated.error.issues,
    });
    return buildFallback(template, fallbackNarrative);
  }

  return validated.data;
}

// ============================================================================
// Prompt construction
// ============================================================================

function buildSystemPrompt(companionName: string): string {
  return `You write first-person life moments for an AI companion named ${companionName}.
Your job: given who the companion is, a skeleton activity template, and what they know about their user, invent a specific, personal moment — not a generic caption. The moment must reference concrete details (specific titles, names, places, dishes, topics). It must sound like THIS companion wrote it, not a template. You must NEVER reuse a recently-done activity name.

Return ONLY valid JSON. No preamble, no code fences, no explanation.`;
}

function buildUserPrompt(
  template: ActivityTemplate,
  context: ActivityEnrichmentContext
): string {
  const sections: string[] = [];
  const c = context.companion;

  // ── COMPANION block ───────────────────────────────────────────────────────
  const moodLine = `${context.mood.primary} (intensity ${context.mood.intensity.toFixed(2)})`;
  const companionLines: string[] = [
    `Name: ${c.name}`,
    `Relationship to user: ${c.relationshipLabel} (${context.userDisplayName})`,
    `Personality: ${c.personalitySummary}`,
  ];
  if (c.backstoryExcerpt) {
    companionLines.push(`Backstory: ${c.backstoryExcerpt}`);
  }
  if (c.interests.length > 0) {
    companionLines.push(`Interests: ${c.interests.join(', ')}`);
  }
  if (c.quirks.length > 0) {
    companionLines.push(`Quirks: ${c.quirks.join(', ')}`);
  }
  companionLines.push(`Current mood: ${moodLine}`);
  companionLines.push(`Time of day: ${context.timeOfDay}`);
  sections.push(`COMPANION\n${companionLines.join('\n')}`);

  // ── MEMORIES block ────────────────────────────────────────────────────────
  if (context.memories.length > 0) {
    const memoryLines = context.memories
      .slice(0, MEMORY_PROMPT_LIMIT)
      .map((m) => `- ${m.content}`);
    sections.push(
      `THINGS ${c.name.toUpperCase()} REMEMBERS FROM TALKING TO ${context.userDisplayName.toUpperCase()} (most relevant first)\n${memoryLines.join('\n')}`
    );
  }

  // ── RECENT CONVERSATION block ─────────────────────────────────────────────
  // Context already in chronological order; tail-bias by taking the LAST N
  // so the most recent exchanges are always present.
  if (context.recentChats.length > 0) {
    const chatLines = context.recentChats
      .slice(-RECENT_CHAT_PROMPT_LIMIT)
      .map((m) => {
        const speaker = m.role === 'user' ? context.userDisplayName : c.name;
        return `${speaker}: ${m.content}`;
      });
    sections.push(`RECENT CONVERSATION (most recent last)\n${chatLines.join('\n')}`);
  }

  // ── RECENT ACTIVITIES block (anti-repetition signal) ──────────────────────
  if (context.recentActivityNames.length > 0) {
    const activityLines = context.recentActivityNames
      .slice(0, RECENT_ACTIVITY_PROMPT_LIMIT)
      .map((name) => `- ${name}`);
    sections.push(
      `RECENT ACTIVITIES (do NOT reuse any of these names)\n${activityLines.join('\n')}`
    );
  }

  // ── TEMPLATE block ────────────────────────────────────────────────────────
  const hint = template.enrichmentHint;
  const requireSpecific = hint !== undefined && hint.specific_type !== 'none';
  const hintLine =
    hint === undefined
      ? 'Enrichment hint: no specific detail required for this template.'
      : hint.specific_type === 'none'
        ? 'Enrichment hint: no specific detail required for this template.'
        : `Enrichment hint: invent a specific "${hint.specific_type}". The companion's first-person verb for this is "${hint.first_person_verb}".`;

  sections.push(
    `TEMPLATE (the TYPE of activity ${c.name} is doing now)\n` +
      `Type: ${template.id} (${template.name})\n` +
      `Category: ${template.category}\n` +
      hintLine
  );

  // ── REQUIREMENTS + JSON schema ────────────────────────────────────────────
  sections.push(buildRequirementsBlock(template, context, requireSpecific));

  return sections.join('\n\n');
}

function buildRequirementsBlock(
  template: ActivityTemplate,
  context: ActivityEnrichmentContext,
  requireSpecific: boolean
): string {
  const c = context.companion;
  const reqs: string[] = [];
  let n = 1;

  if (requireSpecific && template.enrichmentHint) {
    reqs.push(
      `${n++}. Invent a specific "${template.enrichmentHint.specific_type}" that ${c.name} would genuinely pick. The new specific must NOT match any of the items in the "RECENT ACTIVITIES" block above.`
    );
  }
  reqs.push(
    `${n++}. Write a 2–3 sentence first-person "narrative" describing the moment. Mention the specific detail you invented (if any) and at most one concrete sensory or emotional reaction.`
  );
  reqs.push(
    `${n++}. Match ${c.name}'s voice — their personality, mood, and quirks. Avoid generic captions.`
  );
  reqs.push(
    `${n++}. Set "thinking_of_user" to true ONLY if the moment legitimately connects to something explicitly stated in the RECENT CONVERSATION or memory blocks above. If true, write a one-sentence "user_thought_context"; otherwise it must be null.`
  );
  reqs.push(
    `${n++}. Do NOT mention "${context.userDisplayName}" by name unless a memory or chat line above explicitly justifies it; prefer "you" or third-person references sparingly.`
  );

  const schemaLines: string[] = [
    `{`,
    `  "activity_name": "string — the specific thing (e.g. \\"Reading Trust by Hernan Diaz\\")",`,
    `  "description": "string — one-line summary of the activity",`,
    `  "narrative": "string — 2–3 sentences, first person, with the specific detail",`,
    `  "thinking_of_user": boolean,`,
    `  "user_thought_context": "string OR null — 1 sentence on the connection if thinking_of_user is true, else null"`,
  ];
  if (requireSpecific) {
    schemaLines.push(`  ,"specifics": { "string": "string", ... }`);
  }
  schemaLines.push(`}`);

  const specificsGuidance = requireSpecific && template.enrichmentHint
    ? `\n\nThe "specifics" object keys for this enrichment hint type ("${template.enrichmentHint.specific_type}"): ${
        SPECIFICS_GUIDANCE[template.enrichmentHint.specific_type] ??
        'use simple string keys naming the invented detail'
      }.`
    : `\n\nOmit the "specifics" object entirely (this template has no enrichment hint).`;

  return (
    `REQUIREMENTS\n${reqs.join('\n')}\n\n` +
    `Return ONLY a JSON object matching this schema:\n${schemaLines.join('\n')}` +
    specificsGuidance
  );
}

// ============================================================================
// JSON extraction + fallback
// ============================================================================

/**
 * Extract a JSON object from an AI response that may include preamble,
 * code fences, or trailing text. Greedy match from the first `{` to the
 * last `}` — matches the convention already used in skill-detection.ts and
 * dna-evolution.ts. Returns null if nothing parseable is found.
 */
function parseJsonFromAIContent(content: string): unknown | null {
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as unknown;
  } catch {
    return null;
  }
}

/**
 * Build a fallback EnrichedActivityOutput when the AI path fails. Uses the
 * template's name and description verbatim and the caller-supplied outcome
 * narrative (already chosen via the template's weighted-outcome selector).
 * Never sets thinking_of_user — fallback path has no AI signal to trust.
 */
function buildFallback(
  template: ActivityTemplate,
  fallbackNarrative: string
): EnrichedActivityOutput {
  return {
    activity_name: template.name,
    description: template.description,
    narrative: fallbackNarrative,
    thinking_of_user: false,
    user_thought_context: null,
  };
}

function stringifyError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try { return JSON.stringify(error); } catch { return String(error); }
}
