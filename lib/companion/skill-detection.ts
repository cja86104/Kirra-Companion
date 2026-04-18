/**
 * SKILL DETECTION SYSTEM
 * 
 * Automatically detects when users are teaching their companion new skills
 * through natural conversation. Extracts the skill content and categorizes it.
 * 
 * Detection triggers:
 * - "Let me teach you..."
 * - "Here's how to..."
 * - "My recipe for..."
 * - "Remember that..." (with instructional content)
 * - "The way I do X is..."
 * - "In my family, we..."
 */

import { createClient } from '@/lib/supabase/server';
import { generateSimpleCompletion } from '@/lib/ai/chat-client';
import type { CompanionSkillInsert, CompanionSkillUpdate, Json } from '@/types/database';

// ============================================================================
// LOCAL TYPES
// ============================================================================

type SkillCategory =
  | 'coding'
  | 'recipes'
  | 'domain'
  | 'traditions'
  | 'games'
  | 'creative'
  | 'language'
  | 'procedures'
  | 'trivia'
  | 'other';

interface TeachingDetection {
  is_teaching: boolean;
  confidence: number;
  detected_category: SkillCategory | null;
  detected_name: string | null;
  extracted_content: string | null;
  teaching_phrases: string[];
}

interface SkillUsageDetection {
  should_use_skills: boolean;
  relevant_topics: string[];
  suggested_skills: string[];
}

interface ExtractedSkill {
  skill_name: string;
  skill_category: SkillCategory;
  skill_description: string;
  skill_content: string;
  structured_data: Record<string, unknown>;
  tags: string[];
}

interface SkillRow {
  id: string;
  skill_name: string;
}

// ============================================================================
// TEACHING DETECTION PATTERNS
// ============================================================================

