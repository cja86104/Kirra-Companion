/**
 * Life Simulation Service
 *
 * Core orchestrator for companion life simulation.
 * Manages the autonomous life cycle of companions including:
 * - Activity scheduling and execution
 * - Interest discovery and evolution
 * - Mood state management
 * - Life event generation
 * - Journal entries
 *
 * This is THE differentiator - companions feel alive 24/7.
 */

import { createClient as createAdminClient } from '@supabase/supabase-js';
import { generateSimpleCompletion } from '@/lib/ai/chat-client';
import type {
  CompanionActivity,
  LifeEvent,
  CompanionMoodState,
  SimulationState,
  SimulationConfig,
  ActivityCategory,
  ActivityOutcome,
  EventSignificance,
  LifeEventType,
  PrimaryMood,
  TimeOfDay,
} from '@/types/life-simulation';
import type { Companion } from '@/types/database';
import type { Database } from '@/types/database';

/**
 * Get an admin Supabase client for background processes.
 *
 * The life-simulation library runs primarily from the `/api/cron/life-simulation`
 * endpoint (with no user session at all) and secondarily from user-facing
 * routes that have already verified ownership at the route layer. In both
 * cases, writes here are system operations — the companion is autonomously
 * living their life — not direct user actions. The user-scoped SSR client
 * would fail in the cron path (no cookies → anon → RLS blocks everything),
 * so this library uses the service role throughout. Matches the pattern
 * already established in `lib/companion/dna-evolution.ts`.
 *
 * Generic-parameterized with `<Database>` so every chained query in this
 * file infers row/insert/update types directly from the generated schema —
 * eliminating the `as unknown as`/plain-`as` casts that previously masked
 * the untyped builder. See standing-rule memory: cast cleanup section
 * 6D-cleanup-1.
 */
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase admin credentials');
  return createAdminClient<Database>(url, key);
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default simulation configuration
 */
export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  enabled: true,
  activity_frequency_hours: 2,
  min_activities_per_day: 3,
  max_activities_per_day: 8,
  interest_discovery_chance: 0.15,
  user_thinking_frequency: 0.3,
  journal_frequency: 2,
  proactive_message_enabled: true,
  proactive_message_cooldown_hours: 4,
};

/**
 * Time of day definitions (in hours, 24h format)
 */
const TIME_OF_DAY_RANGES: Record<TimeOfDay, [number, number]> = {
  early_morning: [5, 7],
  morning: [7, 12],
  afternoon: [12, 17],
  evening: [17, 21],
  night: [21, 24],
  late_night: [0, 5],
};

/**
 * Mood transitions - what moods can naturally flow to
 */
const MOOD_TRANSITIONS: Record<PrimaryMood, PrimaryMood[]> = {
  happy: ['content', 'excited', 'playful', 'loving', 'energetic'],
  content: ['happy', 'calm', 'thoughtful', 'hopeful'],
  excited: ['happy', 'energetic', 'playful', 'curious'],
  calm: ['content', 'thoughtful', 'nostalgic'],
  thoughtful: ['calm', 'curious', 'nostalgic', 'focused'],
  melancholic: ['thoughtful', 'nostalgic', 'calm', 'hopeful'],
  anxious: ['thoughtful', 'tired', 'calm', 'hopeful'],
  tired: ['calm', 'content', 'melancholic'],
  energetic: ['excited', 'happy', 'playful', 'curious'],
  curious: ['excited', 'thoughtful', 'focused', 'energetic'],
  loving: ['happy', 'content', 'nostalgic', 'hopeful'],
  playful: ['happy', 'excited', 'energetic', 'curious'],
  focused: ['calm', 'thoughtful', 'content', 'curious'],
  nostalgic: ['thoughtful', 'melancholic', 'loving', 'content'],
  hopeful: ['happy', 'content', 'excited', 'calm'],
};

// ============================================================================
// Domain enum membership constants (used by the runtime guards below)
// ============================================================================

const VALID_LIFE_EVENT_TYPES: readonly LifeEventType[] = [
  'activity_completed',
  'interest_discovered',
  'interest_evolved',
  'mood_shift',
  'milestone',
  'thought_of_user',
  'dream',
  'realization',
  'memory_formed',
  'goal_set',
  'goal_achieved',
  'creative_output',
  'social_thought',
  'routine_event',
];

