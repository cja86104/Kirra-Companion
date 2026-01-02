/**
 * Kirra Companion - Supabase Type Helpers
 * Provides type-safe wrappers for Supabase queries
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { 
  Database,
  Profile,
  ProfileInsert,
  ProfileUpdate,
  Companion,
  CompanionInsert,
  CompanionUpdate,
  CompanionDNA,
  CompanionDNAInsert,
  Conversation,
  ConversationInsert,
  ConversationUpdate,
  Message,
  MessageInsert,
  Memory,
  MemoryInsert,
  MemoryUpdate,
  MemoryCategoryRow,
  LifeEvent,
  LifeEventInsert,
  Activity,
  ActivitySession,
  ActivitySessionInsert,
  CrisisLog,
  CrisisLogInsert,
  BehavioralDetectionLog,
  BehavioralDetectionLogInsert,
  DataExport,
  DataExportInsert,
  AuditLog,
  AuditLogInsert,
  MemoryAccessLog,
  MemoryAccessLogInsert,
  RelationshipMilestone,
  RelationshipMilestoneInsert,
  UserAchievement,
  UserAchievementInsert,
} from '@/types/database';

// Type-safe table accessor type
type TypedSupabaseClient = SupabaseClient<Database>;

/**
 * Type-safe wrapper for profiles table queries
 */
export function profilesTable(supabase: TypedSupabaseClient) {
  return {
    select: () => supabase.from('profiles').select('*') as unknown as Promise<{ data: Profile[] | null; error: Error | null }>,
    selectSingle: (id: string) => supabase.from('profiles').select('*').eq('id', id).single() as unknown as Promise<{ data: Profile | null; error: Error | null }>,
    selectFields: <T extends keyof Profile>(fields: T[], id: string) => 
      supabase.from('profiles').select(fields.join(',')).eq('id', id).single() as unknown as Promise<{ data: Pick<Profile, T> | null; error: Error | null }>,
    insert: (data: ProfileInsert) => supabase.from('profiles').insert(data as never),
    update: (id: string, data: ProfileUpdate) => supabase.from('profiles').update(data as never).eq('id', id),
    upsert: (data: ProfileInsert) => supabase.from('profiles').upsert(data as never),
  };
}

/**
 * Type-safe wrapper for companions table queries
 */
export function companionsTable(supabase: TypedSupabaseClient) {
  return {
    select: () => supabase.from('companions').select('*') as unknown as Promise<{ data: Companion[] | null; error: Error | null }>,
    selectByUser: (userId: string) => supabase.from('companions').select('*').eq('user_id', userId) as unknown as Promise<{ data: Companion[] | null; error: Error | null }>,
    selectSingle: (id: string) => supabase.from('companions').select('*').eq('id', id).single() as unknown as Promise<{ data: Companion | null; error: Error | null }>,
    selectWithDNA: (id: string) => supabase.from('companions').select('*, companion_dna(*)').eq('id', id).single() as unknown as Promise<{ data: (Companion & { companion_dna: CompanionDNA[] }) | null; error: Error | null }>,
    insert: (data: CompanionInsert) => supabase.from('companions').insert(data as never).select().single() as unknown as Promise<{ data: Companion | null; error: Error | null }>,
    update: (id: string, data: CompanionUpdate) => supabase.from('companions').update(data as never).eq('id', id),
  };
}

/**
 * Type-safe wrapper for companion_dna table queries
 */
export function companionDnaTable(supabase: TypedSupabaseClient) {
  return {
    selectByCompanion: (companionId: string) => supabase.from('companion_dna').select('*').eq('companion_id', companionId).single() as unknown as Promise<{ data: CompanionDNA | null; error: Error | null }>,
    insert: (data: CompanionDNAInsert) => supabase.from('companion_dna').insert(data as never),
  };
}

/**
 * Type-safe wrapper for conversations table queries
 */
