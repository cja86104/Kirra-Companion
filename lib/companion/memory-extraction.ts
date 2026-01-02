/**
 * KIRRA COMPANION - MEMORY EXTRACTION
 * 
 * Automatically extracts memorable information from chat conversations.
 * Creates memories when user shares personal details, preferences, etc.
 */

import { createClient } from '@/lib/supabase/server';

// ============================================================
// TYPES
// ============================================================

interface ExtractedMemory {
  title: string;
  content: string;
  category: 'personal' | 'preferences' | 'relationships' | 'experiences' | 'goals' | 'emotions';
  importance: number; // 0-1
}

interface ChatContext {
  companionId: string;
  userMessage: string;
  companionResponse: string;
}

// ============================================================
// EXTRACTION PATTERNS
// ============================================================

const EXTRACTION_PATTERNS: {
  pattern: RegExp;
  category: ExtractedMemory['category'];
  importance: number;
  titleTemplate: string;
}[] = [
  // Personal facts
  { pattern: /my name is (\w+)/i, category: 'personal', importance: 0.9, titleTemplate: 'User\'s name' },
  { pattern: /i('m| am) (\d+) years old/i, category: 'personal', importance: 0.8, titleTemplate: 'User\'s age' },
  { pattern: /i (work as|am a|work at) (.+?)(\.|,|$)/i, category: 'personal', importance: 0.7, titleTemplate: 'User\'s job' },
  { pattern: /i live in (.+?)(\.|,|$)/i, category: 'personal', importance: 0.7, titleTemplate: 'User\'s location' },
  { pattern: /i('m| am) from (.+?)(\.|,|$)/i, category: 'personal', importance: 0.6, titleTemplate: 'User\'s origin' },
  
  // Preferences
  { pattern: /my favorite (.+?) is (.+?)(\.|,|$)/i, category: 'preferences', importance: 0.7, titleTemplate: 'Favorite $1' },
  { pattern: /i (love|really like|adore) (.+?)(\.|,|$)/i, category: 'preferences', importance: 0.6, titleTemplate: 'User loves $2' },
  { pattern: /i (hate|can't stand|dislike) (.+?)(\.|,|$)/i, category: 'preferences', importance: 0.6, titleTemplate: 'User dislikes $2' },
  { pattern: /i prefer (.+?) (over|to) (.+?)(\.|,|$)/i, category: 'preferences', importance: 0.5, titleTemplate: 'Preference: $1' },
  
  // Relationships
  { pattern: /my (wife|husband|partner|girlfriend|boyfriend)('s name is|,) (\w+)/i, category: 'relationships', importance: 0.9, titleTemplate: 'User\'s partner' },
  { pattern: /i have (\d+|a|an) (kid|child|son|daughter|children)/i, category: 'relationships', importance: 0.9, titleTemplate: 'User\'s children' },
  { pattern: /my (mom|dad|mother|father|brother|sister)('s name is|,)? (\w+)?/i, category: 'relationships', importance: 0.7, titleTemplate: 'User\'s family' },
  { pattern: /i have a (dog|cat|pet) (named|called) (\w+)/i, category: 'relationships', importance: 0.7, titleTemplate: 'User\'s pet' },
  { pattern: /my best friend('s name is|,)? (\w+)?/i, category: 'relationships', importance: 0.6, titleTemplate: 'User\'s best friend' },
  
  // Goals and dreams
  { pattern: /i want to (.+?)(\.|,|$)/i, category: 'goals', importance: 0.5, titleTemplate: 'User\'s goal' },
  { pattern: /my dream is to (.+?)(\.|,|$)/i, category: 'goals', importance: 0.7, titleTemplate: 'User\'s dream' },
  { pattern: /i('m| am) hoping to (.+?)(\.|,|$)/i, category: 'goals', importance: 0.5, titleTemplate: 'User\'s hope' },
  { pattern: /i('m| am) planning to (.+?)(\.|,|$)/i, category: 'goals', importance: 0.5, titleTemplate: 'User\'s plan' },
  
  // Experiences
  { pattern: /i (just|recently) (.+?)(\.|,|$)/i, category: 'experiences', importance: 0.4, titleTemplate: 'Recent experience' },
  { pattern: /when i was (young|a kid|little|growing up)/i, category: 'experiences', importance: 0.5, titleTemplate: 'Childhood memory' },
  { pattern: /i remember when (.+?)(\.|,|$)/i, category: 'experiences', importance: 0.5, titleTemplate: 'User\'s memory' },
  
  // Emotions
  { pattern: /i('m| am) (feeling|so) (happy|sad|excited|anxious|stressed|worried)/i, category: 'emotions', importance: 0.4, titleTemplate: 'User\'s feeling' },
  { pattern: /i('ve| have) been (feeling|going through) (.+?)(\.|,|$)/i, category: 'emotions', importance: 0.5, titleTemplate: 'User\'s emotional state' },
];

// ============================================================
// MAIN EXTRACTION FUNCTION
// ============================================================

/**
 * Analyze user message and extract memorable information.
 * Returns extracted memories or empty array if nothing memorable.
 */
export function extractMemoriesFromMessage(userMessage: string): ExtractedMemory[] {
  const memories: ExtractedMemory[] = [];
  const lowerMessage = userMessage.toLowerCase();
  
  for (const { pattern, category, importance, titleTemplate } of EXTRACTION_PATTERNS) {
    const match = userMessage.match(pattern);
    if (match) {
      // Build title from template
      let title = titleTemplate;
      match.forEach((m, i) => {
        if (i > 0 && m) {
          title = title.replace(`$${i}`, m.trim());
        }
      });
      
      // Clean up title
      title = title.replace(/\$\d/g, '').trim();
      if (title.length > 50) {
        title = title.substring(0, 47) + '...';
      }
      
      // Get relevant sentence as content
      const sentences = userMessage.split(/[.!?]+/);
      const relevantSentence = sentences.find(s => pattern.test(s)) || userMessage;
      
      memories.push({
        title,
        content: relevantSentence.trim(),
        category,
        importance,
      });
      
      // Limit to 2 memories per message to avoid spam
      if (memories.length >= 2) break;
    }
  }
  
  return memories;
}

// ============================================================
// SAVE MEMORIES TO DATABASE
// ============================================================

// Category name mapping
const CATEGORY_NAME_MAP: Record<string, string> = {
  'personal': 'Personal Facts',
  'preferences': 'Preferences',
  'relationships': 'Relationships',
  'experiences': 'Experiences',
  'goals': 'Goals & Dreams',
  'emotions': 'Emotional',
};

/**
 * Save extracted memories to database.
 * Checks for duplicates before saving.
 */
export async function saveExtractedMemories(
  companionId: string,
  memories: ExtractedMemory[]
): Promise<number> {
  if (memories.length === 0) return 0;
  
  const supabase = await createClient();
  let savedCount = 0;
  
  // Pre-fetch all category UUIDs
  const { data: categories } = await supabase
    .from('memory_categories')
    .select('id, name');
  
  const categoryMap = new Map<string, string>();
  if (categories) {
    for (const cat of categories as { id: string; name: string }[]) {
      categoryMap.set(cat.name, cat.id);
    }
  }
  
  for (const memory of memories) {
    try {
      // Check for similar existing memory (avoid duplicates)
      const { data: existing } = await supabase
        .from('memories')
        .select('id')
        .eq('companion_id', companionId)
        .ilike('content', `%${memory.content.substring(0, 50)}%`)
        .limit(1);
      
      if (existing && existing.length > 0) {
        console.log(`Skipping duplicate memory: ${memory.title}`);
        continue;
      }
      
      // Look up category UUID
      const categoryName = CATEGORY_NAME_MAP[memory.category] || memory.category;
      const categoryId = categoryMap.get(categoryName) || null;
      
      // Save new memory
      const { error } = await supabase
        .from('memories')
        .insert({
          companion_id: companionId,
          title: memory.title,
          content: memory.content,
          category_id: categoryId,
          importance_score: memory.importance,
          source_type: 'conversation',
          is_verified: false,
        } as never);
      
      if (error) {
        console.error('Error saving memory:', error);
      } else {
        savedCount++;
        console.log(`Memory saved: ${memory.title}`);
      }
    } catch (error) {
      console.error('Exception saving memory:', error);
    }
  }
  
  return savedCount;
}

// ============================================================
// COMBINED: Process Chat for Memories
// ============================================================

/**
 * Main entry point: Process chat message and save any extracted memories.
 * Call this after each user message.
 */
export async function processMemoriesFromChat(
  companionId: string,
  userMessage: string
): Promise<number> {
  // Extract memories from message
  const memories = extractMemoriesFromMessage(userMessage);
  
  if (memories.length === 0) {
    return 0;
  }
  
  // Save to database
  const savedCount = await saveExtractedMemories(companionId, memories);
  
  return savedCount;
}