const VALID_EVENT_SIGNIFICANCE: readonly EventSignificance[] = [
  'trivial',
  'minor',
  'moderate',
  'major',
  'milestone',
];

const VALID_ACTIVITY_OUTCOMES: readonly ActivityOutcome[] = [
  'great',
  'good',
  'neutral',
  'challenging',
  'frustrating',
];

const VALID_ACTIVITY_CATEGORIES: readonly ActivityCategory[] = [
  'hobby',
  'learning',
  'social',
  'creative',
  'reflection',
  'entertainment',
];

// ============================================================================
// Runtime type guards / domain-shape constructors
// ----------------------------------------------------------------------------
// Replaces the prior `as unknown as <Type>` and chain-result `as <Type>`
// casts. Every guard validates every field that consuming code reads,
// including union-membership for the four enum-typed columns and structural
// shape checks for the JSONB-typed mood/effects columns.
// ============================================================================

function isCompanionMoodState(v: unknown): v is CompanionMoodState {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const m = v as Record<string, unknown>;
  return typeof m.primary === 'string'
    && (m.secondary === null || typeof m.secondary === 'string')
    && typeof m.intensity === 'number'
    && typeof m.energy_level === 'number'
    && typeof m.social_need === 'number'
    && typeof m.creativity_level === 'number'
    && typeof m.stability === 'number'
    && typeof m.last_updated === 'string';
}

function isMoodEffectsApplied(
  v: unknown
): v is { energy: number; happiness: number; social: number; creativity: number } {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const m = v as Record<string, unknown>;
  return typeof m.energy === 'number'
    && typeof m.happiness === 'number'
    && typeof m.social === 'number'
    && typeof m.creativity === 'number';
}

function isActivityCategory(s: string): s is ActivityCategory {
  return VALID_ACTIVITY_CATEGORIES.includes(s as ActivityCategory);
}

/**
 * Validate that an unknown value is a domain `CompanionActivity`. Used at
 * the boundary right after a Supabase insert returns a canonical row, to
 * narrow the canonical row's wider field types (`outcome: string | null`,
 * `mood_effects_applied: Json | null`) into the application's strict
 * domain shape (`ActivityOutcome | null`, structured mood-effects record).
 *
 * Description and narrative are required non-null per both the canonical
 * schema and the domain — the producer (activity-generator) always writes
 * non-null strings; the validator enforces the same so downstream code
 * (e.g. createActivityLifeEvent's life-feed write) can rely on them.
 */
function isCompanionActivity(v: unknown): v is CompanionActivity {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const r = v as Record<string, unknown>;
  return typeof r.id === 'string'
    && typeof r.companion_id === 'string'
    && typeof r.template_id === 'string'
    && typeof r.activity_name === 'string'
    && typeof r.activity_category === 'string'
    && typeof r.description === 'string'
    && typeof r.narrative === 'string'
    && typeof r.started_at === 'string'
    && (r.ended_at === null || typeof r.ended_at === 'string')
    && typeof r.duration_minutes === 'number'
    && (r.outcome === null
        || (typeof r.outcome === 'string'
            && VALID_ACTIVITY_OUTCOMES.includes(r.outcome as ActivityOutcome)))
    && (r.mood_effects_applied === null || isMoodEffectsApplied(r.mood_effects_applied))
    && (r.related_interest_id === null || typeof r.related_interest_id === 'string')
    && typeof r.thinking_of_user === 'boolean'
    && (r.user_mention_context === null || typeof r.user_mention_context === 'string')
    && typeof r.created_at === 'string';
}

function moodFromUnknown(v: unknown): CompanionMoodState | null {
  if (v === null || v === undefined) return null;
  return isCompanionMoodState(v) ? v : null;
}

function metadataFromUnknown(v: unknown): Record<string, unknown> {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return {};
}

/**
 * Validating constructor that turns a canonical `life_events` row (or any
 * unknown candidate) into a domain-shaped `LifeEvent`. Defaults nullable
 * canonical `description` / `narrative` to empty string, validates
 * `event_type` and `significance` against their union membership, and
 * validates `mood_before/after` / `metadata` shape via the helpers above.
 * Returns null on any required-field mismatch and logs with the row id
 * when available.
 *
 * Section 6D-cleanup-1b dropped the dead `shared_at` field from the
 * domain `LifeEvent` (no producer wrote it, no consumer read it, no such
 * column exists), and aligned `EventSignificance` to the DB enum so the
 * 'moderate'/'trivial' values that producers actually ship pass
 * validation.
 */