export function conversationsTable(supabase: TypedSupabaseClient) {
  return {
    select: () => supabase.from('conversations').select('*') as unknown as Promise<{ data: Conversation[] | null; error: Error | null }>,
    selectByCompanion: (companionId: string, userId: string) => 
      supabase.from('conversations').select('*').eq('companion_id', companionId).eq('user_id', userId).eq('is_archived', false) as unknown as Promise<{ data: Conversation[] | null; error: Error | null }>,
    selectSingle: (id: string) => supabase.from('conversations').select('*').eq('id', id).single() as unknown as Promise<{ data: Conversation | null; error: Error | null }>,
    insert: (data: ConversationInsert) => supabase.from('conversations').insert(data as never).select().single() as unknown as Promise<{ data: Conversation | null; error: Error | null }>,
    update: (id: string, data: ConversationUpdate) => supabase.from('conversations').update(data as never).eq('id', id),
  };
}

/**
 * Type-safe wrapper for messages table queries
 */
export function messagesTable(supabase: TypedSupabaseClient) {
  return {
    selectByConversation: (conversationId: string, limit = 100) => 
      supabase.from('messages').select('*').eq('conversation_id', conversationId).eq('is_deleted', false).order('created_at', { ascending: true }).limit(limit) as unknown as Promise<{ data: Message[] | null; error: Error | null }>,
    insert: (data: MessageInsert) => supabase.from('messages').insert(data as never),
    update: (id: string, data: Partial<Message>) => supabase.from('messages').update(data as never).eq('id', id),
  };
}

/**
 * Type-safe wrapper for memories table queries
 */
export function memoriesTable(supabase: TypedSupabaseClient) {
  return {
    selectByCompanion: (companionId: string, limit = 50) => 
      supabase.from('memories').select('*, memory_categories(name, icon, color)').eq('companion_id', companionId).order('importance_score', { ascending: false }).limit(limit) as unknown as Promise<{ data: (Memory & { memory_categories: MemoryCategoryRow })[] | null; error: Error | null }>,
    selectWithEmbedding: (companionId: string) => 
      supabase.from('memories').select('*').eq('companion_id', companionId).not('embedding', 'is', null) as unknown as Promise<{ data: Memory[] | null; error: Error | null }>,
    insert: (data: MemoryInsert) => supabase.from('memories').insert(data as never),
    update: (id: string, data: MemoryUpdate) => supabase.from('memories').update(data as never).eq('id', id),
  };
}

/**
 * Type-safe wrapper for memory_categories table queries
 */
export function memoryCategoriesTable(supabase: TypedSupabaseClient) {
  return {
    select: () => supabase.from('memory_categories').select('*') as unknown as Promise<{ data: MemoryCategoryRow[] | null; error: Error | null }>,
  };
}

/**
 * Type-safe wrapper for life_events table queries
 */
export function lifeEventsTable(supabase: TypedSupabaseClient) {
  return {
    selectByCompanion: (companionId: string, limit = 20) => 
      supabase.from('life_events').select('*').eq('companion_id', companionId).order('scheduled_at', { ascending: false }).limit(limit) as unknown as Promise<{ data: LifeEvent[] | null; error: Error | null }>,
    selectByCompanions: (companionIds: string[]) => 
      supabase.from('life_events').select('*, companions(id, name, avatar_url)').in('companion_id', companionIds) as unknown as Promise<{ data: (LifeEvent & { companions: Pick<Companion, 'id' | 'name' | 'avatar_url'> })[] | null; error: Error | null }>,
    insert: (data: LifeEventInsert) => supabase.from('life_events').insert(data as never),
  };
}

/**
 * Type-safe wrapper for activities table queries  
 */
export function activitiesTable(supabase: TypedSupabaseClient) {
  return {
    select: () => supabase.from('activities').select('*').eq('is_active', true) as unknown as Promise<{ data: Activity[] | null; error: Error | null }>,
    selectByTier: (tier: string) => supabase.from('activities').select('*').eq('is_active', true).eq('min_tier', tier) as unknown as Promise<{ data: Activity[] | null; error: Error | null }>,
  };
}

/**
 * Type-safe wrapper for activity_sessions table queries
 */
export function activitySessionsTable(supabase: TypedSupabaseClient) {
  return {
    insert: (data: ActivitySessionInsert) => supabase.from('activity_sessions').insert(data as never).select().single() as unknown as Promise<{ data: ActivitySession | null; error: Error | null }>,
    update: (id: string, data: Partial<ActivitySession>) => supabase.from('activity_sessions').update(data as never).eq('id', id),
  };
}

