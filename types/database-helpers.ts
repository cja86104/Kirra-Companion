// Hand-written types for the Kirra Companion schema. This file is
// NOT touched by `npm run db:generate` — add all custom type
// aliases, interfaces, and helper types here.

import type { Database } from './database';

// =============================================================================
// ROW TYPES (Read)
// =============================================================================

type PublicSchema = Database["public"]

export type Profile = PublicSchema["Tables"]["profiles"]["Row"]
export type Companion = PublicSchema["Tables"]["companions"]["Row"]
export type CompanionDNA = PublicSchema["Tables"]["companion_dna"]["Row"]
export type Conversation = PublicSchema["Tables"]["conversations"]["Row"]
export type Message = PublicSchema["Tables"]["messages"]["Row"]
export type Memory = PublicSchema["Tables"]["memories"]["Row"]
export type MemoryCategory = PublicSchema["Tables"]["memory_categories"]["Row"]
export type MemoryAccessLog = PublicSchema["Tables"]["memory_access_log"]["Row"]
export type LifeEvent = PublicSchema["Tables"]["life_events"]["Row"]
export type Activity = PublicSchema["Tables"]["activities"]["Row"]
export type ActivitySession = PublicSchema["Tables"]["activity_sessions"]["Row"]
export type CompanionSkill = PublicSchema["Tables"]["companion_skills"]["Row"]
export type CompanionInterest = PublicSchema["Tables"]["companion_interests"]["Row"]
export type CompanionActivity = PublicSchema["Tables"]["companion_activities"]["Row"]
export type CompanionJournalEntry = PublicSchema["Tables"]["companion_journal_entries"]["Row"]
export type CompanionMemory = PublicSchema["Views"]["companion_memories"]["Row"]
export type InterestConnection = PublicSchema["Tables"]["interest_connections"]["Row"]
export type DailyRoutine = PublicSchema["Tables"]["daily_routines"]["Row"]
export type ProactiveMessage = PublicSchema["Tables"]["proactive_messages"]["Row"]
export type SimulationState = PublicSchema["Tables"]["simulation_states"]["Row"]
export type RelationshipMilestone = PublicSchema["Tables"]["relationship_milestones"]["Row"]
export type UserAchievement = PublicSchema["Tables"]["user_achievements"]["Row"]
export type CrisisLog = PublicSchema["Tables"]["crisis_logs"]["Row"]
export type AuditLog = PublicSchema["Tables"]["audit_logs"]["Row"]
export type DataExport = PublicSchema["Tables"]["data_exports"]["Row"]
export type BehavioralDetectionLog = PublicSchema["Tables"]["behavioral_detection_logs"]["Row"]
export type GeneratedScene = PublicSchema["Tables"]["generated_scenes"]["Row"]
export type TriviaGame = PublicSchema["Tables"]["trivia_games"]["Row"]
export type SkillUsageLog = PublicSchema["Tables"]["skill_usage_log"]["Row"]
export type SceneGenerationTracker = PublicSchema["Tables"]["scene_generation_tracker"]["Row"]
export type CompanionCreationAudit = PublicSchema["Tables"]["companion_creation_audit"]["Row"]

// Legacy alias
export type MemoryCategoryRow = MemoryCategory

// =============================================================================
// INSERT TYPES (Create)
// =============================================================================

export type ProfileInsert = PublicSchema["Tables"]["profiles"]["Insert"]
export type CompanionInsert = PublicSchema["Tables"]["companions"]["Insert"]
export type CompanionDNAInsert = PublicSchema["Tables"]["companion_dna"]["Insert"]
export type ConversationInsert = PublicSchema["Tables"]["conversations"]["Insert"]
export type MessageInsert = PublicSchema["Tables"]["messages"]["Insert"]
export type MemoryInsert = PublicSchema["Tables"]["memories"]["Insert"]
export type LifeEventInsert = PublicSchema["Tables"]["life_events"]["Insert"]
export type ActivitySessionInsert = PublicSchema["Tables"]["activity_sessions"]["Insert"]
export type CompanionSkillInsert = PublicSchema["Tables"]["companion_skills"]["Insert"]
export type CompanionActivityInsert = PublicSchema["Tables"]["companion_activities"]["Insert"]
export type CompanionJournalEntryInsert = PublicSchema["Tables"]["companion_journal_entries"]["Insert"]
export type InterestConnectionInsert = PublicSchema["Tables"]["interest_connections"]["Insert"]
export type DailyRoutineInsert = PublicSchema["Tables"]["daily_routines"]["Insert"]
export type ProactiveMessageInsert = PublicSchema["Tables"]["proactive_messages"]["Insert"]
export type RelationshipMilestoneInsert = PublicSchema["Tables"]["relationship_milestones"]["Insert"]
export type UserAchievementInsert = PublicSchema["Tables"]["user_achievements"]["Insert"]
export type CrisisLogInsert = PublicSchema["Tables"]["crisis_logs"]["Insert"]
export type AuditLogInsert = PublicSchema["Tables"]["audit_logs"]["Insert"]
export type DataExportInsert = PublicSchema["Tables"]["data_exports"]["Insert"]
export type BehavioralDetectionLogInsert = PublicSchema["Tables"]["behavioral_detection_logs"]["Insert"]
export type MemoryAccessLogInsert = PublicSchema["Tables"]["memory_access_log"]["Insert"]
export type TriviaGameInsert = PublicSchema["Tables"]["trivia_games"]["Insert"]
export type TriviaGameUpdate = PublicSchema["Tables"]["trivia_games"]["Update"]