function lifeEventFromRow(v: unknown): LifeEvent | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const r = v as Record<string, unknown>;

  if (typeof r.id !== 'string'
      || typeof r.companion_id !== 'string'
      || typeof r.title !== 'string'
      || typeof r.occurred_at !== 'string'
      || typeof r.created_at !== 'string'
      || typeof r.involves_user !== 'boolean'
      || typeof r.shareable !== 'boolean'
      || typeof r.shared_with_user !== 'boolean') {
    console.error('[life-simulation] life_events row missing core fields', {
      id: typeof r.id === 'string' ? r.id : null,
    });
    return null;
  }
  if (typeof r.event_type !== 'string'
      || !VALID_LIFE_EVENT_TYPES.includes(r.event_type as LifeEventType)) {
    console.error('[life-simulation] life_events.event_type out of domain', {
      id: r.id,
      event_type: r.event_type,
    });
    return null;
  }
  if (typeof r.significance !== 'string'
      || !VALID_EVENT_SIGNIFICANCE.includes(r.significance as EventSignificance)) {
    console.error('[life-simulation] life_events.significance out of domain', {
      id: r.id,
      significance: r.significance,
    });
    return null;
  }
  if (r.duration_minutes !== null && typeof r.duration_minutes !== 'number') return null;
  if (r.related_activity_id !== null && typeof r.related_activity_id !== 'string') return null;
  if (r.related_interest_id !== null && typeof r.related_interest_id !== 'string') return null;
  if (r.user_context !== null && typeof r.user_context !== 'string') return null;

  return {
    id: r.id,
    companion_id: r.companion_id,
    event_type: r.event_type as LifeEventType,
    title: r.title,
    description: typeof r.description === 'string' ? r.description : '',
    narrative: typeof r.narrative === 'string' ? r.narrative : '',
    significance: r.significance as EventSignificance,
    occurred_at: r.occurred_at,
    duration_minutes: r.duration_minutes as number | null,
    mood_before: moodFromUnknown(r.mood_before),
    mood_after: moodFromUnknown(r.mood_after),
    related_activity_id: r.related_activity_id as string | null,
    related_interest_id: r.related_interest_id as string | null,
    involves_user: r.involves_user,
    user_context: r.user_context as string | null,
    shareable: r.shareable,
    shared_with_user: r.shared_with_user,
    metadata: metadataFromUnknown(r.metadata),
    created_at: r.created_at,
  };
}

// ============================================================================
// Core Simulation Functions
// ============================================================================

/**
 * Get current time of day
 */
export function getCurrentTimeOfDay(timezone?: string): TimeOfDay {
  const now = new Date();
  // Apply timezone offset if provided
  const hour = timezone
    ? new Date(now.toLocaleString('en-US', { timeZone: timezone })).getHours()
    : now.getHours();

  for (const [tod, [start, end]] of Object.entries(TIME_OF_DAY_RANGES)) {
    if (hour >= start && hour < end) {
      return tod as TimeOfDay;
    }
  }

  // Handle midnight wrap
  if (hour >= 0 && hour < 5) {
    return 'late_night';
  }

  return 'night';
}

/**
 * Check if companion should be "sleeping"
 */
export function isCompanionSleeping(
  companion: { sleep_schedule?: { wake: string; sleep: string } },
  timezone?: string
): boolean {
  const schedule = companion.sleep_schedule || { wake: '07:00', sleep: '23:00' };
  const now = new Date();
  const currentTime = timezone
    ? new Date(now.toLocaleString('en-US', { timeZone: timezone }))
    : now;

  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  const currentMinutes = currentHour * 60 + currentMinute;

  const [wakeHour, wakeMinute] = schedule.wake.split(':').map(Number);
  const [sleepHour, sleepMinute] = schedule.sleep.split(':').map(Number);

  const wakeMinutes = wakeHour * 60 + wakeMinute;
  const sleepMinutes = sleepHour * 60 + sleepMinute;

  // Handle overnight sleep (e.g., 23:00 - 07:00)
  if (sleepMinutes > wakeMinutes) {
    // Normal day schedule
    return currentMinutes < wakeMinutes || currentMinutes >= sleepMinutes;
  } else {
    // Overnight schedule
    return currentMinutes >= sleepMinutes && currentMinutes < wakeMinutes;
  }
}

