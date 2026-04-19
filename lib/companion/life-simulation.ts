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
  PrimaryMood,
  TimeOfDay,
} from '@/types/life-simulation';
import type { Companion, CompanionDNA } from '@/types/database';
import type {
  SimulationStateRow,
  LifeEventRow,
  CompanionActivityRow,
} from '@/types/life-simulation-db';

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
 */
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase admin credentials');
  return createAdminClient(url, key);
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
  calm: ['content', 'thoughtful', 'peaceful' as PrimaryMood, 'nostalgic'],
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
  companion: Companion & { companion_dna?: CompanionDNA },
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
    const defaultState: Omit<SimulationState, 'companion_id'> = {
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
      .single() as unknown as { data: SimulationStateRow | null; error: Error | null };
    
    if (insertError) {
      console.error('Error creating simulation state:', insertError);
      return null;
    }
    
    return newState as unknown as SimulationState;
  }
  
  return data as SimulationState;
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
    .eq('companion_id', companionId) as unknown as { error: Error | null };
  
  if (error) {
    console.error('Error updating simulation state:', error);
  }
}

// ============================================================================
// Life Event Creation
// ============================================================================

/**
 * Maps an activity category to the emoji rendered in the notification bell
 * and in Life Feed surfaces. Keyed by `ActivityCategory`; all 10 known
 * categories have an entry so a runtime miss here would indicate a type
 * drift rather than a missing case.
 */
const ACTIVITY_CATEGORY_EMOJI: Record<ActivityCategory, string> = {
  hobby: '🎨',
  learning: '📚',
  social: '💭',
  creative: '✨',
  exploration: '🧭',
  reflection: '🕯️',
  entertainment: '🎬',
  physical: '🏃',
  relaxation: '😌',
  productivity: '📝',
};

const DEFAULT_ACTIVITY_EMOJI = '✨';

/**
 * Resolve the emoji for an activity event. Falls back to a neutral default
 * if the category is somehow missing from the map rather than throwing —
 * a bad emoji is not worth failing a life-event write over.
 */
function emojiForActivityCategory(category: ActivityCategory | undefined): string {
  if (!category) return DEFAULT_ACTIVITY_EMOJI;
  return ACTIVITY_CATEGORY_EMOJI[category] ?? DEFAULT_ACTIVITY_EMOJI;
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
    .single() as unknown as { data: LifeEventRow | null; error: Error | null };

  if (error) {
    console.error('Error creating life event:', error);
    return null;
  }

  return data as unknown as LifeEvent;
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
    .single() as unknown as { data: LifeEventRow | null; error: Error | null };

  if (error) {
    console.error('Error creating thought event:', error);
    return null;
  }

  return data as unknown as LifeEvent;
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
    .single() as { data: { current_mood: CompanionMoodState | null } | null };
  
  if (data?.current_mood) {
    return data.current_mood as CompanionMoodState;
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
    .eq('id', companionId) as { error: Error | null };
  
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
    .single() as { data: Companion & { companion_dna: CompanionDNA | null; profiles: { timezone?: string } | null } | null };
  
  if (!companion) {
    return { moodChanged: false, thoughtOfUser: false };
  }
  
  const timezone = (companion.profiles as { timezone?: string } | undefined)?.timezone;

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
    companion as Companion & { companion_dna?: CompanionDNA },
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
    .single() as unknown as { data: CompanionActivityRow | null; error: Error | null };
  
  if (activityError) {
    console.error('Error saving activity:', activityError);
    return { moodChanged: false, thoughtOfUser: false };
  }
  
  // Calculate new mood
  const newMood = calculateMoodAfterActivity(
    currentMood,
    activity.mood_effects_applied || { energy: 0, happiness: 0, social: 0, creativity: 0 },
    activity.outcome || 'neutral'
  );
  
  await updateCompanionMood(companionId, newMood);
  
  // Check if they thought of user
  const thoughtOfUser = shouldThinkOfUser(
    companion as { affection_level: number },
    config,
    newMood
  );
  
  let userThoughtEvent: LifeEvent | null = null;
  if (thoughtOfUser) {
    // Get some memories for context
    const { data: memories } = await supabase
      .from('memories')
      .select('title, content')
      .eq('companion_id', companionId)
      .order('importance_score', { ascending: false })
      .limit(5);
    
    const context = await generateUserThinkingContext(
      companion as Companion & { companion_dna?: CompanionDNA },
      { name: activity.activity_name, category: activity.activity_category as ActivityCategory },
      (memories || []).map(m => ({ title: m.title || 'Memory', content: m.content }))
    );
    
    userThoughtEvent = await createUserThoughtEvent(
      companionId,
      context,
      newMood,
      savedActivity?.id
    );
    
    // Update activity with user thinking context
    if (savedActivity?.id) {
      await supabase
        .from('companion_activities')
        .update({
          thinking_of_user: true,
          user_mention_context: context,
        })
        .eq('id', savedActivity.id) as unknown as Promise<{ error: Error | null }>;
    }
  }
  
  // Create life event
  const activityForEvent = savedActivity ? { 
    ...(savedActivity as CompanionActivity), 
    thinking_of_user: thoughtOfUser 
  } : null;
  
  const lifeEvent = activityForEvent ? await createActivityLifeEvent(
    companionId,
    activityForEvent,
    newMood
  ) : null;
  
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
    activity: savedActivity as CompanionActivity,
    event: userThoughtEvent || lifeEvent || undefined,
    moodChanged: true,
    thoughtOfUser,
  };
}
