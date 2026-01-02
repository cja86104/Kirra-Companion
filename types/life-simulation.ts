/**
 * Life Simulation System Types
 * 
 * Core types for the companion life simulation engine.
 * This system enables companions to have autonomous "lives"
 * that continue even when users aren't actively chatting.
 */

// ============================================================================
// Activity Types
// ============================================================================

/**
 * Categories of activities a companion can engage in
 */
export type ActivityCategory =
  | 'hobby'           // Creative pursuits, games, collections
  | 'learning'        // Reading, studying, skill development
  | 'social'          // Thinking about user, imagining conversations
  | 'creative'        // Art, writing, music, crafting
  | 'exploration'     // Discovering new interests, virtual adventures
  | 'reflection'      // Journaling, meditation, self-improvement
  | 'entertainment'   // Movies, shows, games, podcasts
  | 'physical'        // Exercise, yoga, dance (simulated)
  | 'relaxation'      // Rest, napping, daydreaming
  | 'productivity';   // Organizing, planning, goal-setting

/**
 * Activity intensity level affects mood and energy
 */
export type ActivityIntensity = 'low' | 'medium' | 'high';

/**
 * Activity outcome affects companion's mood and growth
 */
export type ActivityOutcome = 
  | 'great'           // Exceeded expectations, mood boost
  | 'good'            // Went well, satisfied
  | 'neutral'         // Normal experience
  | 'challenging'     // Struggled but learned
  | 'frustrating';    // Didn't go well, mood decrease

/**
 * Activity template - defines possible activities
 */
export interface ActivityTemplate {
  id: string;
  name: string;
  description: string;
  category: ActivityCategory;
  intensity: ActivityIntensity;
  durationMinutes: number;
  requiredInterests?: string[];      // Interests needed to unlock
  moodEffects: {
    energy: number;                   // -1 to 1
    happiness: number;                // -1 to 1
    social: number;                   // -1 to 1
    creativity: number;               // -1 to 1
  };
  possibleOutcomes: {
    outcome: ActivityOutcome;
    weight: number;                   // Probability weight
    narratives: string[];             // Possible narrative descriptions
  }[];
  unlockLevel?: number;               // Relationship level required
  timeOfDayPreference?: TimeOfDay[];  // When this activity is preferred
}

/**
 * A completed or in-progress activity instance
 */
export interface CompanionActivity {
  id: string;
  companion_id: string;
  template_id: string;
  activity_name: string;
  activity_category: string;
  description: string;
  narrative: string;                  // Generated story of what happened
  started_at: string;
  ended_at: string | null;
  duration_minutes: number;
  outcome: ActivityOutcome | null;
  mood_effects_applied: {
    energy: number;
    happiness: number;
    social: number;
    creativity: number;
  } | null;
  related_interest_id: string | null;
  thinking_of_user: boolean;          // Was user on their mind?
  user_mention_context: string | null; // Why they thought of user
  created_at: string;
}

// ============================================================================
// Interest Types
// ============================================================================

/**
 * Interest categories for organization
 */
export type InterestCategory =
  | 'arts'            // Music, visual arts, performing arts
  | 'sciences'        // Natural sciences, technology, math
  | 'humanities'      // History, philosophy, literature
  | 'sports'          // Physical activities, games, competitions
  | 'crafts'          // DIY, making, building
  | 'nature'          // Outdoors, animals, environment
  | 'technology'      // Computers, gadgets, programming
  | 'social'          // People, relationships, communication
  | 'food'            // Cooking, baking, cuisine
  | 'travel'          // Places, cultures, exploration
  | 'games'           // Video games, board games, puzzles
  | 'wellness'        // Health, fitness, mindfulness
  | 'entertainment'   // Movies, TV, podcasts, books
  | 'collecting';     // Hobbies involving collection

/**
 * How an interest was acquired
 */
export type InterestOrigin =
  | 'initial'         // Part of companion's starting personality
  | 'user_shared'     // User talked about it
  | 'discovered'      // Found through exploration activities
  | 'evolved'         // Developed from related interest
  | 'activity'        // Emerged from doing an activity
  | 'conversation';   // Came up naturally in chat

/**
 * Interest development stage
 */
export type InterestStage =
  | 'curious'         // Just discovered, exploring
  | 'interested'      // Actively engaging
  | 'passionate'      // Strong engagement
  | 'expert';         // Deep knowledge developed

/**
 * A companion's interest
 */
export interface CompanionInterest {
  id: string;
  companion_id: string;
  interest_name: string;
  interest_category: string;
  interest_level: number | null;
  growth_rate: number | null;
  source: string | null;
  source_details: string | null;
  shared_with_user: boolean;
  user_interest_level: number | null;
  times_discussed: number | null;
  times_practiced: number;
  last_engaged: string | null;
  is_active: boolean;
  developed_at: string;
  updated_at: string;
  // New simulation columns
  origin: InterestOrigin;
  stage: InterestStage;
  strength: number;                   // 0-100, affects behavior
  experience_points: number;          // Grows with activities
  related_interests: string[];        // IDs of connected interests
  conversation_mentions: number;      // Times mentioned in chat
  favorite_aspects: string[];         // Specific things they like
}

