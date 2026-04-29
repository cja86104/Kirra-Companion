/**
 * Activity Enrichment Context Loader
 *
 * Builds the typed context bundle that drives AI-enriched activity generation.
 * Loads companion identity, relevant memories, recent chats (DB role
 * 'companion' is mapped to the prompt-friendly 'assistant' label), recent
 * activity names for anti-repetition, mood, time-of-day, and the user's
 * display name in a single parallel query batch.
 *
 * Used by lib/companion/activity-enrichment.ts (Section C) and consumed by
 * the rewritten generator in lib/companion/activity-generator.ts (Section D).
 *
 * See SPEC-activity-depth-v1.md §7.1 for the contract.
 */

import { createClient as createAdminClient } from '@supabase/supabase-js';

import type { Companion } from '@/types/database';
import type { CompanionMoodState, TimeOfDay } from '@/types/life-simulation';

// ============================================================================
// Public types
// ============================================================================

export interface ActivityEnrichmentContext {
  companion: {
    name: string;
    relationshipLabel: string;
    backstoryExcerpt: string;
    interests: string[];
    quirks: string[];
    personalitySummary: string;
  };
  memories: Array<{
    title: string | null;
    content: string;
    referencesCompanion: boolean;
  }>;
  recentChats: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  recentActivityNames: string[];
  mood: { primary: string; intensity: number };
  timeOfDay: TimeOfDay;
  userDisplayName: string;
}

// ============================================================================
// Constants
// ============================================================================

const BACKSTORY_CHAR_LIMIT = 600;
const MEMORY_CONTENT_CHAR_LIMIT = 200;
const MEMORY_FETCH_LIMIT = 20;
const MEMORY_RETURN_LIMIT = 6;
const CHAT_FETCH_LIMIT = 20;
const CHAT_CONTENT_CHAR_LIMIT = 300;
const ACTIVITY_FETCH_LIMIT = 10;
const INTEREST_FETCH_LIMIT = 10;
const FALLBACK_USER_DISPLAY_NAME = 'them';

// ============================================================================
// Internal helpers
// ============================================================================

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase admin credentials');
  return createAdminClient(url, key);
}

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max).trimEnd() + '…';
}

function relationshipLabelFor(companion: Companion): string {
  if (companion.relationship_label && companion.relationship_label.trim().length > 0) {
    return companion.relationship_label.trim();
  }
  switch (companion.relationship_type) {
    case 'friend':   return 'Friend';
    case 'mentor':   return 'Mentor';
    case 'romantic': return 'Partner';
    case 'family':   return 'Family';
    case 'custom':   return 'Companion';
  }
}

function backstoryExcerptFor(companion: Companion): string {
  const source = companion.backstory_normalized?.trim() || companion.backstory?.trim() || '';
  if (source.length === 0) return '';
  const collapsed = source.replace(/\s+/g, ' ');
  return truncate(collapsed, BACKSTORY_CHAR_LIMIT);
}

/**
 * Pull a numeric field from the loosely-typed personality_base Json column.
 * Returns undefined if the column is missing, isn't an object, isn't keyed
 * by the requested name, or stores something other than a number.
 */
function readNumberFromJson(
  json: Companion['personality_base'],
  key: string
): number | undefined {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return undefined;
  const value = (json as { [k: string]: unknown })[key];
  return typeof value === 'number' ? value : undefined;
}

interface TraitLabel { score: number; label: string; }

/**
 * Derive a short personality summary like "warm, curious, introverted" from
 * the companion's Big-Five-plus-curiosity scores stored in personality_base.
 * Picks the up-to-three traits whose scores deviate most strongly from
 * neutral (0.5). Returns "balanced" if no trait deviates significantly.
 */