/**
 * Type-safe wrapper for crisis_logs table queries
 */
export function crisisLogsTable(supabase: TypedSupabaseClient) {
  return {
    insert: (data: CrisisLogInsert) => supabase.from('crisis_logs').insert(data as never),
    selectByUser: (userId: string) => supabase.from('crisis_logs').select('*').eq('user_id', userId) as unknown as Promise<{ data: CrisisLog[] | null; error: Error | null }>,
  };
}

/**
 * Type-safe wrapper for behavioral_detection_logs table queries
 */
export function behavioralDetectionLogsTable(supabase: TypedSupabaseClient) {
  return {
    insert: (data: BehavioralDetectionLogInsert) => supabase.from('behavioral_detection_logs').insert(data as never),
    selectByUser: (userId: string) => supabase.from('behavioral_detection_logs').select('*').eq('user_id', userId) as unknown as Promise<{ data: BehavioralDetectionLog[] | null; error: Error | null }>,
  };
}

/**
 * Type-safe wrapper for data_exports table queries
 */
export function dataExportsTable(supabase: TypedSupabaseClient) {
  return {
    insert: (data: DataExportInsert) => supabase.from('data_exports').insert(data as never).select().single() as unknown as Promise<{ data: DataExport | null; error: Error | null }>,
    selectByUser: (userId: string) => supabase.from('data_exports').select('*').eq('user_id', userId) as unknown as Promise<{ data: DataExport[] | null; error: Error | null }>,
  };
}

/**
 * Type-safe wrapper for audit_logs table queries
 */
export function auditLogsTable(supabase: TypedSupabaseClient) {
  return {
    insert: (data: AuditLogInsert) => supabase.from('audit_logs').insert(data as never),
    selectByUser: (userId: string, limit = 50) => supabase.from('audit_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit) as unknown as Promise<{ data: AuditLog[] | null; error: Error | null }>,
  };
}

/**
 * Type-safe wrapper for memory_access_log table queries
 */
export function memoryAccessLogTable(supabase: TypedSupabaseClient) {
  return {
    insert: (data: MemoryAccessLogInsert) => supabase.from('memory_access_log').insert(data as never),
  };
}

/**
 * Type-safe wrapper for relationship_milestones table queries
 */
export function relationshipMilestonesTable(supabase: TypedSupabaseClient) {
  return {
    selectByCompanion: (companionId: string) => supabase.from('relationship_milestones').select('*').eq('companion_id', companionId) as unknown as Promise<{ data: RelationshipMilestone[] | null; error: Error | null }>,
    insert: (data: RelationshipMilestoneInsert) => supabase.from('relationship_milestones').insert(data as never),
  };
}

/**
 * Type-safe wrapper for user_achievements table queries
 */
export function userAchievementsTable(supabase: TypedSupabaseClient) {
  return {
    selectByUser: (userId: string) => supabase.from('user_achievements').select('*').eq('user_id', userId) as unknown as Promise<{ data: UserAchievement[] | null; error: Error | null }>,
    insert: (data: UserAchievementInsert) => supabase.from('user_achievements').insert(data as never),
  };
}

// Re-export commonly used types for convenience
export type {
  Profile,
  ProfileInsert,
  ProfileUpdate,
  Companion,
  CompanionInsert,
  CompanionUpdate,
  CompanionDNA,
  CompanionDNAInsert,
  Conversation,
  ConversationInsert,
  ConversationUpdate,
  Message,
  MessageInsert,
  Memory,
  MemoryInsert,
  MemoryUpdate,
  MemoryCategoryRow,
  LifeEvent,
  LifeEventInsert,
  Activity,
  ActivitySession,
  ActivitySessionInsert,
  CrisisLog,
  CrisisLogInsert,
  BehavioralDetectionLog,
  BehavioralDetectionLogInsert,
  DataExport,
  DataExportInsert,
  AuditLog,
  AuditLogInsert,
  MemoryAccessLog,
  MemoryAccessLogInsert,
  RelationshipMilestone,
  RelationshipMilestoneInsert,
  UserAchievement,
  UserAchievementInsert,
};
