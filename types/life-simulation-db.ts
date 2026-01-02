/**
 * Life Simulation Database Types Extension
 * 
 * These types extend the main database types for life simulation tables.
 * Use these until the Supabase types are regenerated after migration.
 */

import type {
  ActivityCategory,
  ActivityOutcome,
  InterestCategory,
  InterestOrigin,
  InterestStage,
  LifeEventType,
  EventSignificance,
  CompanionMoodState,
  TimeOfDay,
} from './life-simulation';

// ============================================================================
// Simulation States Table
// ============================================================================

export interface SimulationStateRow {
  id: string;
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
  created_at: string;
  updated_at: string;
}

export interface SimulationStateRowInsert {
  companion_id: string;
  last_simulation_at?: string;
  activities_today?: number;
  last_activity_at?: string | null;
  last_journal_at?: string | null;
  last_proactive_message_at?: string | null;
  is_sleeping?: boolean;
  current_activity_id?: string | null;
  next_scheduled_at?: string;
  simulation_version?: number;
}

export interface SimulationStateRowUpdate {
  last_simulation_at?: string;
  activities_today?: number;
  last_activity_at?: string | null;
  last_journal_at?: string | null;
  last_proactive_message_at?: string | null;
  is_sleeping?: boolean;
  current_activity_id?: string | null;
  next_scheduled_at?: string;
  simulation_version?: number;
}

// ============================================================================
// Companion Activities Table
// ============================================================================

export interface CompanionActivityRow {
  id: string;
  companion_id: string;
  template_id: string;
  activity_name: string;
  activity_category: string;
  description: string | null;
  narrative: string | null;
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
  thinking_of_user: boolean;
  user_mention_context: string | null;
  created_at: string;
}

export interface CompanionActivityRowInsert {
  companion_id: string;
  template_id: string;
  activity_name: string;
  activity_category: string;
  description?: string | null;
  narrative?: string | null;
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

// ============================================================================
// Companion Interests Table
// ============================================================================

export interface CompanionInterestRow {
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
  // New columns added by migration
  strength: number;
  experience_points: number;
  stage: string;
  related_interests: string[];
  favorite_aspects: string[];
  origin: string;
  conversation_mentions: number;
}

export interface CompanionInterestRowInsert {
  companion_id: string;
  interest_name: string;
  interest_category: string;
  interest_level?: number | null;
  growth_rate?: number | null;
  source?: string | null;
  source_details?: string | null;
  shared_with_user?: boolean;
  user_interest_level?: number | null;
  is_active?: boolean;
  // New columns
  origin?: string;
  stage?: string;
  strength?: number;
  experience_points?: number;
  related_interests?: string[];
  favorite_aspects?: string[];
}

export interface CompanionInterestRowUpdate {
  interest_name?: string;
  interest_category?: string;
  interest_level?: number | null;
  stage?: string;
  strength?: number;
  experience_points?: number;
  last_engaged?: string;
  times_practiced?: number;
  related_interests?: string[];
  conversation_mentions?: number;
  favorite_aspects?: string[];
  is_active?: boolean;
}

// ============================================================================
// Interest Connections Table
// ============================================================================

export interface InterestConnectionRow {
  id: string;
  interest_id: string;
  related_interest_id: string;
  connection_type: 'similar' | 'complementary' | 'evolved_from' | 'inspired_by';
  strength: number;
  discovered_at: string;
}

export interface InterestConnectionRowInsert {
  interest_id: string;
  related_interest_id: string;
  connection_type: 'similar' | 'complementary' | 'evolved_from' | 'inspired_by';
  strength?: number;
  discovered_at?: string;
}

// ============================================================================
// Life Events Table
// ============================================================================

export interface LifeEventRow {
  id: string;
  companion_id: string;
  event_type: LifeEventType;
  title: string;
  description: string | null;
  narrative: string | null;
  significance: EventSignificance;
  occurred_at: string;
  duration_minutes: number | null;
  mood_before: CompanionMoodState | null;
  mood_after: CompanionMoodState | null;
  related_activity_id: string | null;
  related_interest_id: string | null;
  involves_user: boolean;
  user_context: string | null;
  shareable: boolean;
  shared_with_user: boolean;
  shared_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface LifeEventRowInsert {
  companion_id: string;
  event_type: LifeEventType;
  title: string;
  description?: string | null;
  narrative?: string | null;
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

// ============================================================================
// Daily Routines Table
// ============================================================================

export interface DailyRoutineRow {
  id: string;
  companion_id: string;
  name: string;
  is_default: boolean;
  slots: Array<{
    timeOfDay: TimeOfDay;
    preferredCategories: ActivityCategory[];
    probability: number;
    minDuration: number;
    maxDuration: number;
  }>;
  wake_time: string;
  sleep_time: string;
  energy_pattern: 'morning_person' | 'night_owl' | 'balanced';
  social_windows: TimeOfDay[];
  created_at: string;
  updated_at: string;
}

export interface DailyRoutineRowInsert {
  companion_id: string;
  name: string;
  is_default?: boolean;
  slots: Array<{
    timeOfDay: TimeOfDay;
    preferredCategories: ActivityCategory[];
    probability: number;
    minDuration: number;
    maxDuration: number;
  }>;
  wake_time: string;
  sleep_time: string;
  energy_pattern: 'morning_person' | 'night_owl' | 'balanced';
  social_windows: TimeOfDay[];
}

export interface DailyRoutineRowUpdate {
  name?: string;
  is_default?: boolean;
  slots?: Array<{
    timeOfDay: TimeOfDay;
    preferredCategories: ActivityCategory[];
    probability: number;
    minDuration: number;
    maxDuration: number;
  }>;
  wake_time?: string;
  sleep_time?: string;
  energy_pattern?: 'morning_person' | 'night_owl' | 'balanced';
  social_windows?: TimeOfDay[];
  updated_at?: string;
}

// ============================================================================
// Companion Journals Table
// ============================================================================

export interface CompanionJournalRow {
  id: string;
  companion_id: string;
  entry_type: string;
  title: string | null;
  content: string;
  mood_at_time: CompanionMoodState | null;
  related_event_id: string | null;
  related_interest_id: string | null;
  mentions_user: boolean;
  is_private: boolean;
  written_at: string;
  created_at: string;
}

export interface CompanionJournalRowInsert {
  companion_id: string;
  entry_type: string;
  title?: string | null;
  content: string;
  mood_at_time?: CompanionMoodState | null;
  related_event_id?: string | null;
  related_interest_id?: string | null;
  mentions_user?: boolean;
  is_private?: boolean;
  written_at: string;
}

// ============================================================================
// Type Helpers for Supabase Queries
// ============================================================================

/**
 * Use these type assertions when querying new tables:
 * 
 * const { data } = await supabase
 *   .from('companion_activities')
 *   .select('*') as unknown as { data: CompanionActivityRow[] | null };
 */

export type LifeSimulationTables = {
  simulation_states: SimulationStateRow;
  companion_activities: CompanionActivityRow;
  companion_interests: CompanionInterestRow;
  interest_connections: InterestConnectionRow;
  life_events: LifeEventRow;
  daily_routines: DailyRoutineRow;
  companion_journals: CompanionJournalRow;
};