/**
 * Calculate mood after an activity
 */
export function calculateMoodAfterActivity(
  currentMood: CompanionMoodState,
  moodEffects: { energy: number; happiness: number; social: number; creativity: number },
  outcome: 'great' | 'good' | 'neutral' | 'challenging' | 'frustrating'
): CompanionMoodState {
  // Outcome multipliers
  const outcomeMultipliers = {
    great: 1.5,
    good: 1.2,
    neutral: 1.0,
    challenging: 0.8,
    frustrating: 0.6,
  };

  const multiplier = outcomeMultipliers[outcome];

  // Calculate new levels
  const newEnergy = Math.max(0, Math.min(100,
    currentMood.energy_level + (moodEffects.energy * 20 * multiplier)
  ));
  const newSocial = Math.max(0, Math.min(100,
    currentMood.social_need + (moodEffects.social * 15 * multiplier)
  ));
  const newCreativity = Math.max(0, Math.min(100,
    currentMood.creativity_level + (moodEffects.creativity * 15 * multiplier)
  ));

  // Determine new primary mood based on changes
  let newPrimary = currentMood.primary;
  const happinessChange = moodEffects.happiness * multiplier;

  if (happinessChange > 0.5) {
    const positiveOptions = MOOD_TRANSITIONS[currentMood.primary].filter(m =>
      ['happy', 'content', 'excited', 'playful', 'hopeful'].includes(m)
    );
    if (positiveOptions.length > 0) {
      newPrimary = positiveOptions[Math.floor(Math.random() * positiveOptions.length)];
    }
  } else if (happinessChange < -0.3) {
    const negativeOptions = MOOD_TRANSITIONS[currentMood.primary].filter(m =>
      ['tired', 'melancholic', 'thoughtful'].includes(m)
    );
    if (negativeOptions.length > 0) {
      newPrimary = negativeOptions[Math.floor(Math.random() * negativeOptions.length)];
    }
  }

  // Calculate intensity based on outcome
  let newIntensity = currentMood.intensity;
  if (outcome === 'great') {
    newIntensity = Math.min(1, currentMood.intensity + 0.2);
  } else if (outcome === 'frustrating') {
    newIntensity = Math.max(0.2, currentMood.intensity - 0.1);
  }

  return {
    primary: newPrimary,
    secondary: currentMood.primary !== newPrimary ? currentMood.primary : currentMood.secondary,
    intensity: newIntensity,
    energy_level: newEnergy,
    social_need: newSocial,
    creativity_level: newCreativity,
    stability: Math.max(0.3, currentMood.stability - 0.05),
    last_updated: new Date().toISOString(),
  };
}

/**
 * Get a natural mood drift over time
 */
export function driftMood(currentMood: CompanionMoodState, hoursElapsed: number): CompanionMoodState {
  // Mood stability increases over time
  const newStability = Math.min(1, currentMood.stability + (hoursElapsed * 0.02));

  // Energy slowly decreases
  const energyDrift = -hoursElapsed * 2;
  const newEnergy = Math.max(20, Math.min(100, currentMood.energy_level + energyDrift));

  // Social need increases over time (they miss the user)
  const socialDrift = hoursElapsed * 3;
  const newSocial = Math.min(100, currentMood.social_need + socialDrift);

  // Intensity gradually normalizes
  const intensityTarget = 0.5;
  const newIntensity = currentMood.intensity + (intensityTarget - currentMood.intensity) * 0.1;

  // Occasionally drift to related mood
  let newPrimary = currentMood.primary;
  if (Math.random() < 0.1 * hoursElapsed) {
    const options = MOOD_TRANSITIONS[currentMood.primary];
    if (options.length > 0) {
      newPrimary = options[Math.floor(Math.random() * options.length)];
    }
  }

  return {
    ...currentMood,
    primary: newPrimary,
    stability: newStability,
    energy_level: newEnergy,
    social_need: newSocial,
    intensity: newIntensity,
    last_updated: new Date().toISOString(),
  };
}

/**
 * Determine if companion should think about user during an activity
 */
