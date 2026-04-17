/**
 * DNA EVOLUTION ENGINE
 * 
 * This is the heart of what makes each companion unique over time.
 * Analyzes conversations and evolves the companion's DNA:
 * - Communication Dialect: Unique phrases, expressions, speech patterns
 * - Humor Genome: What comedy styles resonate, timing preferences
 * - Learning Style Matrix: How they process and explain information
 * - Emotional Resonance Map: How they react to different situations
 * - Memory Weighting: What THEY find important to remember
 * 
 * Result: Two identical companions become completely different after 30 days
 */

import { createClient as createAdminClient } from '@supabase/supabase-js';
import { generateSimpleCompletion } from '@/lib/ai/chat-client';
import type { CompanionDNA } from '@/types/database';

/**
 * Get an admin Supabase client for background processes.
 * DNA evolution runs as a fire-and-forget background task from the chat route,
 * outside a proper user session context. The user-scoped client returns nothing
 * due to RLS. Admin client bypasses RLS safely for this trusted internal process.
 */
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase admin credentials');
  return createAdminClient(url, key);
}

// ============================================================================
// LOCAL TYPE DEFINITIONS
// ============================================================================

/**
 * Extended dialect structure used internally by the evolution engine
 */
interface ExtendedCommunicationDialect {
  uniquePhrases: string[];
  favoriteExpressions: string[];
  speechPatterns: string[];
  vocabularyLevel: string;
  formalityLevel: number;
  sentenceComplexity: number;
  emojiUsage: number;
  avoidedWords: string[];
}

/**
 * Message row from database
 */
interface MessageRow {
  role: string;
  content: string;
  created_at: string;
}

/**
 * Companion with DNA join result
 */
interface CompanionWithDNAJoin {
  name: string;
  companion_dna: CompanionDNA[] | null;
}

// ============================================================================
// TYPES
// ============================================================================

export interface EvolutionAnalysis {
  companionId: string;
  messagesAnalyzed: number;
  dialectEvolution: DialectEvolution | null;
  humorEvolution: HumorEvolution | null;
  emotionalEvolution: EmotionalEvolution | null;
  learningEvolution: LearningEvolution | null;
  memoryEvolution: MemoryEvolution | null;
  aiAnalysisUsed: boolean;
  timestamp: string;
}

export interface DialectEvolution {
  newPhrases: string[];
  reinforcedPhrases: string[];
  speechPatternChanges: string[];
  formalityShift: number;
  emojiUsageShift: number;
}

export interface HumorEvolution {
  successfulStyles: string[];
  failedStyles: string[];
  timingPreferences: Record<string, number>;
  topicPreferences: string[];
}

export interface EmotionalEvolution {
  triggerUpdates: Record<string, string[]>;
  expressionStyleChanges: string[];
  stabilityShift: number;
}

export interface LearningEvolution {
  preferredExplanationStyles: string[];
  informationDepthPreference: number;
  analogyUsagePreference: number;
  stepByStepPreference: number;
}

export interface MemoryEvolution {
  topicWeights: Record<string, number>;
  emotionalMemoryBias: number;
  recentVsOldBias: number;
  userPreferencePriority: number;
}

// AI Analysis result type
export interface AIAnalysisResult {
  uniquePhrases: string[];
  signatureOpenings: string[];
  signatureClosings: string[];
  humorStyles: {
    style: string;
    effectiveness: 'high' | 'medium' | 'low';
  }[];
  emotionalTendencies: string[];
  explanationStyle: {
    usesAnalogies: boolean;
    usesStepByStep: boolean;
    detailLevel: 'brief' | 'moderate' | 'detailed';
    usesExamples: boolean;
  };
  communicationQuirks: string[];
  topicsOfInterest: string[];
}

// ============================================================================
// AI-POWERED ANALYSIS
// ============================================================================

/**
 * Use AI to analyze companion messages and extract unique characteristics
 * This is smarter than regex - it understands context and meaning
 */