function summarizePersonality(personalityBase: Companion['personality_base']): string {
  const labels: TraitLabel[] = [];

  const consider = (
    value: number | undefined,
    highLabel: string,
    lowLabel: string
  ) => {
    if (value === undefined) return;
    if (value > 0.6) labels.push({ score: value - 0.5, label: highLabel });
    else if (value < 0.4) labels.push({ score: 0.5 - value, label: lowLabel });
  };

  consider(readNumberFromJson(personalityBase, 'openness'),          'curious',     'grounded');
  consider(readNumberFromJson(personalityBase, 'extraversion'),      'outgoing',    'introverted');
  consider(readNumberFromJson(personalityBase, 'conscientiousness'), 'disciplined', 'freewheeling');
  consider(readNumberFromJson(personalityBase, 'agreeableness'),     'warm',        'blunt');
  consider(readNumberFromJson(personalityBase, 'neuroticism'),       'sensitive',   'even-keeled');
  consider(readNumberFromJson(personalityBase, 'curiosity'),         'inquisitive', 'settled');

  labels.sort((a, b) => b.score - a.score);
  const top = labels.slice(0, 3).map((l) => l.label);
  return top.length > 0 ? top.join(', ') : 'balanced';
}

/**
 * Merge the companion row's interests array with their companion_interests
 * rows, deduping case-insensitively while preserving the strength-ordered
 * priority of the table rows.
 */
function mergeInterests(
  rowInterests: string[] | null,
  tableInterestNames: string[]
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const name of tableInterestNames) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  for (const name of rowInterests ?? []) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

function stringifyReason(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  if (typeof reason === 'string') return reason;
  try { return JSON.stringify(reason); } catch { return String(reason); }
}

// ----------------------------------------------------------------------------
// Subquery error handling
// ----------------------------------------------------------------------------

interface SupabaseListResult<T> {
  data: T[] | null;
  error: { message: string } | null;
}

/**
 * Extract rows from a Promise.allSettled result for one of the supabase list
 * queries. Logs network-level rejections and Postgrest-level errors with the
 * companion id, then returns an empty list so callers can proceed with a
 * degraded but well-typed context bundle. Per Chris's standing rule, errors
 * are never swallowed — every failure path logs.
 */
function unwrapList<T>(
  result: PromiseSettledResult<SupabaseListResult<T>>,
  table: string,
  companionId: string
): T[] {
  if (result.status === 'rejected') {
    console.error(
      `[activity-context] ${table} query rejected`,
      { companionId, reason: stringifyReason(result.reason) }
    );
    return [];
  }
  const { data, error } = result.value;
  if (error) {
    console.error(
      `[activity-context] ${table} query returned error`,
      { companionId, error: error.message }
    );
    return [];
  }
  return data ?? [];
}

// ============================================================================
// Main loader
// ============================================================================

/**
 * Build the enrichment context for an upcoming activity generation tick.
 *
 * All five DB reads run in parallel via Promise.allSettled — a single failed
 * subquery (RLS issue, network blip, missing profile row) degrades to an
 * empty section rather than failing the whole simulation tick. Failures are
 * logged with the companion id.
 *
 * Uses the service-role admin client. Activity generation runs from the
 * `/api/cron/life-simulation` endpoint with no user session, and the
 * user-scoped SSR client would fail under RLS in that path. Matches the
 * pattern already established in `lib/companion/activity-generator.ts` and
 * `lib/companion/dna-evolution.ts`.
 */