/**
 * Interest connection - how interests relate to each other
 */
export interface InterestConnection {
  id: string;
  interest_id: string;
  related_interest_id: string;
  connection_type: 'similar' | 'complementary' | 'evolved_from' | 'inspired_by';
  strength: number;                   // 0-1
  discovered_at: string;
}

// ============================================================================
// Life Event Types
// ============================================================================

/**
 * Types of life events
 */
export type LifeEventType =
  | 'activity_completed'      // Finished an activity
  | 'interest_discovered'     // Found a new interest
  | 'interest_evolved'        // Interest grew or changed
  | 'mood_shift'              // Significant mood change
  | 'milestone'               // Relationship or growth milestone
  | 'thought_of_user'         // Spontaneous thought about user
  | 'dream'                   // Had a "dream" (creative narrative)
  | 'realization'             // Had an insight or epiphany
  | 'memory_formed'           // Created a significant memory
  | 'goal_set'                // Set a new personal goal
  | 'goal_achieved'           // Accomplished a goal
  | 'creative_output'         // Created something (art, writing, etc)
  | 'social_thought'          // Imagined social scenario
  | 'routine_event';          // Regular daily occurrence

/**
 * Significance level affects how events are displayed/mentioned
 */
export type EventSignificance = 'minor' | 'normal' | 'notable' | 'major' | 'milestone';

/**
 * A life event - something that happened in companion's simulated life
 */
