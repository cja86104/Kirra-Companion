#!/usr/bin/env node

/**
 * KIRRA COMPANION - Database Type Regeneration Script
 * 
 * This script regenerates types/database.ts from your Supabase schema
 * while preserving your custom type definitions.
 * 
 * Usage:
 *   node scripts/regenerate-types.js
 * 
 * Prerequisites:
 *   - Supabase CLI installed: npm install -g supabase
 *   - Logged in: supabase login
 *   - Project linked: supabase link --project-ref YOUR_PROJECT_REF
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TYPES_FILE = path.join(__dirname, '..', 'types', 'database.ts');
const BACKUP_FILE = path.join(__dirname, '..', 'types', 'database.backup.ts');

// =============================================================================
// CUSTOM TYPES TO PRESERVE
// These get appended after Supabase generates the base types
// =============================================================================

const CUSTOM_TYPES = `
// =============================================================================
// HELPER TYPES
// =============================================================================

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

// =============================================================================
// CONVENIENCE EXPORTS - ROW TYPES
// =============================================================================

export type Profile = Tables<'profiles'>;
export type Companion = Tables<'companions'>;
export type CompanionDNA = Tables<'companion_dna'>;
export type Conversation = Tables<'conversations'>;
export type Message = Tables<'messages'>;
export type Memory = Tables<'memories'>;
export type LifeEvent = Tables<'life_events'>;
export type CompanionSkill = Tables<'companion_skills'>;
export type ProactiveMessage = Tables<'proactive_messages'>;

// =============================================================================
// INSERT TYPES
// =============================================================================

export type ProfileInsert = InsertTables<'profiles'>;
export type CompanionInsert = InsertTables<'companions'>;
export type CompanionDNAInsert = InsertTables<'companion_dna'>;
export type ConversationInsert = InsertTables<'conversations'>;
export type MessageInsert = InsertTables<'messages'>;
export type MemoryInsert = InsertTables<'memories'>;
export type LifeEventInsert = InsertTables<'life_events'>;
export type CompanionSkillInsert = InsertTables<'companion_skills'>;
export type ProactiveMessageInsert = InsertTables<'proactive_messages'>;

// =============================================================================
// UPDATE TYPES
// =============================================================================

export type ProfileUpdate = UpdateTables<'profiles'>;
export type CompanionUpdate = UpdateTables<'companions'>;
export type CompanionDNAUpdate = UpdateTables<'companion_dna'>;
export type ConversationUpdate = UpdateTables<'conversations'>;
export type MessageUpdate = UpdateTables<'messages'>;
export type MemoryUpdate = UpdateTables<'memories'>;
export type CompanionSkillUpdate = UpdateTables<'companion_skills'>;
export type ProactiveMessageUpdate = UpdateTables<'proactive_messages'>;

// =============================================================================
// PLACEHOLDER TYPES FOR OPTIONAL TABLES
// Comment out any that now exist in your schema above
// =============================================================================

export interface MemoryCategoryRow {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  description: string | null;
  created_at: string;
}

export interface Activity {
  id: string;
  name: string;
  description: string | null;
  activity_type: string;
  min_tier: string;
  is_active: boolean;
  config: Json | null;
  created_at: string;
}

export interface ActivitySession {
  id: string;
  activity_id: string;
  companion_id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  score: number | null;
  metadata: Json | null;
}
export type ActivitySessionInsert = Partial<ActivitySession> & { activity_id: string; companion_id: string; user_id: string };

export interface CrisisLog {
  id: string;
  user_id: string;
  companion_id: string | null;
  severity: string;
  detected_content: string;
  action_taken: string;
  created_at: string;
}
export type CrisisLogInsert = Partial<CrisisLog> & { user_id: string; severity: string; detected_content: string; action_taken: string };

export interface BehavioralDetectionLog {
  id: string;
  user_id: string;
  detection_type: string;
  confidence: number;
  metadata: Json | null;
  created_at: string;
}
export type BehavioralDetectionLogInsert = Partial<BehavioralDetectionLog> & { user_id: string; detection_type: string; confidence: number };

export interface DataExport {
  id: string;
  user_id: string;
  status: string;
  file_url: string | null;
  requested_at: string;
  completed_at: string | null;
  expires_at: string | null;
}
export type DataExportInsert = Partial<DataExport> & { user_id: string };

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  metadata: Json | null;
  ip_address: string | null;
  created_at: string;
}
export type AuditLogInsert = Partial<AuditLog> & { user_id: string; action: string; resource_type: string };

export interface MemoryAccessLog {
  id: string;
  memory_id: string;
  accessed_by: string;
  access_type: string;
  created_at: string;
}
export type MemoryAccessLogInsert = Partial<MemoryAccessLog> & { memory_id: string; accessed_by: string; access_type: string };

export interface RelationshipMilestone {
  id: string;
  companion_id: string;
  milestone_type: string;
  title: string;
  description: string | null;
  achieved_at: string;
  metadata: Json | null;
}
export type RelationshipMilestoneInsert = Partial<RelationshipMilestone> & { companion_id: string; milestone_type: string; title: string };

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_type: string;
  title: string;
  description: string | null;
  unlocked_at: string;
  metadata: Json | null;
}
export type UserAchievementInsert = Partial<UserAchievement> & { user_id: string; achievement_type: string; title: string };

// =============================================================================
// CUSTOM APPLICATION TYPES
// =============================================================================

// Emotion types
export type EmotionType =
  | 'happy'
  | 'sad'
  | 'excited'
  | 'calm'
  | 'curious'
  | 'loving'
  | 'playful'
  | 'thoughtful'
  | 'neutral'
  | 'anxious'
  | 'proud'
  | 'grateful';

// Mood state interface
export interface MoodState {
  primary: EmotionType;
  secondary?: EmotionType | null;
  intensity: number;
  lastUpdated?: string | null;
}

// Voice configuration
export interface VoiceConfig {
  provider: 'elevenlabs' | 'openai';
  voiceId: string | null;
  stability: number;
  similarityBoost: number;
  style: number;
  speakingRate: number;
}

// Companion with DNA joined
export interface CompanionWithDNA extends Companion {
  companion_dna: CompanionDNA | null;
}

// Event type for life events
export type EventType = 
  | 'discovery'
  | 'achievement'
  | 'relationship'
  | 'mood_shift'
  | 'growth'
  | 'memory'
  | 'skill_learned'
  | 'interest_developed'
  | 'milestone'
  | 'daily_reflection';

// Memory with category
export interface MemoryWithCategory extends Memory {
  category?: string;
}

// Communication dialect structure
export interface CommunicationDialect {
  uniquePhrases?: string[];
  favoriteExpressions?: string[];
  speechPatterns?: string[];
  vocabularyLevel?: string;
  formalityPreference?: number;
}
`;

// =============================================================================
// MAIN SCRIPT
// =============================================================================

async function main() {
  console.log('🔄 Kirra Companion - Database Type Regeneration\\n');

  // Step 1: Check if supabase CLI is available
  console.log('1️⃣  Checking Supabase CLI...');
  try {
    execSync('supabase --version', { stdio: 'pipe' });
    console.log('   ✅ Supabase CLI found\\n');
  } catch {
    console.error('   ❌ Supabase CLI not found!');
    console.error('   Run: npm install -g supabase');
    console.error('   Then: supabase login');
    console.error('   Then: supabase link --project-ref YOUR_PROJECT_REF\\n');
    process.exit(1);
  }

  // Step 2: Backup existing types
  console.log('2️⃣  Backing up current types...');
  if (fs.existsSync(TYPES_FILE)) {
    fs.copyFileSync(TYPES_FILE, BACKUP_FILE);
    console.log(\`   ✅ Backup saved to types/database.backup.ts\\n\`);
  } else {
    console.log('   ⚠️  No existing types file found\\n');
  }

  // Step 3: Generate new types from Supabase
  console.log('3️⃣  Generating types from Supabase...');
  try {
    const generated = execSync('supabase gen types typescript --linked', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    // Step 4: Combine generated types with custom types
    console.log('   ✅ Types generated\\n');
    
    console.log('4️⃣  Adding custom type definitions...');
    const finalContent = generated + CUSTOM_TYPES;
    
    fs.writeFileSync(TYPES_FILE, finalContent);
    console.log('   ✅ Custom types appended\\n');
    
    // Step 5: Count the result
    const lineCount = finalContent.split('\\n').length;
    console.log(\`5️⃣  Done! types/database.ts now has \${lineCount} lines\\n\`);
    
    console.log('📋 Next steps:');
    console.log('   1. Run: npx tsc --noEmit');
    console.log('   2. Check for any new type errors');
    console.log('   3. Remove unnecessary "as any" casts');
    console.log('   4. Delete types/database.backup.ts when satisfied\\n');
    
  } catch (error) {
    console.error('   ❌ Failed to generate types!');
    console.error('   Make sure you have linked your project:');
    console.error('   supabase link --project-ref YOUR_PROJECT_REF\\n');
    
    if (error.stderr) {
      console.error('Error details:', error.stderr.toString());
    }
    
    // Restore backup
    if (fs.existsSync(BACKUP_FILE)) {
      fs.copyFileSync(BACKUP_FILE, TYPES_FILE);
      console.log('   🔄 Restored from backup\\n');
    }
    
    process.exit(1);
  }
}

main();