const TEACHING_PATTERNS: {
  pattern: RegExp;
  confidence: number;
  category?: SkillCategory;
}[] = [
  // Explicit teaching
  { pattern: /let me teach you (how to |about )?(.+)/i, confidence: 0.95 },
  { pattern: /i('ll| will) teach you (how to |about )?(.+)/i, confidence: 0.95 },
  { pattern: /i want to teach you (.+)/i, confidence: 0.9 },
  { pattern: /learn this:? (.+)/i, confidence: 0.85 },
  
  // Instructions/How-to
  { pattern: /here'?s how (to |you )(.+)/i, confidence: 0.9 },
  { pattern: /this is how (to |you |i )(.+)/i, confidence: 0.85 },
  { pattern: /the way (to |i |you )(.+)/i, confidence: 0.8 },
  { pattern: /to do this,? you (.+)/i, confidence: 0.75 },
  
  // Recipes
  { pattern: /my (secret |family |mom'?s |dad'?s |grandma'?s |nonna'?s )?recipe for (.+)/i, confidence: 0.95, category: 'recipes' },
  { pattern: /here'?s (my |the |a )?recipe:? (.+)/i, confidence: 0.9, category: 'recipes' },
  { pattern: /ingredients:?\s*\n/i, confidence: 0.85, category: 'recipes' },
  { pattern: /to (make|cook|bake|prepare) (.+),? (you |first |start )/i, confidence: 0.8, category: 'recipes' },
  
  // Coding
  { pattern: /in (python|javascript|typescript|java|c\+\+|rust|go),? (you |to |the )/i, confidence: 0.85, category: 'coding' },
  { pattern: /```(\w+)?\n/i, confidence: 0.8, category: 'coding' },
  { pattern: /the (code|syntax|function|method) (for|to) (.+)/i, confidence: 0.8, category: 'coding' },
  { pattern: /to (debug|fix|solve) this,? /i, confidence: 0.75, category: 'coding' },
  
  // Domain knowledge
  { pattern: /at (my |our )?(work|job|company),? (we |they |i )/i, confidence: 0.8, category: 'domain' },
  { pattern: /in (my |our )?(field|industry|profession),? /i, confidence: 0.8, category: 'domain' },
  { pattern: /the (term|concept|process) (.+) means/i, confidence: 0.75, category: 'domain' },
  
  // Traditions
  { pattern: /in (my |our )?(family|culture|tradition),? (we |they )/i, confidence: 0.85, category: 'traditions' },
  { pattern: /(every |each )?(year|christmas|holiday|birthday),? (we |my family )/i, confidence: 0.8, category: 'traditions' },
  { pattern: /our (family |) tradition (is |for )/i, confidence: 0.9, category: 'traditions' },
  
  // Games
  { pattern: /the rules (of|for) (.+) (are|is)/i, confidence: 0.85, category: 'games' },
  { pattern: /how to play (.+)/i, confidence: 0.8, category: 'games' },
  { pattern: /my (character|build|strategy) (is|in) (.+)/i, confidence: 0.75, category: 'games' },
  { pattern: /in (d&d|dnd|dungeons|pathfinder|the game),? /i, confidence: 0.8, category: 'games' },
  
  // Procedures
  { pattern: /step (1|one|first):? /i, confidence: 0.8, category: 'procedures' },
  { pattern: /first,? (you |we |i )(.+)\. (then|next|second)/i, confidence: 0.85, category: 'procedures' },
  { pattern: /my (routine|process|workflow|system) (for|is)/i, confidence: 0.8, category: 'procedures' },
  
  // Memory/Remember requests
  { pattern: /remember (that |this |how )?(.+)/i, confidence: 0.7 },
  { pattern: /don'?t forget (that |this )?(.+)/i, confidence: 0.7 },
  { pattern: /keep in mind (that )?(.+)/i, confidence: 0.65 },
  
  // General knowledge sharing
  { pattern: /did you know (that )?(.+)/i, confidence: 0.6, category: 'trivia' },
  { pattern: /fun fact:? (.+)/i, confidence: 0.65, category: 'trivia' },
  { pattern: /here'?s (something|a thing) (about|i know)/i, confidence: 0.6 },
];

// Minimum message length to consider for teaching detection
const MIN_TEACHING_LENGTH = 50;

// ============================================================================
// MAIN DETECTION FUNCTIONS
// ============================================================================

/**
 * Detect if a user message contains a teaching moment
 */
export function detectTeachingMoment(userMessage: string): TeachingDetection {
  const result: TeachingDetection = {
    is_teaching: false,
    confidence: 0,
    detected_category: null,
    detected_name: null,
    extracted_content: null,
    teaching_phrases: [],
  };

  // Skip short messages
  if (userMessage.length < MIN_TEACHING_LENGTH) {
    return result;
  }

  // Check against patterns
  let highestConfidence = 0;
  let detectedCategory: SkillCategory | null = null;
  const matchedPhrases: string[] = [];

  for (const { pattern, confidence, category } of TEACHING_PATTERNS) {
    const match = userMessage.match(pattern);
    if (match) {
      matchedPhrases.push(match[0]);
      if (confidence > highestConfidence) {
        highestConfidence = confidence;
        if (category) {
          detectedCategory = category;
        }
      }
    }
  }

  // Additional signals that boost confidence
  const hasListFormat = /(\n[-•*]\s|\n\d+[.)]\s)/m.test(userMessage);
  const hasCodeBlock = /```[\s\S]+```/.test(userMessage);
  const hasMultipleSteps = /(first|then|next|finally|step \d)/gi.test(userMessage);
  const hasIngredients = /ingredient|cup|tablespoon|teaspoon|oz|gram|pound/i.test(userMessage);
  
  if (hasListFormat) highestConfidence = Math.min(1, highestConfidence + 0.1);
  if (hasCodeBlock) {
    highestConfidence = Math.min(1, highestConfidence + 0.15);
    detectedCategory = detectedCategory || 'coding';
  }
  if (hasMultipleSteps) highestConfidence = Math.min(1, highestConfidence + 0.1);
  if (hasIngredients) {
    highestConfidence = Math.min(1, highestConfidence + 0.1);
    detectedCategory = detectedCategory || 'recipes';
  }

  // Threshold for detection
  if (highestConfidence >= 0.7) {
    result.is_teaching = true;
    result.confidence = highestConfidence;
    result.detected_category = detectedCategory;
    result.teaching_phrases = matchedPhrases;
    result.extracted_content = userMessage;
  }

  return result;
}

/**
 * Detect if a message might benefit from using stored skills
 */
export function detectSkillUsageNeed(userMessage: string): SkillUsageDetection {
  const result: SkillUsageDetection = {
    should_use_skills: false,
    relevant_topics: [],
    suggested_skills: [],
  };

  const lowerMessage = userMessage.toLowerCase();

  // Patterns that suggest skill usage
  const usagePatterns = [
    /how do (i|you|we) (make|cook|prepare|do) (.+)/i,
    /what('s| is| was) (my|our|the) (.+) (recipe|process|method)/i,
    /remind me (how|about|of) (.+)/i,
    /what did (i|we) (say|decide|agree) about (.+)/i,
    /can you (help|show|tell) me (.+)/i,
    /do you (remember|know) (how|about|my) (.+)/i,
    /what('s| is) the (code|syntax|command) for (.+)/i,
    /how (does|do) (i|we|you) (.+) (again|work)/i,
  ];

  for (const pattern of usagePatterns) {
    const match = lowerMessage.match(pattern);
    if (match) {
      result.should_use_skills = true;
      // Extract potential topic from the match
      const topic = match[match.length - 1] || match[2];
      if (topic && topic.length > 2) {
        result.relevant_topics.push(topic.trim());
      }
    }
  }

  // Extract nouns that might be skill names
  const potentialTopics = lowerMessage.match(/\b(?:my|our|the|your)\s+(\w+(?:\s+\w+)?)\b/gi);
  if (potentialTopics) {
    result.relevant_topics.push(...potentialTopics.map(t => t.replace(/^(my|our|the|your)\s+/i, '')));
  }

  // Deduplicate
  result.relevant_topics = [...new Set(result.relevant_topics)].slice(0, 5);

  return result;
}

// ============================================================================
// AI-POWERED EXTRACTION
// ============================================================================

/**
 * Use AI to extract skill details from a teaching message
 */
export async function extractSkillWithAI(
  userMessage: string,
  detection: TeachingDetection
): Promise<ExtractedSkill | null> {
  const systemPrompt = `You are a skill extraction assistant. Analyze the user's message and extract the skill/knowledge they are teaching.

Return a JSON object with this structure:
{
  "skill_name": "Short, descriptive name (2-5 words)",
  "skill_category": "One of: coding, recipes, domain, traditions, games, creative, language, procedures, trivia, other",
  "skill_description": "One sentence description",
  "skill_content": "The full knowledge/instructions being taught (preserve all details)",
  "structured_data": {
    "type": "recipe|coding|procedure|generic",
    // For recipes: include "ingredients" array and "steps" array
    // For coding: include "language" and "snippets" array
    // For procedures: include "steps" array
    // For generic: include "keyPoints" array
  },
  "tags": ["relevant", "tags", "for", "searching"]
}

Be thorough in extracting the skill_content - include all details, steps, ingredients, code, etc.
Return ONLY valid JSON, no other text.`;

  const userPrompt = `Extract the skill from this message:

"${userMessage}"

${detection.detected_category ? `Hint: This appears to be a ${detection.detected_category} skill.` : ''}`;

  try {
    const response = await generateSimpleCompletion(systemPrompt, userPrompt, {
      temperature: 0.2,
      maxTokens: 1500,
    });

    // Parse JSON from response
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('AI extraction did not return valid JSON');
      return null;
    }

    const extracted = JSON.parse(jsonMatch[0]) as ExtractedSkill;

    // Validate required fields
    if (!extracted.skill_name || !extracted.skill_content) {
      console.error('AI extraction missing required fields');
      return null;
    }

    // Ensure valid category
    const validCategories: SkillCategory[] = [
      'coding', 'recipes', 'domain', 'traditions', 'games',
      'creative', 'language', 'procedures', 'trivia', 'other'
    ];
    if (!validCategories.includes(extracted.skill_category)) {
      extracted.skill_category = detection.detected_category || 'other';
    }

    return extracted;
  } catch (error) {
    console.error('AI skill extraction failed:', error);
    return null;
  }
}

// ============================================================================
// MAIN PROCESSING FUNCTION
// ============================================================================

/**
 * Process a chat message for potential skill teaching
 * Called from the chat API after a message is sent
 */
export async function processSkillTeaching(
  companionId: string,
  userMessage: string,
  companionResponse: string
): Promise<{
  detected: boolean;
  saved: boolean;
  skill_name?: string;
  skill_id?: string;
  message?: string;
}> {
  // Suppress unused parameter warning
  void companionResponse;
  
  try {
    // Step 1: Detect teaching moment
    const detection = detectTeachingMoment(userMessage);

    if (!detection.is_teaching) {
      return { detected: false, saved: false };
    }

    console.log(`[Skills] Teaching detected with ${Math.round(detection.confidence * 100)}% confidence`);

    // Step 2: Extract skill details with AI
    const extracted = await extractSkillWithAI(userMessage, detection);

    if (!extracted) {
      console.log('[Skills] Could not extract skill details');
      return { 
        detected: true, 
        saved: false,
        message: 'Could not extract skill details',
      };
    }

    // Step 3: Check if skill already exists
    const supabase = await createClient();
    
    const { data: existingData } = await supabase
      .from('companion_skills')
      .select('id, skill_name')
      .eq('companion_id', companionId)
      .ilike('skill_name', extracted.skill_name)
      .single();

    const existing = existingData as SkillRow | null;

    if (existing) {
      // Update existing skill (reinforce). Promote skill_content / skill_description /
      // structured_data / tags / teaching_context to their top-level columns to match
      // the schema used by the manual-teaching route. Only `last_reinforced` lives in
      // metadata since there is no dedicated column for it.
      const { error: updateError } = await supabase
        .from('companion_skills')
        .update({
          times_used: 1,
          learned_from: 'chat_reinforcement',
          skill_content: extracted.skill_content,
          skill_description: extracted.skill_description,
          structured_data: extracted.structured_data as unknown as Json,
          tags: extracted.tags,
          teaching_context: userMessage.slice(0, 500),
          metadata: { last_reinforced: new Date().toISOString() } as unknown as Json,
        } satisfies CompanionSkillUpdate)
        .eq('id', existing.id);

      if (updateError) {
        console.error('[Skills] Failed to update existing skill:', updateError);
      }

      return {
        detected: true,
        saved: true,
        skill_name: existing.skill_name,
        skill_id: existing.id,
        message: `Updated existing skill: ${existing.skill_name}`,
      };
    }

    // Step 4: Save new skill. Fields are written to their top-level columns
    // (matching the manual-teaching route in app/api/companion/[id]/skills/route.ts).
    // proficiency_level is intentionally omitted: it is a generated column derived
    // from the proficiency enum, which has its own DB default of 'novice'.
    const skillInsert = {
      companion_id: companionId,
      skill_name: extracted.skill_name,
      skill_category: extracted.skill_category,
      skill_content: extracted.skill_content,
      skill_description: extracted.skill_description,
      structured_data: extracted.structured_data as unknown as Json,
      tags: extracted.tags,
      teaching_context: userMessage.slice(0, 500),
      times_used: 0,
      learned_from: 'chat',
    } satisfies CompanionSkillInsert;

    const { data: newSkillData, error: insertError } = await supabase
      .from('companion_skills')
      .insert(skillInsert)
      .select()
      .single();

    const newSkill = newSkillData as SkillRow | null;

    if (insertError || !newSkill) {
      console.error('[Skills] Failed to save new skill:', insertError);
      return {
        detected: true,
        saved: false,
        message: 'Failed to save skill',
      };
    }

    console.log(`[Skills] Saved new skill: ${extracted.skill_name}`);

    return {
      detected: true,
      saved: true,
      skill_name: extracted.skill_name,
      skill_id: newSkill.id,
      message: `Learned new skill: ${extracted.skill_name}`,
    };

  } catch (error) {
    console.error('[Skills] Processing error:', error);
    return {
      detected: false,
      saved: false,
      message: 'Processing error',
    };
  }
}

/**
 * Get skills for context injection into chat
 */
export async function getSkillsForContext(
  companionId: string,
  relevantTopics: string[],
  limit: number = 5
): Promise<Array<{ name: string; content: string; category: string }>> {
  if (relevantTopics.length === 0) {
    return [];
  }

  const supabase = await createClient();

  // Build OR query for topics
  const searchTerms = relevantTopics.map(t => `skill_name.ilike.%${t}%`).join(',');

  // Select skill_content as a top-level column. (Previously read from metadata
  // which was the wrong location — manual-teaching writes to the top-level
  // column, so the metadata read returned empty content for every skill.)
  const { data: skills, error } = await supabase
    .from('companion_skills')
    .select('skill_name, skill_category, skill_content')
    .eq('companion_id', companionId)
    .or(searchTerms)
    .limit(limit);

  if (error || !skills) {
    console.error('[Skills] Failed to fetch skills for context:', error);
    return [];
  }

  interface SkillContextResult {
    skill_name: string;
    skill_category: string;
    skill_content: string;
  }

  return (skills as SkillContextResult[]).map(s => {
    return {
      name: s.skill_name,
      content: s.skill_content,
      category: s.skill_category,
    };
  });
}

/**
 * Find relevant skills based on message content.
 * Used by chat route to inject skill context into responses.
 */
export async function findRelevantSkills(
  companionId: string,
  messageContent: string,
  limit: number = 5
): Promise<Array<{
  id: string;
  skill_name: string;
  skill_summary: string | null;
  skill_content: string;
  skill_category: string;
  proficiency: string;
}>> {
  const supabase = await createClient();

  // Extract keywords from message for search
  const words = messageContent.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3);

  if (words.length === 0) {
    return [];
  }

  // Search for skills matching keywords
  const searchTerms = words.slice(0, 5).map(w => `skill_name.ilike.%${w}%`).join(',');

  // Select skill_content / skill_summary as top-level columns. (Previously read
  // from metadata which was the wrong location — manual-teaching writes to the
  // top-level columns, so the metadata reads returned empty for every skill.)
  const { data: skills, error } = await supabase
    .from('companion_skills')
    .select('id, skill_name, skill_category, skill_content, skill_summary, proficiency_level')
    .eq('companion_id', companionId)
    .or(searchTerms)
    .order('times_used', { ascending: false })
    .limit(limit);

  if (error || !skills) {
    return [];
  }

  // Map proficiency level to string
  const proficiencyMap: Record<number, string> = {
    1: 'novice',
    2: 'familiar',
    3: 'competent',
    4: 'proficient',
    5: 'expert',
  };

  interface SkillQueryResult {
    id: string;
    skill_name: string;
    skill_category: string;
    skill_content: string;
    skill_summary: string | null;
    proficiency_level: number | null;
  }

  return (skills as SkillQueryResult[]).map(s => {
    return {
      id: s.id,
      skill_name: s.skill_name,
      skill_summary: s.skill_summary,
      skill_content: s.skill_content,
      skill_category: s.skill_category,
      proficiency: proficiencyMap[s.proficiency_level ?? 1] || 'novice',
    };
  });
}