export async function loadActivityContext(
  companion: Companion,
  mood: CompanionMoodState,
  timeOfDay: TimeOfDay
): Promise<ActivityEnrichmentContext> {
  const supabase = getAdminClient();

  const memoriesPromise = supabase
    .from('memories')
    .select('title, content, importance_score')
    .eq('companion_id', companion.id)
    .eq('is_active', true)
    .order('importance_score', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(MEMORY_FETCH_LIMIT);

  const messagesPromise = supabase
    .from('messages')
    .select('role, content')
    .eq('companion_id', companion.id)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(CHAT_FETCH_LIMIT);

  const activitiesPromise = supabase
    .from('companion_activities')
    .select('activity_name')
    .eq('companion_id', companion.id)
    .order('started_at', { ascending: false })
    .limit(ACTIVITY_FETCH_LIMIT);

  const interestsPromise = supabase
    .from('companion_interests')
    .select('interest_name')
    .eq('companion_id', companion.id)
    .eq('is_active', true)
    .order('strength', { ascending: false })
    .limit(INTEREST_FETCH_LIMIT);

  const profilePromise = supabase
    .from('profiles')
    .select('full_name')
    .eq('id', companion.user_id)
    .maybeSingle();

  const [memoriesResult, messagesResult, activitiesResult, interestsResult, profileResult] =
    await Promise.allSettled([
      memoriesPromise,
      messagesPromise,
      activitiesPromise,
      interestsPromise,
      profilePromise,
    ]);

  // ── Memories ──────────────────────────────────────────────────────────────
  // Fetched 20 by importance × recency; tag rows whose title or content
  // mentions the companion's own name (heuristic for "memory about us")
  // and float those to the top before slicing to the prompt-friendly top 6.
  const memoryRows = unwrapList(memoriesResult, 'memories', companion.id);
  const companionNameLower = companion.name.toLowerCase();
  const memories = memoryRows
    .map((m) => {
      const titleHit = (m.title ?? '').toLowerCase().includes(companionNameLower);
      const contentHit = m.content.toLowerCase().includes(companionNameLower);
      return {
        title: m.title,
        content: truncate(m.content, MEMORY_CONTENT_CHAR_LIMIT),
        referencesCompanion: titleHit || contentHit,
      };
    })
    .sort((a, b) => Number(b.referencesCompanion) - Number(a.referencesCompanion))
    .slice(0, MEMORY_RETURN_LIMIT);

  // ── Recent chats (DB role 'companion' → output role 'assistant') ─────────
  // 'system' messages are filtered out — the prompt only wants the back-and-forth.
  // Fetch is DESC; reverse here so the prompt sees chronological order.
  const messageRows = unwrapList(messagesResult, 'messages', companion.id);
  const recentChats = messageRows
    .filter((m) => m.role === 'user' || m.role === 'companion')
    .map((m) => ({
      role: m.role === 'companion' ? ('assistant' as const) : ('user' as const),
      content: truncate(m.content, CHAT_CONTENT_CHAR_LIMIT),
    }))
    .reverse();

  // ── Recent activity names (anti-repetition signal for the prompt) ─────────
  const activityRows = unwrapList(activitiesResult, 'companion_activities', companion.id);
  const recentActivityNames = activityRows.map((a) => a.activity_name);

  // ── Interests (merge companion.interests + companion_interests rows) ──────
  const interestRows = unwrapList(interestsResult, 'companion_interests', companion.id);
  const interests = mergeInterests(
    companion.interests ?? null,
    interestRows.map((r) => r.interest_name)
  );

  // ── User display name (single-row fetch via maybeSingle) ──────────────────
  let userDisplayName = FALLBACK_USER_DISPLAY_NAME;
  if (profileResult.status === 'fulfilled') {
    const { data, error } = profileResult.value;
    if (error) {
      console.error(
        '[activity-context] profiles query returned error',
        { companionId: companion.id, error: error.message }
      );
    } else if (data?.full_name && data.full_name.trim().length > 0) {
      userDisplayName = data.full_name.trim();
    }
  } else {
    console.error(
      '[activity-context] profiles query rejected',
      { companionId: companion.id, reason: stringifyReason(profileResult.reason) }
    );
  }

  return {
    companion: {
      name: companion.name,
      relationshipLabel: relationshipLabelFor(companion),
      backstoryExcerpt: backstoryExcerptFor(companion),
      interests,
      quirks: companion.quirks ?? [],
      personalitySummary: summarizePersonality(companion.personality_base),
    },
    memories,
    recentChats,
    recentActivityNames,
    mood: {
      primary: mood.primary,
      intensity: mood.intensity,
    },
    timeOfDay,
    userDisplayName,
  };
}