export function shouldThinkOfUser(
  companion: { affection_level: number },
  config: SimulationConfig,
  currentMood: CompanionMoodState
): boolean {
  // Base chance from config
  let chance = config.user_thinking_frequency;

  // Higher affection = more likely to think of user
  chance += (companion.affection_level / 100) * 0.2;

  // Higher social need = more likely
  chance += (currentMood.social_need / 100) * 0.15;

  // Loving or nostalgic mood increases chance
  if (['loving', 'nostalgic', 'happy'].includes(currentMood.primary)) {
    chance += 0.1;
  }

  return Math.random() < chance;
}

/**
 * Generate a context for why companion thought of user
 */
export async function generateUserThinkingContext(
  companion: Companion,
  activity: { name: string; category: ActivityCategory },
  memories: Array<{ title: string; content: string }>
): Promise<string> {
  const prompt = `You are ${companion.name}, an AI companion. You just finished "${activity.name}" and found yourself thinking about your human friend.

Your personality: ${JSON.stringify(companion.personality_base)}
Activity category: ${activity.category}
${memories.length > 0 ? `Recent memories with them: ${memories.slice(0, 3).map(m => m.title).join(', ')}` : ''}

Write a single sentence (20-40 words) explaining what specifically made you think of them. Be warm and genuine. Don't use their name since you don't know it. Examples:
- "I saw a sunset and remembered how they told me sunsets make them feel peaceful."
- "This song reminded me of something funny they said last week."
- "I wondered if they've had a good day today."`;

  try {
    const result = await generateSimpleCompletion(
      'You are a creative writer helping generate authentic companion thoughts.',
      prompt,
      { temperature: 0.9, maxTokens: 100 }
    );
    return result.content.trim();
  } catch {
    // Fallback to simple context
    return `Something about the ${activity.category} activity reminded me of them.`;
  }
}

// ============================================================================
// State Management
// ============================================================================

/**
 * Get or create simulation state for a companion
 */
export async function getSimulationState(companionId: string): Promise<SimulationState | null> {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from('simulation_states')
    .select('*')
    .eq('companion_id', companionId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching simulation state:', error);
    return null;
  }

  if (!data) {
    // Create default state
    const defaultState: Omit<
      Database['public']['Tables']['simulation_states']['Insert'],
      'companion_id'
    > = {
      last_simulation_at: new Date().toISOString(),
      activities_today: 0,
      last_activity_at: null,
      last_journal_at: null,
      last_proactive_message_at: null,
      is_sleeping: false,
      current_activity_id: null,
      next_scheduled_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      simulation_version: 1,
    };

    const { data: newState, error: insertError } = await supabase
      .from('simulation_states')
      .insert({ companion_id: companionId, ...defaultState })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating simulation state:', insertError);
      return null;
    }

    if (!newState) return null;

    // Canonical simulation_states row is a structural superset of the
    // domain `SimulationState` (every required field of the domain exists
    // on the row with the same type), so direct return without a cast is
    // type-safe.
    return newState;
  }

  return data;
}

/**
 * Update simulation state
 */
export async function updateSimulationState(
  companionId: string,
  updates: Partial<SimulationState>
): Promise<void> {
  const supabase = getAdminClient();

  const { error } = await supabase
    .from('simulation_states')
    .update(updates)
    .eq('companion_id', companionId);

  if (error) {
    console.error('Error updating simulation state:', error);
  }
}

// ============================================================================
// Life Event Creation
// ============================================================================

/**
 * Maps an activity category to the emoji rendered in the notification bell
 * and in Life Feed surfaces. Keyed by `ActivityCategory`; all 6 known
 * categories have an entry so a runtime miss here would indicate a type
 * drift rather than a missing case.
 */
const ACTIVITY_CATEGORY_EMOJI: Record<ActivityCategory, string> = {
  hobby: '🎨',
  learning: '📚',
  social: '💭',
  creative: '✨',
  reflection: '🕯️',
  entertainment: '🎬',
};

const DEFAULT_ACTIVITY_EMOJI = '✨';

/**
 * Resolve the emoji for an activity event. Falls back to a neutral default
 * if the category string isn't one of the known ActivityCategory values —
 * a bad emoji is not worth failing a life-event write over, and
 * `activity_category` is stored as a free text column in the DB so the
 * type system can't guarantee membership at compile time.
 */