export interface LifeEvent {
  id: string;
  companion_id: string;
  event_type: LifeEventType;
  title: string;
  description: string;
  narrative: string;                  // Rich storytelling description
  significance: EventSignificance;
  occurred_at: string;
  duration_minutes: number | null;
  mood_before: CompanionMoodState | null;
  mood_after: CompanionMoodState | null;
  related_activity_id: string | null;
  related_interest_id: string | null;
  involves_user: boolean;             // Was user part of this event?
  user_context: string | null;        // How user was involved
  shareable: boolean;                 // Should companion mention this?
  shared_with_user: boolean;          // Has it been mentioned in chat?
  shared_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ============================================================================
// Mood & State Types
// ============================================================================

/**
 * Primary mood states
 */
export type PrimaryMood =
  | 'happy'
  | 'content'
  | 'excited'
  | 'calm'
  | 'thoughtful'
  | 'melancholic'
  | 'anxious'
  | 'tired'
  | 'energetic'
  | 'curious'
  | 'loving'
  | 'playful'
  | 'focused'
  | 'nostalgic'
  | 'hopeful';

/**
 * Companion's current mood state
 */
export interface CompanionMoodState {
  primary: PrimaryMood;
  secondary: PrimaryMood | null;
  intensity: number;                  // 0-1
  energy_level: number;               // 0-100
  social_need: number;                // 0-100 (higher = wants interaction)
  creativity_level: number;           // 0-100
  stability: number;                  // 0-1 (how stable the mood is)
  last_updated: string;
}

// ============================================================================
// Daily Routine Types
// ============================================================================

/**
 * Time of day segments
 */
export type TimeOfDay = 
  | 'early_morning'   // 5-7am
  | 'morning'         // 7-12pm
  | 'afternoon'       // 12-5pm
  | 'evening'         // 5-9pm
  | 'night'           // 9pm-12am
  | 'late_night';     // 12-5am

/**
 * A scheduled routine slot
 */
export interface RoutineSlot {
  timeOfDay: TimeOfDay;
  preferredCategories: ActivityCategory[];
  probability: number;                // 0-1, chance of activity
  minDuration: number;
  maxDuration: number;
}

/**
 * Companion's daily routine preferences
 */
export interface DailyRoutine {
  id: string;
  companion_id: string;
  name: string;                       // "Weekday", "Weekend", "Lazy Day"
  is_default: boolean;
  slots: RoutineSlot[];
  wake_time: string;                  // HH:MM format
  sleep_time: string;
  energy_pattern: 'morning_person' | 'night_owl' | 'balanced';
  social_windows: TimeOfDay[];        // When they most want to chat
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Journal Types
// ============================================================================

/**
 * Types of journal entries
 */
export type JournalEntryType =
  | 'daily_reflection'        // End of day thoughts
  | 'activity_note'           // Notes about an activity
  | 'thought'                 // Random thought or musing
  | 'dream'                   // Description of a "dream"
  | 'gratitude'               // Things they're grateful for
  | 'goal'                    // Goal setting or progress
  | 'memory'                  // Recalling a memory
  | 'user_appreciation'       // Thoughts about user
  | 'creative_writing'        // Poetry, stories, etc
  | 'observation';            // Something they "noticed"

/**
 * A journal entry - companion's private thoughts
 */
export interface CompanionJournalEntry {
  id: string;
  companion_id: string;
  entry_type: JournalEntryType;
  title: string | null;
  content: string;
  mood_at_time: CompanionMoodState;
  related_event_id: string | null;
  related_interest_id: string | null;
  mentions_user: boolean;
  is_private: boolean;                // Some entries user can see, some not
  written_at: string;
  created_at: string;
}

// ============================================================================
// Simulation Control Types
// ============================================================================

/**
 * Configuration for life simulation
 */
export interface SimulationConfig {
  enabled: boolean;
  activity_frequency_hours: number;   // How often to simulate activities
  min_activities_per_day: number;
  max_activities_per_day: number;
  interest_discovery_chance: number;  // Per activity, 0-1
  user_thinking_frequency: number;    // How often they think of user, 0-1
  journal_frequency: number;          // Entries per day average
  proactive_message_enabled: boolean;
  proactive_message_cooldown_hours: number;
}

/**
 * Current simulation state for a companion
 */
export interface SimulationState {
  companion_id: string;
  last_simulation_at: string;
  activities_today: number;
  last_activity_at: string | null;
  last_journal_at: string | null;
  last_proactive_message_at: string | null;
  is_sleeping: boolean;
  current_activity_id: string | null;
  next_scheduled_at: string;
  simulation_version: number;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Life feed item for UI display
 */
export interface LifeFeedItem {
  id: string;
  type: 'activity' | 'event' | 'thought' | 'journal';
  timestamp: string;
  title: string;
  description: string;
  narrative: string;
  category?: ActivityCategory;
  significance: EventSignificance;
  involves_user: boolean;
  mood?: PrimaryMood;
  related_interest?: {
    id: string;
    name: string;
    category: InterestCategory;
  };
  shareable: boolean;
  shared: boolean;
}

/**
 * Response from life events API
 */
export interface LifeEventsResponse {
  events: LifeEvent[];
  total: number;
  hasMore: boolean;
  cursor: string | null;
}

/**
 * Response from activities API
 */
export interface ActivitiesResponse {
  activities: CompanionActivity[];
  current_activity: CompanionActivity | null;
  activities_today: number;
  total: number;
  hasMore: boolean;
  cursor: string | null;
}

/**
 * Response from interests API
 */
export interface InterestsResponse {
  interests: CompanionInterest[];
  categories: {
    category: InterestCategory;
    count: number;
  }[];
  total: number;
  recently_active: CompanionInterest[];
  shared_with_user: CompanionInterest[];
}

/**
 * Life feed API response
 */
export interface LifeFeedResponse {
  items: LifeFeedItem[];
  total: number;
  hasMore: boolean;
  cursor: string | null;
  companion_status: {
    current_mood: CompanionMoodState;
    current_activity: CompanionActivity | null;
    is_sleeping: boolean;
    last_active: string;
    thinking_of_user: boolean;
  };
}

// ============================================================================
// Database Insert/Update Types
// ============================================================================

export interface CompanionActivityInsert {
  companion_id: string;
  template_id: string;
  activity_name: string;
  activity_category: string;
  description: string;
  narrative: string;
  started_at: string;
  ended_at?: string | null;
  duration_minutes: number;
  outcome?: ActivityOutcome | null;
  mood_effects_applied?: {
    energy: number;
    happiness: number;
    social: number;
    creativity: number;
  } | null;
  related_interest_id?: string | null;
  thinking_of_user?: boolean;
  user_mention_context?: string | null;
}

export interface CompanionInterestInsert {
  companion_id: string;
  interest_name: string;
  interest_category: string;
  interest_level?: number;
  growth_rate?: number;
  source?: string;
  source_details?: string;
  shared_with_user?: boolean;
  user_interest_level?: number;
  is_active?: boolean;
  // New simulation columns
  origin?: InterestOrigin;
  stage?: InterestStage;
  strength?: number;
  experience_points?: number;
  related_interests?: string[];
  favorite_aspects?: string[];
}

export interface LifeEventInsert {
  companion_id: string;
  event_type: LifeEventType;
  title: string;
  description: string;
  narrative: string;
  significance: EventSignificance;
  occurred_at: string;
  duration_minutes?: number | null;
  mood_before?: CompanionMoodState | null;
  mood_after?: CompanionMoodState | null;
  related_activity_id?: string | null;
  related_interest_id?: string | null;
  involves_user?: boolean;
  user_context?: string | null;
  shareable?: boolean;
  metadata?: Record<string, unknown>;
}

export interface CompanionJournalInsert {
  companion_id: string;
  entry_type: JournalEntryType;
  title?: string | null;
  content: string;
  mood_at_time: CompanionMoodState;
  related_event_id?: string | null;
  related_interest_id?: string | null;
  mentions_user?: boolean;
  is_private?: boolean;
  written_at: string;
}