// =============================================================================
// UPDATE TYPES (Modify)
// =============================================================================

export type ProfileUpdate = PublicSchema["Tables"]["profiles"]["Update"]
export type CompanionUpdate = PublicSchema["Tables"]["companions"]["Update"]
export type CompanionDNAUpdate = PublicSchema["Tables"]["companion_dna"]["Update"]
export type ConversationUpdate = PublicSchema["Tables"]["conversations"]["Update"]
export type MessageUpdate = PublicSchema["Tables"]["messages"]["Update"]
export type MemoryUpdate = PublicSchema["Tables"]["memories"]["Update"]
export type LifeEventUpdate = PublicSchema["Tables"]["life_events"]["Update"]
export type CompanionSkillUpdate = PublicSchema["Tables"]["companion_skills"]["Update"]
export type CompanionActivityUpdate = PublicSchema["Tables"]["companion_activities"]["Update"]
export type DailyRoutineUpdate = PublicSchema["Tables"]["daily_routines"]["Update"]

// =============================================================================
// ENUM TYPES
// =============================================================================

export type SubscriptionTier = PublicSchema["Enums"]["subscription_tier"]
export type SubscriptionStatus = PublicSchema["Enums"]["subscription_status"]
export type RelationshipType = PublicSchema["Enums"]["relationship_type"]
export type MessageRole = PublicSchema["Enums"]["message_role"]
export type ContentType = PublicSchema["Enums"]["content_type"]
export type AgeTier = PublicSchema["Enums"]["age_tier"]
export type CrisisType = PublicSchema["Enums"]["crisis_type"]
export type CrisisSeverity = PublicSchema["Enums"]["crisis_severity"]
export type EventSignificance = PublicSchema["Enums"]["event_significance"]
export type LifeEventTypeEnum = PublicSchema["Enums"]["life_event_type"]
export type MemoryCategoryEnum = PublicSchema["Enums"]["memory_category"]
export type MemoryAccessType = PublicSchema["Enums"]["memory_access_type"]
export type SkillCategory = PublicSchema["Enums"]["skill_category"]
export type SkillProficiency = PublicSchema["Enums"]["skill_proficiency"]
export type ActivityType = PublicSchema["Enums"]["activity_type"]
export type MilestoneType = PublicSchema["Enums"]["milestone_type"]
export type AchievementRarity = PublicSchema["Enums"]["achievement_rarity"]
export type ExportStatus = PublicSchema["Enums"]["export_status"]
export type ExportType = PublicSchema["Enums"]["export_type"]
export type TaskStatus = PublicSchema["Enums"]["task_status"]

// =============================================================================
// CUSTOM TYPES (Application-specific)
// =============================================================================

export type EmotionType =
  | "happy"
  | "sad"
  | "excited"
  | "calm"
  | "curious"
  | "loving"
  | "playful"
  | "thoughtful"
  | "neutral"
  | "anxious"
  | "proud"
  | "grateful"

export interface MoodState {
  primary: EmotionType
  secondary?: EmotionType | null
  intensity: number
  lastUpdated?: string | null
}

export interface VoiceConfig {
  provider: "elevenlabs" | "openai"
  voiceId: string | null
  model?: string
  speed?: number
  stability?: number
  similarityBoost?: number
  style?: number
  speakingRate?: number
}

export interface CompanionWithDNA extends Companion {
  companion_dna: CompanionDNA | null
}

export interface MemoryWithCategory extends Memory {
  category?: string
  memory_categories?: Pick<MemoryCategory, "name" | "icon" | "color"> | null
}

export interface CommunicationDialect {
  uniquePhrases?: string[]
  favoriteExpressions?: string[]
  speechPatterns?: string[]
  vocabularyLevel?: string
  formalityPreference?: number
}

export type EventType =
  | "discovery"
  | "achievement"
  | "relationship"
  | "mood_shift"
  | "growth"
  | "memory"
  | "skill_learned"
  | "interest_developed"
  | "milestone"
  | "daily_reflection"