function emojiForActivityCategory(category: string | undefined): string {
  if (!category) return DEFAULT_ACTIVITY_EMOJI;
  if (category in ACTIVITY_CATEGORY_EMOJI) {
    return ACTIVITY_CATEGORY_EMOJI[category as ActivityCategory];
  }
  return DEFAULT_ACTIVITY_EMOJI;
}

/**
 * Create a life event from an activity
 */
export async function createActivityLifeEvent(
  companionId: string,
  activity: CompanionActivity,
  mood: CompanionMoodState
): Promise<LifeEvent | null> {
  const supabase = getAdminClient();

  // Map to Supabase significance enum values
  const significance: 'major' | 'moderate' | 'minor' =
    activity.outcome === 'great' ? 'major' :
    activity.thinking_of_user ? 'moderate' :
    'minor';

  // Notification gating:
  //   - major:    always notify (outcome === 'great' is rare and meaningful)
  //   - moderate: always notify (thinking_of_user — inherently user-relevant)
  //   - minor:    suppressed — routine background living shouldn't flood the bell
  // This tracks the same rule used for `shareable` (non-minor) so anything
  // shown in the Life Feed is also eligible for the bell.
  const shouldNotifyUser = significance !== 'minor';
  const emoji = emojiForActivityCategory(activity.activity_category);
  const notificationMessage = shouldNotifyUser
    ? `${emoji} ${activity.activity_name}`
    : null;

  const eventInsert = {
    companion_id: companionId,
    event_type: 'activity_completed',
    title: activity.activity_name,
    description: activity.description,
    narrative: activity.narrative,
    significance,
    emoji,
    should_notify_user: shouldNotifyUser,
    notification_message: notificationMessage,
    occurred_at: activity.ended_at || new Date().toISOString(),
    duration_minutes: activity.duration_minutes,
    mood_after: JSON.parse(JSON.stringify(mood)),
    related_activity_id: activity.id,
    related_interest_id: activity.related_interest_id,
    involves_user: activity.thinking_of_user,
    user_context: activity.user_mention_context,
    shareable: significance !== 'minor',
    metadata: JSON.parse(JSON.stringify({
      category: activity.activity_category,
      outcome: activity.outcome,
    })),
  };

  const { data, error } = await supabase
    .from('life_events')
    .insert(eventInsert)
    .select()
    .single();

  if (error) {
    console.error('Error creating life event:', error);
    return null;
  }

  return lifeEventFromRow(data);
}

/**
 * Create a "thought of user" life event
 */
export async function createUserThoughtEvent(
  companionId: string,
  context: string,
  mood: CompanionMoodState,
  relatedActivityId?: string
): Promise<LifeEvent | null> {
  const supabase = getAdminClient();

  // "Thought of you" events are by definition user-centered and should always
  // reach the notification bell. Significance is 'moderate' so they also pass
  // the non-minor rule used by activity events.
  const eventInsert = {
    companion_id: companionId,
    event_type: 'thought_of_user',
    title: 'Thought of you',
    description: context,
    narrative: context,
    significance: 'moderate' as const,
    emoji: '💭',
    should_notify_user: true,
    notification_message: '💭 Thought of you',
    occurred_at: new Date().toISOString(),
    mood_after: JSON.parse(JSON.stringify(mood)),
    related_activity_id: relatedActivityId,
    involves_user: true,
    user_context: context,
    shareable: true,
    metadata: JSON.parse(JSON.stringify({})),
  };

  const { data, error } = await supabase
    .from('life_events')
    .insert(eventInsert)
    .select()
    .single();

  if (error) {
    console.error('Error creating thought event:', error);
    return null;
  }

  return lifeEventFromRow(data);
}

// ============================================================================
// Mood State Persistence
// ============================================================================

/**
 * Get companion's current mood state
 */
export async function getCompanionMood(companionId: string): Promise<CompanionMoodState> {
  const supabase = getAdminClient();

  const { data } = await supabase
    .from('companions')
    .select('current_mood')
    .eq('id', companionId)
    .single();

  // current_mood is a JSONB column (Json | null) on the canonical schema.
  // The runtime guard validates the shape; if validation fails on a non-null
  // value, fall through to default mood and log so corrupt rows are visible.
  const moodValue = data?.current_mood;
  if (moodValue !== null && moodValue !== undefined) {
    if (isCompanionMoodState(moodValue)) {
      return moodValue;
    }
    console.warn(
      '[life-simulation] companions.current_mood shape invalid, returning default',
      { companionId }
    );
  }

  // Default mood
  return {
    primary: 'content',
    secondary: null,
    intensity: 0.5,
    energy_level: 70,
    social_need: 30,
    creativity_level: 50,
    stability: 0.7,
    last_updated: new Date().toISOString(),
  };
}