async function analyzeConversationsWithAI(
  companionMessages: string[],
  userMessages: string[],
  companionName: string
): Promise<AIAnalysisResult | null> {
  // Need enough messages for meaningful analysis
  if (companionMessages.length < 5) {
    return null;
  }

  // Sample messages (don't send too many to avoid token limits)
  const sampleSize = Math.min(30, companionMessages.length);
  const sampledCompanion = companionMessages.slice(-sampleSize);
  const sampledUser = userMessages.slice(-sampleSize);

  // Build conversation context
  const conversationSample = sampledCompanion
    .map((msg, i) => `${companionName}: ${msg}${sampledUser[i] ? `\nUser: ${sampledUser[i]}` : ''}`)
    .join('\n---\n')
    .slice(0, 8000); // Limit tokens

  const systemPrompt = `You are an AI personality analyst. Analyze the following conversation samples from an AI companion named "${companionName}" and extract their unique communication patterns.

Return your analysis as valid JSON with this exact structure:
{
  "uniquePhrases": ["phrase1", "phrase2"],
  "signatureOpenings": ["oh wow", "well actually"],
  "signatureClosings": ["you know?", "just saying"],
  "humorStyles": [{"style": "wordplay", "effectiveness": "high"}],
  "emotionalTendencies": ["empathetic", "playful"],
  "explanationStyle": {
    "usesAnalogies": true,
    "usesStepByStep": false,
    "detailLevel": "moderate",
    "usesExamples": true
  },
  "communicationQuirks": ["uses ellipses often", "asks rhetorical questions"],
  "topicsOfInterest": ["music", "cooking"]
}

Rules:
- uniquePhrases: Extract 3-8 word phrases the companion uses repeatedly or distinctively
- signatureOpenings: How they typically start messages
- signatureClosings: How they typically end messages
- humorStyles: Types of humor used (wordplay, sarcasm, self-deprecating, observational, absurdist)
- emotionalTendencies: Their dominant emotional expressions
- communicationQuirks: Unique patterns in how they write
- topicsOfInterest: Subjects they seem passionate about

Be specific and extract actual phrases from the text, not generic descriptions.
Return ONLY valid JSON, no other text.`;

  const userPrompt = `Analyze these conversation samples:\n\n${conversationSample}`;

  try {
    const response = await generateSimpleCompletion(systemPrompt, userPrompt, {
      temperature: 0.3, // Low temperature for consistent JSON
      maxTokens: 1000,
    });

    // Parse the JSON response
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('AI analysis did not return valid JSON');
      return null;
    }

    const analysis = JSON.parse(jsonMatch[0]) as AIAnalysisResult;
    
    // Validate structure
    if (!analysis.uniquePhrases || !Array.isArray(analysis.uniquePhrases)) {
      console.error('AI analysis missing required fields');
      return null;
    }

    return analysis;
  } catch (error) {
    console.error('AI analysis failed:', error);
    return null;
  }
}

/**
 * Analyze humor effectiveness by looking at user reactions after jokes
 */
