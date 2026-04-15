#!/usr/bin/env node

/**
 * KIRRA COMPANION - Database Type Regeneration Script
 *
 * Usage:
 *   node scripts/regenerate-types.js
 *   npm run db:generate:full
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TYPES_FILE   = path.join(__dirname, '..', 'types', 'database.ts');
const BACKUP_FILE  = path.join(__dirname, '..', 'types', 'database.backup.ts');

// =============================================================================
// CUSTOM TYPES - appended after Supabase-generated base types
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

export type Profile              = Tables<'profiles'>;
export type Companion            = Tables<'companions'>;
export type CompanionDNA         = Tables<'companion_dna'>;
export type Conversation         = Tables<'conversations'>;
export type Message              = Tables<'messages'>;
export type Memory               = Tables<'memories'>;
export type LifeEvent            = Tables<'life_events'>;
export type CompanionSkill       = Tables<'companion_skills'>;
export type ProactiveMessage     = Tables<'proactive_messages'>;

// =============================================================================
// INSERT TYPES
// =============================================================================

export type ProfileInsert          = InsertTables<'profiles'>;
export type CompanionInsert        = InsertTables<'companions'>;
export type CompanionDNAInsert     = InsertTables<'companion_dna'>;
export type ConversationInsert     = InsertTables<'conversations'>;
export type MessageInsert          = InsertTables<'messages'>;
export type MemoryInsert           = InsertTables<'memories'>;
export type LifeEventInsert        = InsertTables<'life_events'>;
export type CompanionSkillInsert   = InsertTables<'companion_skills'>;
export type ProactiveMessageInsert = InsertTables<'proactive_messages'>;

// =============================================================================
// UPDATE TYPES
// =============================================================================

export type ProfileUpdate          = UpdateTables<'profiles'>;
export type CompanionUpdate        = UpdateTables<'companions'>;
export type CompanionDNAUpdate     = UpdateTables<'companion_dna'>;
export type ConversationUpdate     = UpdateTables<'conversations'>;
export type MessageUpdate          = UpdateTables<'messages'>;
export type MemoryUpdate           = UpdateTables<'memories'>;
export type CompanionSkillUpdate   = UpdateTables<'companion_skills'>;
export type ProactiveMessageUpdate = UpdateTables<'proactive_messages'>;

// =============================================================================
// PLACEHOLDER TYPES FOR TABLES NOT YET IN GENERATED SCHEMA
// Comment out any that now exist above after regeneration
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
export type ActivitySessionInsert = Partial<ActivitySession> & {
  activity_id: string;
  companion_id: string;
  user_id: string;
};

export interface DataExport {
  id: string;
  user_id: string;
  status: string;
  file_url: string | null;
  export_type: string | null;
  requested_at?: string;
  completed_at: string | null;
  expires_at: string | null;
  created_at?: string;
}
export type DataExportInsert = Partial<DataExport> & { user_id: string };

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  details: Json | null;
  created_at: string;
}
export type AuditLogInsert = Partial<AuditLog> & { user_id: string; action: string };

export interface MemoryAccessLog {
  id: string;
  memory_id: string;
  accessed_by: string;
  access_type: string;
  created_at: string;
}
export type MemoryAccessLogInsert = Partial<MemoryAccessLog> & {
  memory_id: string;
  accessed_by: string;
  access_type: string;
};

export interface RelationshipMilestone {
  id: string;
  companion_id: string;
  milestone_type: string;
  title: string;
  description: string | null;
  achieved_at: string;
  metadata: Json | null;
}
export type RelationshipMilestoneInsert = Partial<RelationshipMilestone> & {
  companion_id: string;
  milestone_type: string;
  title: string;
};

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_type: string;
  title: string;
  description: string | null;
  unlocked_at: string;
  metadata: Json | null;
}
export type UserAchievementInsert = Partial<UserAchievement> & {
  user_id: string;
  achievement_type: string;
  title: string;
};

// =============================================================================
// CUSTOM APPLICATION TYPES
// =============================================================================

export type EmotionType =
  | 'happy' | 'sad' | 'excited' | 'calm' | 'curious'
  | 'loving' | 'playful' | 'thoughtful' | 'neutral'
  | 'anxious' | 'proud' | 'grateful';

export interface MoodState {
  primary: EmotionType;
  secondary?: EmotionType | null;
  intensity: number;
  lastUpdated?: string | null;
}

export interface VoiceConfig {
  provider: 'elevenlabs' | 'openai';
  voiceId: string | null;
  stability: number;
  similarityBoost: number;
  style: number;
  speakingRate: number;
}

export interface CompanionWithDNA extends Companion {
  companion_dna: CompanionDNA | null;
}

export type EventType =
  | 'discovery' | 'achievement' | 'relationship' | 'mood_shift'
  | 'growth' | 'memory' | 'skill_learned' | 'interest_developed'
  | 'milestone' | 'daily_reflection';

export interface MemoryWithCategory extends Memory {
  category?: string;
}

export interface CommunicationDialect {
  uniquePhrases?: string[];
  favoriteExpressions?: string[];
  speechPatterns?: string[];
  vocabularyLevel?: string;
  formalityPreference?: number;
}
`;

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('Kirra Companion - Database Type Regeneration\n');

  // 1. Check for access token
  console.log('1. Checking for SUPABASE_ACCESS_TOKEN...');
  if (!process.env.SUPABASE_ACCESS_TOKEN) {
    console.error('   ERROR: SUPABASE_ACCESS_TOKEN env var is not set.');
    console.error('   Get your token from: https://supabase.com/dashboard/account/tokens');
    console.error('   Then run: $env:SUPABASE_ACCESS_TOKEN="your-token"\n');
    process.exit(1);
  }
  console.log('   OK\n');

  // 2. Backup existing types
  console.log('2. Backing up current types...');
  if (fs.existsSync(TYPES_FILE)) {
    fs.copyFileSync(TYPES_FILE, BACKUP_FILE);
    console.log('   Backup saved to types/database.backup.ts\n');
  } else {
    console.log('   No existing types file found\n');
  }

  // 3. Generate new types from Supabase
  console.log('3. Generating types from Supabase...');
  let generated;
  try {
    const https = require('https');

    generated = await new Promise((resolve, reject) => {
      const url = 'https://api.supabase.com/v1/projects/znfoftmeggrkpxxvtqey/types/typescript';
      const options = {
        headers: {
          'Authorization': 'Bearer ' + process.env.SUPABASE_ACCESS_TOKEN,
        },
      };

      https.get(url, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(new Error('HTTP ' + res.statusCode + ': ' + data));
          } else {
            try {
              const parsed = JSON.parse(data);
              resolve(parsed.types || data);
            } catch {
              resolve(data);
            }
          }
        });
      }).on('error', reject);
    });

    console.log('   Types generated\n');
  } catch (error) {
    console.error('   ERROR: Failed to generate types.\n');
    if (error.stdout) console.error('stdout:', error.stdout.toString());
    if (error.stderr) console.error('stderr:', error.stderr.toString());
    if (error.message) console.error('message:', error.message);
    if (fs.existsSync(BACKUP_FILE)) {
      fs.copyFileSync(BACKUP_FILE, TYPES_FILE);
      console.log('   Restored from backup\n');
    }
    process.exit(1);
  }

  // 4. Combine and write
  console.log('4. Appending custom type definitions...');
  const finalContent = generated + CUSTOM_TYPES;
  fs.writeFileSync(TYPES_FILE, finalContent);

  const lineCount = finalContent.split('\n').length;
  console.log('   Done. types/database.ts now has ' + lineCount + ' lines\n');

  console.log('Next steps:');
  console.log('  npx tsc --noEmit');
  console.log('  Review any remaining type errors');
  console.log('  Delete types/database.backup.ts when satisfied\n');
}

main().catch(err => { console.error(err); process.exit(1); });