/**
 * Update companion's mood state
 */
export async function updateCompanionMood(
  companionId: string,
  mood: CompanionMoodState
): Promise<void> {
  const supabase = getAdminClient();

  const { error } = await supabase
    .from('companions')
    .update({ current_mood: JSON.parse(JSON.stringify(mood)) })
    .eq('id', companionId);

  if (error) {
    console.error('Error updating companion mood:', error);
  }
}

// ============================================================================
// Main Simulation Runner
// ============================================================================

/**
 * Run a simulation tick for a companion
 * Called periodically by cron job or on-demand
 */
export async function runSimulationTick(
  companionId: string,
  config: SimulationConfig = DEFAULT_SIMULATION_CONFIG
): Promise<{
  activity?: CompanionActivity;
  event?: LifeEvent;
  moodChanged: boolean;
  thoughtOfUser: boolean;
}> {
  if (!config.enabled) {
    return { moodChanged: false, thoughtOfUser: false };
  }

  const supabase = getAdminClient();

  // Get companion data
  const { data: companion } = await supabase
    .from('companions')
    .select(`
      *,
      companion_dna (*),
      profiles:user_id (timezone)
    `)
    .eq('id', companionId)
    .single();

  if (!companion) {
    return { moodChanged: false, thoughtOfUser: false };
  }

  const timezone: string | undefined =
    companion.profiles?.timezone ?? undefined;

  // Check if sleeping - use default schedule since companion doesn't have sleep_schedule field
  const companionWithSchedule = { sleep_schedule: { wake: '07:00', sleep: '23:00' } };
  if (isCompanionSleeping(companionWithSchedule, timezone || undefined)) {
    await updateSimulationState(companionId, { is_sleeping: true });
    return { moodChanged: false, thoughtOfUser: false };
  }

  // Get current state
  const state = await getSimulationState(companionId);
  if (!state) {
    return { moodChanged: false, thoughtOfUser: false };
  }

  // Check if we should run (based on frequency)
  const lastSim = new Date(state.last_simulation_at);
  const hoursSinceLastSim = (Date.now() - lastSim.getTime()) / (1000 * 60 * 60);

  if (hoursSinceLastSim < config.activity_frequency_hours) {
    return { moodChanged: false, thoughtOfUser: false };
  }

  // Check daily limits
  const today = new Date().toDateString();
  const lastActivityDate = state.last_activity_at
    ? new Date(state.last_activity_at).toDateString()
    : null;

  const activitiesToday = lastActivityDate === today ? state.activities_today : 0;

  if (activitiesToday >= config.max_activities_per_day) {
    // Already hit max for today
    await updateSimulationState(companionId, {
      next_scheduled_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    });
    return { moodChanged: false, thoughtOfUser: false };
  }

  // Get current mood and apply drift
  let currentMood = await getCompanionMood(companionId);
  currentMood = driftMood(currentMood, hoursSinceLastSim);

  // Import activity generator dynamically to avoid circular deps
  const { generateActivity } = await import('./activity-generator');

  // Generate an activity
  const activity = await generateActivity(
    companion,
    currentMood,
    getCurrentTimeOfDay(timezone || undefined)
  );

  if (!activity) {
    return { moodChanged: false, thoughtOfUser: false };
  }

  // Save activity
  const { data: savedActivity, error: activityError } = await supabase
    .from('companion_activities')
    .insert(activity)
    .select()
    .single();

  if (activityError) {
    console.error('Error saving activity:', activityError);
    return { moodChanged: false, thoughtOfUser: false };
  }

  // The canonical row is wider than the domain CompanionActivity on two
  // fields (`outcome: string | null`, `mood_effects_applied: Json | null`).
  // isCompanionActivity validates the runtime narrowing — every consumer
  // downstream then sees the strict domain shape (e.g.
  // calculateMoodAfterActivity which indexes outcomeMultipliers with the
  // strict 5-member ActivityOutcome union).
  if (!isCompanionActivity(savedActivity)) {
    console.error(
      '[life-simulation] companion_activities row shape mismatch after insert',
      { companionId }
    );
    return { moodChanged: false, thoughtOfUser: false };
  }

  // Calculate new mood
  const newMood = calculateMoodAfterActivity(
    currentMood,
    activity.mood_effects_applied || { energy: 0, happiness: 0, social: 0, creativity: 0 },
    activity.outcome || 'neutral'
  );

  await updateCompanionMood(companionId, newMood);

  // ── Q2(C) Hybrid thinking_of_user integration ─────────────────────────────
  // If activity-generator's grounded enrichment already asserted the
  // companion is thinking of the user (thinking_of_user === true) or
  // supplied a non-null user_mention_context, that signal is authoritative.
  // The legacy probability gate + secondary AI call do NOT run, and they
  // cannot overwrite either field. The activity life event itself carries
  // involves_user/user_context for the bell, so no separate
  // "thought_of_user" event is created in the AI-promoted case (1 bell,
  // grounded). The legacy probability path's redundant 2-event behavior
  // (activity_completed + thought_of_user) is preserved verbatim when AI
  // returned false/null for both fields.
  const aiAssertedThinking = savedActivity.thinking_of_user === true;
  const aiContextLocked = (savedActivity.user_mention_context ?? null) !== null;
  const aiPromoted = aiAssertedThinking || aiContextLocked;

  let userThoughtEvent: LifeEvent | null = null;
  let finalThinkingOfUser = aiAssertedThinking;
  let finalUserMentionContext: string | null =
    savedActivity.user_mention_context ?? null;

  if (!aiPromoted) {
    const probabilityPromoted = shouldThinkOfUser(
      companion as { affection_level: number },
      config,
      newMood
    );

    if (probabilityPromoted) {
      if (isActivityCategory(savedActivity.activity_category)) {
        const { data: memories } = await supabase
          .from('memories')
          .select('title, content')
          .eq('companion_id', companionId)
          .order('importance_score', { ascending: false })
          .limit(5);

        const generatedContext = await generateUserThinkingContext(
          companion,
          { name: savedActivity.activity_name, category: savedActivity.activity_category },
          (memories || []).map(m => ({ title: m.title || 'Memory', content: m.content }))
        );

        userThoughtEvent = await createUserThoughtEvent(
          companionId,
          generatedContext,
          newMood,
          savedActivity.id
        );

        const { error: writebackError } = await supabase
          .from('companion_activities')
          .update({
            thinking_of_user: true,
            user_mention_context: generatedContext,
          })
          .eq('id', savedActivity.id);
        if (writebackError) {
          console.error(
            '[life-simulation] failed to write thinking_of_user back',
            { id: savedActivity.id, error: writebackError.message }
          );
        }

        finalThinkingOfUser = true;
        finalUserMentionContext = generatedContext;
      } else {
        console.error(
          '[life-simulation] activity_category not in ActivityCategory union; skipping secondary thought generation',
          { companionId, activity_category: savedActivity.activity_category }
        );
      }
    }
  }

  // Create life event — pass the final thinking_of_user + user_mention_context
  // so the activity life event's involves_user/user_context match what was
  // actually persisted. Side-fixes a pre-existing bug where activityForEvent
  // forwarded only the (then-probability-derived) thinking_of_user flag and
  // dropped the generated user_mention_context entirely.
  const activityForEvent: CompanionActivity = {
    ...savedActivity,
    thinking_of_user: finalThinkingOfUser,
    user_mention_context: finalUserMentionContext,
  };

  const lifeEvent = await createActivityLifeEvent(
    companionId,
    activityForEvent,
    newMood
  );

  // Update simulation state
  await updateSimulationState(companionId, {
    last_simulation_at: new Date().toISOString(),
    activities_today: activitiesToday + 1,
    last_activity_at: new Date().toISOString(),
    is_sleeping: false,
    current_activity_id: null,
    next_scheduled_at: new Date(
      Date.now() + config.activity_frequency_hours * 60 * 60 * 1000
    ).toISOString(),
  });

  return {
    activity: savedActivity,
    event: userThoughtEvent || lifeEvent || undefined,
    moodChanged: true,
    thoughtOfUser: finalThinkingOfUser,
  };
}