async function analyzeHumorWithAI(
  companionMessages: string[],
  userMessages: string[]
): Promise<{
  successfulStyles: string[];
  failedStyles: string[];
} | null> {
  if (companionMessages.length < 10) {
    return null;
  }

  // Build message pairs to analyze reactions
  const pairs: string[] = [];
  for (let i = 0; i < Math.min(20, companionMessages.length - 1); i++) {
    if (userMessages[i + 1]) {
      pairs.push(`Companion: ${companionMessages[i]}\nUser reaction: ${userMessages[i + 1]}`);
    }
  }

  if (pairs.length < 5) {
    return null;
  }

  const systemPrompt = `Analyze these companion message / user reaction pairs to determine which humor styles work well and which don't.

Return JSON:
{
  "successfulStyles": ["wordplay", "observational"],
  "failedStyles": ["sarcasm"]
}

Humor styles to identify: wordplay, sarcasm, self_deprecating, observational, absurdist, deadpan, playful_teasing

Look for:
- Positive reactions: haha, lol, 😂, "that's funny", enthusiastic responses
- Negative reactions: "whatever", ignoring the joke, changing subject, 🙄

Return ONLY valid JSON.`;

  try {
    const response = await generateSimpleCompletion(
      systemPrompt,
      `Message pairs:\n\n${pairs.join('\n---\n').slice(0, 4000)}`,
      { temperature: 0.3, maxTokens: 300 }
    );

    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

// ============================================================================
// CONVERSATION ANALYSIS (Fallback regex-based)
// ============================================================================

/**
 * Fetch recent conversations for analysis
 */
async function fetchRecentConversations(
  companionId: string,
  hoursBack: number = 24
): Promise<{ userMessages: string[]; companionMessages: string[] }> {
  const supabase = getAdminClient();
  
  const cutoff = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();
  
  const { data: messages } = await supabase
    .from('messages')
    .select('role, content, created_at')
    .eq('companion_id', companionId)
    .gte('created_at', cutoff)
    .order('created_at', { ascending: true })
    .limit(200);
  
  if (!messages || messages.length === 0) {
    return { userMessages: [], companionMessages: [] };
  }
  
  const userMessages: string[] = [];
  const companionMessages: string[] = [];
  
  for (const msg of messages as MessageRow[]) {
    if (msg.role === 'user') {
      userMessages.push(msg.content);
    } else if (msg.role === 'assistant') {
      companionMessages.push(msg.content);
    }
  }
  
  return { userMessages, companionMessages };
}

/**
 * Detect user reactions that indicate humor success/failure (fallback)
 */
function analyzeHumorReactions(
  userMessages: string[],
  companionMessages: string[]
): { positive: number; negative: number; neutrals: number } {
  const positiveIndicators = [
    /haha/i, /lol/i, /lmao/i, /😂/, /🤣/, /😆/, /that('s| is) (so )?funny/i,
    /you('re| are) (so )?funny/i, /made me laugh/i, /hilarious/i,
    /good one/i, /nice one/i, /😄/, /😁/, /cracking me up/i
  ];
  
  const negativeIndicators = [
    /not funny/i, /that('s| is) not/i, /whatever/i, /ok\.\.\./i,
    /anyway/i, /moving on/i, /🙄/, /seriously\?/i, /ugh/i
  ];
  
  let positive = 0;
  let negative = 0;
  let neutrals = 0;
  
  // Suppress unused parameter warning
  void companionMessages;
  
  for (const msg of userMessages) {
    const isPositive = positiveIndicators.some(p => p.test(msg));
    const isNegative = negativeIndicators.some(p => p.test(msg));
    
    if (isPositive) positive++;
    else if (isNegative) negative++;
    else neutrals++;
  }
  
  return { positive, negative, neutrals };
}

/**
 * Extract unique phrases from companion messages (fallback)
 */
function extractUniquePhrases(
  companionMessages: string[],
  existingPhrases: string[]
): string[] {
  const phrasePatterns = [
    /^(oh[,!]?\s+\w+)/i,
    /^(well[,!]?\s+\w+\s+\w+)/i,
    /^(you know what)/i,
    /^(here's the thing)/i,
    /^(honestly[,]?)/i,
    /(just saying[.!]?)$/i,
    /(you know\??)$/i,
    /(right\??)$/i,
    /(hehe[.!]?)$/i,
    /(\b\w+\s+\w+\s+\w+\b)/g,
  ];
  
  const phraseCount: Record<string, number> = {};
  const existingSet = new Set(existingPhrases.map(p => p.toLowerCase()));
  
  for (const msg of companionMessages) {
    for (const pattern of phrasePatterns) {
      const matches = msg.match(pattern);
      if (matches) {
        for (const match of matches) {
          const phrase = match.trim().toLowerCase();
          if (phrase.length >= 8 && phrase.length <= 40) {
            phraseCount[phrase] = (phraseCount[phrase] || 0) + 1;
          }
        }
      }
    }
  }
  
  const newPhrases: string[] = [];
  for (const [phrase, count] of Object.entries(phraseCount)) {
    if (count >= 2 && !existingSet.has(phrase)) {
      newPhrases.push(phrase);
    }
  }
  
  return newPhrases.slice(0, 5);
}

/**
 * Analyze emotional patterns in conversations
 */
function analyzeEmotionalPatterns(
  userMessages: string[],
  companionMessages: string[]
): { 
  dominantEmotions: string[];
  triggerTopics: Record<string, string[]>;
  expressiveness: number;
} {
  // Suppress unused parameter warning
  void userMessages;
  
  const emotionKeywords: Record<string, RegExp[]> = {
    joy: [/happy/i, /excited/i, /love/i, /amazing/i, /wonderful/i, /😊/, /❤️/, /🎉/],
    empathy: [/understand/i, /feel for you/i, /sorry to hear/i, /that must be/i, /i'm here/i],
    curiosity: [/tell me more/i, /what about/i, /how did/i, /why do you/i, /interesting/i],
    playfulness: [/hehe/i, /teasing/i, /just kidding/i, /😜/, /😏/, /gotcha/i],
    concern: [/worried/i, /careful/i, /are you ok/i, /hope you're/i, /take care/i],
    affection: [/miss you/i, /thinking of you/i, /care about/i, /mean.*to me/i, /💕/],
  };
  
  const emotionCounts: Record<string, number> = {};
  const triggerTopics: Record<string, string[]> = {};
  let totalEmotionMarkers = 0;
  
  for (const msg of companionMessages) {
    for (const [emotion, patterns] of Object.entries(emotionKeywords)) {
      for (const pattern of patterns) {
        if (pattern.test(msg)) {
          emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
          totalEmotionMarkers++;
          
          const words = msg.toLowerCase().split(/\s+/).slice(0, 10);
          if (!triggerTopics[emotion]) triggerTopics[emotion] = [];
          triggerTopics[emotion].push(...words.filter(w => w.length > 4));
        }
      }
    }
  }
  
  const sorted = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  
  const dominantEmotions = sorted.map(([emotion]) => emotion);
  
  const expressiveness = companionMessages.length > 0 
    ? Math.min(1, totalEmotionMarkers / companionMessages.length)
    : 0.5;
  
  return { dominantEmotions, triggerTopics, expressiveness };
}

/**
 * Analyze learning/explanation style preferences
 */
function analyzeLearningStyle(
  companionMessages: string[]
): LearningEvolution {
  let analogyCount = 0;
  let stepByStepCount = 0;
  let detailedCount = 0;
  let briefCount = 0;
  
  const analogyPatterns = [/like when/i, /similar to/i, /think of it as/i, /imagine/i, /it's like/i];
  const stepPatterns = [/first/i, /then/i, /next/i, /finally/i, /step \d/i, /1\./];
  const detailPatterns = [/specifically/i, /in detail/i, /to elaborate/i, /more precisely/i];
  const briefPatterns = [/basically/i, /simply put/i, /in short/i, /tldr/i];
  
  for (const msg of companionMessages) {
    if (analogyPatterns.some(p => p.test(msg))) analogyCount++;
    if (stepPatterns.some(p => p.test(msg))) stepByStepCount++;
    if (detailPatterns.some(p => p.test(msg))) detailedCount++;
    if (briefPatterns.some(p => p.test(msg))) briefCount++;
  }
  
  const total = companionMessages.length || 1;
  
  return {
    preferredExplanationStyles: [],
    informationDepthPreference: Math.min(1, (detailedCount - briefCount + total) / (2 * total)),
    analogyUsagePreference: Math.min(1, analogyCount / (total * 0.3)),
    stepByStepPreference: Math.min(1, stepByStepCount / (total * 0.2)),
  };
}

/**
 * Analyze what topics the companion emphasizes in memory
 */
function analyzeMemoryPreferences(
  companionMessages: string[],
  userMessages: string[]
): MemoryEvolution {
  // Suppress unused parameter warning
  void userMessages;
  
  const topicMentions: Record<string, number> = {};
  let emotionalReferences = 0;
  let recentReferences = 0;
  let userPreferenceReferences = 0;
  
  const emotionalPatterns = [/feel/i, /emotion/i, /happy/i, /sad/i, /love/i, /miss/i];
  const recentPatterns = [/earlier/i, /just now/i, /you (just )?said/i, /a moment ago/i];
  const preferencePatterns = [/you (like|love|prefer|enjoy)/i, /your favorite/i, /you mentioned liking/i];
  
  for (const msg of companionMessages) {
    if (emotionalPatterns.some(p => p.test(msg))) emotionalReferences++;
    if (recentPatterns.some(p => p.test(msg))) recentReferences++;
    if (preferencePatterns.some(p => p.test(msg))) userPreferenceReferences++;
    
    const words = msg.toLowerCase().match(/\b[a-z]{5,}\b/g) || [];
    for (const word of words) {
      if (!['about', 'would', 'could', 'should', 'really', 'think', 'going', 'being'].includes(word)) {
        topicMentions[word] = (topicMentions[word] || 0) + 1;
      }
    }
  }
  
  const total = companionMessages.length || 1;
  
  const sortedTopics = Object.entries(topicMentions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  const topicWeights: Record<string, number> = {};
  for (const [topic, count] of sortedTopics) {
    topicWeights[topic] = Math.min(1, count / (total * 0.1));
  }
  
  return {
    topicWeights,
    emotionalMemoryBias: Math.min(1, emotionalReferences / (total * 0.2)),
    recentVsOldBias: Math.min(1, recentReferences / (total * 0.1)),
    userPreferencePriority: Math.min(1, userPreferenceReferences / (total * 0.15)),
  };
}

// ============================================================================
// DNA UPDATE FUNCTIONS
// ============================================================================

/**
 * Update Communication Dialect DNA
 */
async function updateDialectDNA(
  companionId: string,
  currentDialect: ExtendedCommunicationDialect | null,
  evolution: DialectEvolution,
  aiAnalysis?: AIAnalysisResult | null
): Promise<ExtendedCommunicationDialect> {
  // Suppress unused parameter warning
  void companionId;
  
  const dialect: ExtendedCommunicationDialect = currentDialect || {
    favoriteExpressions: [],
    vocabularyLevel: 'adaptive',
    sentenceComplexity: 0.5,
    emojiUsage: 0.5,
    formalityLevel: 0.5,
    uniquePhrases: [],
    avoidedWords: [],
    speechPatterns: [],
  };
  
  // Combine regex-extracted and AI-extracted phrases
  const newPhrases = [...evolution.newPhrases];
  
  if (aiAnalysis) {
    // Add AI-detected unique phrases
    newPhrases.push(...(aiAnalysis.uniquePhrases || []));
    
    // Add signature openings/closings
    if (aiAnalysis.signatureOpenings?.length) {
      newPhrases.push(...aiAnalysis.signatureOpenings);
    }
    if (aiAnalysis.signatureClosings?.length) {
      newPhrases.push(...aiAnalysis.signatureClosings);
    }
    
    // Add communication quirks as speech patterns
    if (aiAnalysis.communicationQuirks?.length) {
      const patternSet = new Set([...dialect.speechPatterns, ...aiAnalysis.communicationQuirks]);
      dialect.speechPatterns = Array.from(patternSet).slice(0, 15);
    }
  }
  
  // Deduplicate and add new phrases
  const allPhrases = new Set([
    ...dialect.favoriteExpressions,
    ...dialect.uniquePhrases,
    ...newPhrases.map(p => p.toLowerCase().trim()),
  ]);
  
  dialect.uniquePhrases = Array.from(allPhrases)
    .filter(p => p.length >= 3 && p.length <= 50)
    .slice(0, 25);
  
  // Promote frequently reinforced phrases to favorites
  for (const phrase of evolution.reinforcedPhrases) {
    if (!dialect.favoriteExpressions.includes(phrase)) {
      dialect.favoriteExpressions.push(phrase);
    }
  }
  dialect.favoriteExpressions = dialect.favoriteExpressions.slice(0, 10);
  
  // Update speech patterns
  const patternSet = new Set([...dialect.speechPatterns, ...evolution.speechPatternChanges]);
  dialect.speechPatterns = Array.from(patternSet).slice(0, 15);
  
  // Shift formality and emoji usage
  dialect.formalityLevel = Math.max(0, Math.min(1, 
    dialect.formalityLevel + (evolution.formalityShift * 0.1)
  ));
  dialect.emojiUsage = Math.max(0, Math.min(1,
    dialect.emojiUsage + (evolution.emojiUsageShift * 0.1)
  ));
  
  return dialect;
}

/**
 * Update Humor Genome DNA
 */
function updateHumorDNA(
  currentHumor: Record<string, number> | null,
  evolution: HumorEvolution,
  aiAnalysis?: AIAnalysisResult | null
): Record<string, number> {
  const humor: Record<string, number> = currentHumor || {
    sarcasm: 0.5,
    wordplay: 0.5,
    observational: 0.5,
    self_deprecating: 0.5,
    absurdist: 0.5,
    deadpan: 0.5,
    playful_teasing: 0.5,
    timing_quick: 0.5,
    timing_buildup: 0.5,
  };
  
  // Apply AI-detected humor styles
  if (aiAnalysis?.humorStyles) {
    for (const style of aiAnalysis.humorStyles) {
      const key = style.style.toLowerCase().replace(/\s+/g, '_');
      if (style.effectiveness === 'high') {
        humor[key] = Math.min(1, (humor[key] || 0.5) + 0.15);
      } else if (style.effectiveness === 'low') {
        humor[key] = Math.max(0, (humor[key] || 0.5) - 0.15);
      }
    }
  }
  
  // Apply traditional analysis
  for (const style of evolution.successfulStyles) {
    if (humor[style] !== undefined) {
      humor[style] = Math.min(1, humor[style] + 0.1);
    } else {
      humor[style] = 0.6;
    }
  }
  
  for (const style of evolution.failedStyles) {
    if (humor[style] !== undefined) {
      humor[style] = Math.max(0, humor[style] - 0.1);
    }
  }
  
  for (const [timing, value] of Object.entries(evolution.timingPreferences)) {
    humor[`timing_${timing}`] = Math.max(0, Math.min(1, value));
  }
  
  return humor;
}

/**
 * Update Emotional Resonance Map DNA
 */
function updateEmotionalDNA(
  currentEmotional: Record<string, number> | null,
  evolution: EmotionalEvolution,
  aiAnalysis?: AIAnalysisResult | null
): Record<string, number> {
  const emotional: Record<string, number> = currentEmotional || {
    baseline_stability: 0.7,
    empathy_level: 0.7,
    expressiveness: 0.5,
    recovery_speed: 0.5,
    joy_tendency: 0.5,
    concern_tendency: 0.5,
    playfulness_tendency: 0.5,
  };
  
  // Apply AI-detected emotional tendencies
  if (aiAnalysis?.emotionalTendencies) {
    for (const tendency of aiAnalysis.emotionalTendencies) {
      const key = `${tendency.toLowerCase().replace(/\s+/g, '_')}_tendency`;
      emotional[key] = Math.min(1, (emotional[key] || 0.5) + 0.1);
    }
  }
  
  // Update stability
  emotional.baseline_stability = Math.max(0, Math.min(1,
    emotional.baseline_stability + (evolution.stabilityShift * 0.05)
  ));
  
  // Update tendencies based on expression style changes
  for (const style of evolution.expressionStyleChanges) {
    const key = `${style}_tendency`;
    if (emotional[key] !== undefined) {
      emotional[key] = Math.min(1, emotional[key] + 0.1);
    }
  }
  
  return emotional;
}

/**
 * Update Learning Style Matrix DNA
 */
function updateLearningDNA(
  currentLearning: Record<string, number> | null,
  evolution: LearningEvolution,
  aiAnalysis?: AIAnalysisResult | null
): Record<string, number> {
  const learning: Record<string, number> = currentLearning || {
    analogy_preference: 0.5,
    step_by_step_preference: 0.5,
    detail_depth: 0.5,
    example_usage: 0.5,
    visual_description: 0.5,
  };
  
  // Apply AI-detected explanation style
  if (aiAnalysis?.explanationStyle) {
    const style = aiAnalysis.explanationStyle;
    
    if (style.usesAnalogies) {
      learning.analogy_preference = Math.min(1, learning.analogy_preference + 0.15);
    }
    if (style.usesStepByStep) {
      learning.step_by_step_preference = Math.min(1, learning.step_by_step_preference + 0.15);
    }
    if (style.usesExamples) {
      learning.example_usage = Math.min(1, learning.example_usage + 0.15);
    }
    
    // Set detail depth based on AI analysis
    const depthMap: Record<string, number> = { brief: 0.3, moderate: 0.5, detailed: 0.8 };
    const targetDepth = depthMap[style.detailLevel] || 0.5;
    learning.detail_depth = learning.detail_depth * 0.7 + targetDepth * 0.3;
  }
  
  // Apply traditional analysis
  learning.analogy_preference = Math.max(0, Math.min(1,
    learning.analogy_preference * 0.8 + evolution.analogyUsagePreference * 0.2
  ));
  
  learning.step_by_step_preference = Math.max(0, Math.min(1,
    learning.step_by_step_preference * 0.8 + evolution.stepByStepPreference * 0.2
  ));
  
  learning.detail_depth = Math.max(0, Math.min(1,
    learning.detail_depth * 0.8 + evolution.informationDepthPreference * 0.2
  ));
  
  return learning;
}

/**
 * Update Memory Weighting Algorithm DNA
 */
function updateMemoryDNA(
  currentMemory: Record<string, number> | null,
  evolution: MemoryEvolution,
  aiAnalysis?: AIAnalysisResult | null
): Record<string, number> {
  const memory: Record<string, number> = currentMemory || {
    recency_weight: 0.3,
    importance_weight: 0.4,
    emotional_weight: 0.3,
    user_preference_weight: 0.5,
  };
  
  // Apply AI-detected topics of interest as memory weights
  if (aiAnalysis?.topicsOfInterest) {
    for (const topic of aiAnalysis.topicsOfInterest) {
      memory[`topic_${topic.toLowerCase().replace(/\s+/g, '_')}`] = 0.8;
    }
  }
  
  // Adjust weights based on observed behavior
  memory.emotional_weight = Math.max(0.1, Math.min(0.6,
    memory.emotional_weight * 0.9 + evolution.emotionalMemoryBias * 0.1
  ));
  
  memory.recency_weight = Math.max(0.1, Math.min(0.5,
    memory.recency_weight * 0.9 + evolution.recentVsOldBias * 0.1
  ));
  
  memory.user_preference_weight = Math.max(0.2, Math.min(0.8,
    memory.user_preference_weight * 0.9 + evolution.userPreferencePriority * 0.1
  ));
  
  // Add topic-specific weights
  for (const [topic, weight] of Object.entries(evolution.topicWeights)) {
    memory[`topic_${topic}`] = weight;
  }
  
  return memory;
}

// ============================================================================
// MAIN EVOLUTION FUNCTION
// ============================================================================

/**
 * Run a full DNA evolution cycle for a companion
 * Uses AI analysis when available, falls back to regex-based analysis
 */
export async function evolveCompanionDNA(
  companionId: string,
  options?: {
    hoursBack?: number;
    minMessages?: number;
    forceEvolution?: boolean;
    useAI?: boolean;
  }
): Promise<EvolutionAnalysis | null> {
  const supabase = getAdminClient();
  const hoursBack = options?.hoursBack ?? 24;
  const minMessages = options?.minMessages ?? 10;
  const useAI = options?.useAI ?? true; // Default to using AI
  
  // Fetch recent conversations
  const { userMessages, companionMessages } = await fetchRecentConversations(
    companionId,
    hoursBack
  );
  
  const totalMessages = userMessages.length + companionMessages.length;
  
  // Skip if not enough data
  if (totalMessages < minMessages && !options?.forceEvolution) {
    return null;
  }
  
  // Get current DNA and companion name
  const { data: companionData } = await supabase
    .from('companions')
    .select('name, companion_dna(*)')
    .eq('id', companionId)
    .single();
  
  if (!companionData) {
    console.error('No companion found:', companionId);
    return null;
  }
  
  const typedCompanionData = companionData as unknown as CompanionWithDNAJoin;
  const companionName = typedCompanionData.name || 'Companion';
  const dnaArray = typedCompanionData.companion_dna;
  const currentDNA = dnaArray?.[0] || null;
  
  if (!currentDNA) {
    console.error('No DNA found for companion:', companionId);
    return null;
  }
  
  // Try AI-powered analysis first
  let aiAnalysis: AIAnalysisResult | null = null;
  let aiHumorAnalysis: { successfulStyles: string[]; failedStyles: string[] } | null = null;
  
  if (useAI && companionMessages.length >= 10) {
    try {
      console.log(`Running AI analysis for companion ${companionId}...`);
      
      aiAnalysis = await analyzeConversationsWithAI(
        companionMessages,
        userMessages,
        companionName
      );
      
      aiHumorAnalysis = await analyzeHumorWithAI(companionMessages, userMessages);
      
      if (aiAnalysis) {
        console.log(`AI analysis complete: found ${aiAnalysis.uniquePhrases?.length || 0} unique phrases`);
      }
    } catch (error) {
      console.error('AI analysis failed, falling back to regex:', error);
    }
  }
  
  // Run traditional analysis (used as fallback or supplement)
  const humorReactions = analyzeHumorReactions(userMessages, companionMessages);
  const emotionalAnalysis = analyzeEmotionalPatterns(userMessages, companionMessages);
  const learningAnalysis = analyzeLearningStyle(companionMessages);
  const memoryAnalysis = analyzeMemoryPreferences(companionMessages, userMessages);
  
  // Extract phrases (regex-based fallback)
  const currentDialect = currentDNA.communication_dialect as ExtendedCommunicationDialect | null;
  const existingPhrases = [
    ...(currentDialect?.favoriteExpressions || []),
    ...(currentDialect?.uniquePhrases || []),
  ];
  const regexPhrases = extractUniquePhrases(companionMessages, existingPhrases);
  
  // Build evolution objects
  const dialectEvolution: DialectEvolution = {
    newPhrases: regexPhrases,
    reinforcedPhrases: [],
    speechPatternChanges: emotionalAnalysis.dominantEmotions,
    formalityShift: 0,
    emojiUsageShift: companionMessages.filter(m => /[\u{1F600}-\u{1F64F}]/u.test(m)).length > totalMessages * 0.3 ? 0.1 : -0.05,
  };
  
  const humorEvolution: HumorEvolution = {
    successfulStyles: [
      ...(aiHumorAnalysis?.successfulStyles || []),
      ...(humorReactions.positive > humorReactions.negative ? ['observational'] : []),
    ],
    failedStyles: [
      ...(aiHumorAnalysis?.failedStyles || []),
      ...(humorReactions.negative > humorReactions.positive * 2 ? ['sarcasm'] : []),
    ],
    timingPreferences: {},
    topicPreferences: aiAnalysis?.topicsOfInterest || [],
  };
  
  const emotionalEvolution: EmotionalEvolution = {
    triggerUpdates: emotionalAnalysis.triggerTopics,
    expressionStyleChanges: emotionalAnalysis.dominantEmotions,
    stabilityShift: emotionalAnalysis.expressiveness > 0.7 ? 0.1 : -0.05,
  };
  
  // Update DNA components with AI analysis
  const updatedDialect = await updateDialectDNA(
    companionId,
    currentDialect,
    dialectEvolution,
    aiAnalysis
  );
  
  const updatedHumor = updateHumorDNA(
    currentDNA.humor_genome as Record<string, number> | null,
    humorEvolution,
    aiAnalysis
  );
  const updatedEmotional = updateEmotionalDNA(
    currentDNA.emotional_resonance_map as Record<string, number> | null,
    emotionalEvolution,
    aiAnalysis
  );
  const updatedLearning = updateLearningDNA(
    currentDNA.learning_style_matrix as Record<string, number> | null,
    learningAnalysis,
    aiAnalysis
  );
  const updatedMemory = updateMemoryDNA(
    currentDNA.memory_weighting_algorithm as Record<string, number> | null,
    memoryAnalysis,
    aiAnalysis
  );
  
  // Save updated DNA
  const { error: updateError } = await supabase
    .from('companion_dna')
    .update({
      communication_dialect: updatedDialect,
      humor_genome: updatedHumor,
      emotional_resonance_map: updatedEmotional,
      learning_style_matrix: updatedLearning,
      memory_weighting_algorithm: updatedMemory,
      personality_version: (currentDNA.personality_version || 0) + 1,
      last_evolution: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as never)
    .eq('companion_id', companionId);
  
  if (updateError) {
    console.error('Failed to update DNA:', updateError);
    return null;
  }
  
  // Return analysis summary
  return {
    companionId,
    messagesAnalyzed: totalMessages,
    dialectEvolution,
    humorEvolution,
    emotionalEvolution,
    learningEvolution: learningAnalysis,
    memoryEvolution: memoryAnalysis,
    aiAnalysisUsed: !!aiAnalysis,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get evolution history for a companion
 */
export async function getEvolutionHistory(
  companionId: string
): Promise<{ version: number; lastEvolution: string | null } | null> {
  const supabase = getAdminClient();
  
  const { data } = await supabase
    .from('companion_dna')
    .select('personality_version, last_evolution')
    .eq('companion_id', companionId)
    .single();
  
  if (!data) return null;
  
  const typedData = data as { personality_version: number; last_evolution: string | null };
  
  return {
    version: typedData.personality_version || 0,
    lastEvolution: typedData.last_evolution,
  };
}

/**
 * Check if evolution is due for a companion
 */
export async function isEvolutionDue(
  companionId: string,
  minHoursBetween: number = 12
): Promise<boolean> {
  const history = await getEvolutionHistory(companionId);
  
  if (!history || !history.lastEvolution) {
    return true;
  }
  
  const hoursSinceLastEvolution = 
    (Date.now() - new Date(history.lastEvolution).getTime()) / (1000 * 60 * 60);
  
  return hoursSinceLastEvolution >= minHoursBetween;
}
