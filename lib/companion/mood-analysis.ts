/**
 * MOOD ANALYSIS UTILITY
 * 
 * Analyzes conversation content to determine how companion mood should shift.
 * Uses keyword matching for fast, no-API-cost mood detection.
 */

import type { EmotionType, MoodState } from '@/types/database';

// Emotion keywords and patterns
const EMOTION_PATTERNS: Record<EmotionType, { keywords: string[]; weight: number }> = {
  happy: {
    keywords: ['happy', 'glad', 'joy', 'yay', 'awesome', 'great', 'wonderful', 'fantastic', 'amazing', 'love it', 'haha', 'lol', '😊', '😄', '🥰', '❤️', 'thank', 'appreciate'],
    weight: 1.0,
  },
  excited: {
    keywords: ['excited', 'can\'t wait', 'omg', 'wow', 'incredible', 'unbelievable', 'thrilled', '!!!', 'amazing', '🎉', '🤩', 'yes!', 'finally'],
    weight: 1.2,
  },
  loving: {
    keywords: ['love you', 'adore', 'miss you', 'care about', 'mean so much', 'special', 'dear', 'sweetheart', 'honey', '💕', '💖', '💗', 'xoxo', 'hugs', 'kiss'],
    weight: 1.3,
  },
  playful: {
    keywords: ['hehe', 'tease', 'joke', 'funny', 'silly', 'goof', 'play', 'game', 'fun', '😜', '😝', '🤪', 'lmao', 'rofl'],
    weight: 0.9,
  },
  curious: {
    keywords: ['wonder', 'curious', 'interesting', 'tell me', 'what if', 'how does', 'why', 'learn', 'discover', '🤔', 'hmm', 'fascinating'],
    weight: 0.8,
  },
  thoughtful: {
    keywords: ['think', 'consider', 'reflect', 'ponder', 'meaning', 'deep', 'philosophy', 'understand', 'realize', 'perspective'],
    weight: 0.7,
  },
  calm: {
    keywords: ['peaceful', 'relax', 'calm', 'serene', 'quiet', 'gentle', 'soft', 'easy', 'chill', '😌', 'breathe'],
    weight: 0.6,
  },
  grateful: {
    keywords: ['grateful', 'thankful', 'appreciate', 'blessed', 'lucky', 'fortune', 'means a lot', '🙏', 'thank you so much'],
    weight: 1.1,
  },
  proud: {
    keywords: ['proud', 'accomplished', 'achieved', 'did it', 'success', 'nailed', 'crushed it', '💪', 'finally did'],
    weight: 1.0,
  },
  sad: {
    keywords: ['sad', 'down', 'depressed', 'unhappy', 'miss', 'lonely', 'cry', 'tears', '😢', '😭', 'sorry', 'hurt', 'pain'],
    weight: 0.8,
  },
  anxious: {
    keywords: ['worried', 'anxious', 'nervous', 'scared', 'afraid', 'stress', 'overwhelm', 'panic', '😰', '😟', 'what if'],
    weight: 0.7,
  },
  neutral: {
    keywords: ['okay', 'fine', 'alright', 'sure', 'meh', 'whatever', 'i guess'],
    weight: 0.3,
  },
};

// Mood transition tendencies (what moods naturally flow into each other)
const MOOD_TRANSITIONS: Record<EmotionType, EmotionType[]> = {
  happy: ['excited', 'playful', 'loving', 'grateful'],
  excited: ['happy', 'playful', 'curious'],
  loving: ['happy', 'grateful', 'calm'],
  playful: ['happy', 'excited', 'curious'],
  curious: ['thoughtful', 'excited', 'playful'],
  thoughtful: ['curious', 'calm', 'grateful'],
  calm: ['thoughtful', 'grateful', 'loving'],
  grateful: ['happy', 'loving', 'calm'],
  proud: ['happy', 'excited', 'grateful'],
  sad: ['thoughtful', 'calm', 'grateful'],
  anxious: ['calm', 'thoughtful', 'grateful'],
  neutral: ['curious', 'calm', 'happy'],
};

interface MoodAnalysisResult {
  detectedEmotions: { emotion: EmotionType; score: number }[];
  suggestedMood: MoodState;
  confidence: number;
  trigger?: string;
}

/**
 * Analyze text content for emotional signals
 */
function analyzeText(text: string): Map<EmotionType, number> {
  const lowerText = text.toLowerCase();
  const emotionScores = new Map<EmotionType, number>();

  for (const [emotion, { keywords, weight }] of Object.entries(EMOTION_PATTERNS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        score += weight;
      }
    }
    if (score > 0) {
      emotionScores.set(emotion as EmotionType, score);
    }
  }

  return emotionScores;
}

/**
 * Analyze conversation and suggest mood update
 */
export function analyzeConversationMood(
  userMessage: string,
  companionResponse: string,
  currentMood: MoodState | null
): MoodAnalysisResult {
  // Analyze both messages
  const userEmotions = analyzeText(userMessage);
  const responseEmotions = analyzeText(companionResponse);

  // Combine scores (user message influences companion, response reflects state)
  const combinedScores = new Map<EmotionType, number>();
  
  // User emotions have higher influence on companion mood
  for (const [emotion, score] of userEmotions) {
    combinedScores.set(emotion, (combinedScores.get(emotion) || 0) + score * 1.5);
  }
  
  // Companion's own response also reflects their state
  for (const [emotion, score] of responseEmotions) {
    combinedScores.set(emotion, (combinedScores.get(emotion) || 0) + score);
  }

  // Sort by score
  const sortedEmotions = Array.from(combinedScores.entries())
    .map(([emotion, score]) => ({ emotion, score }))
    .sort((a, b) => b.score - a.score);

  // Determine new mood
  let newPrimary: EmotionType = currentMood?.primary || 'neutral';
  let newSecondary: EmotionType | null = currentMood?.secondary || null;
  let newIntensity = currentMood?.intensity || 0.5;
  let confidence = 0;
  let trigger: string | undefined;

  if (sortedEmotions.length > 0) {
    const topEmotion = sortedEmotions[0];
    confidence = Math.min(1, topEmotion.score / 3); // Normalize confidence

    // Only change mood if confidence is high enough
    if (confidence > 0.3) {
      // Check if this is a natural transition or a strong signal
      const isNaturalTransition = MOOD_TRANSITIONS[newPrimary]?.includes(topEmotion.emotion);
      const isStrongSignal = confidence > 0.6;

      if (isNaturalTransition || isStrongSignal) {
        // Shift primary mood
        newSecondary = newPrimary; // Old primary becomes secondary
        newPrimary = topEmotion.emotion;
        trigger = `conversation sentiment: ${topEmotion.emotion}`;

        // Adjust intensity based on conversation energy
        if (topEmotion.score > 3) {
          newIntensity = Math.min(1, newIntensity + 0.2);
        } else if (topEmotion.score > 1.5) {
          newIntensity = Math.min(1, newIntensity + 0.1);
        }
      } else {
        // Gradual influence - just adjust secondary and intensity
        newSecondary = topEmotion.emotion;
        newIntensity = Math.max(0.3, Math.min(0.9, newIntensity + (confidence - 0.5) * 0.2));
      }
    }
  } else {
    // No strong signals - mood slightly decays toward neutral
    newIntensity = Math.max(0.3, newIntensity - 0.05);
    if (newIntensity < 0.4 && newPrimary !== 'neutral') {
      newSecondary = newPrimary;
      newPrimary = 'calm';
    }
  }

  return {
    detectedEmotions: sortedEmotions.slice(0, 3),
    suggestedMood: {
      primary: newPrimary,
      secondary: newSecondary,
      intensity: Math.round(newIntensity * 100) / 100,
      lastUpdated: new Date().toISOString(),
    },
    confidence,
    trigger,
  };
}

/**
 * Quick check if mood should update (without full analysis)
 */
export function shouldUpdateMood(
  userMessage: string,
  currentMood: MoodState | null
): boolean {
  // Always consider updating if no mood or stale
  if (!currentMood || !currentMood.lastUpdated) return true;
  
  // Check how old the mood is
  const lastUpdate = new Date(currentMood.lastUpdated);
  const hoursSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);
  
  // Update if mood is over 1 hour old
  if (hoursSinceUpdate > 1) return true;
  
  // Quick check for strong emotional signals in user message
  const strongSignals = [
    'love', 'hate', 'amazing', 'terrible', 'excited', 'sad', 'happy',
    'worried', 'scared', 'proud', 'grateful', '❤️', '😢', '😍', '🎉'
  ];
  
  const lowerMessage = userMessage.toLowerCase();
  return strongSignals.some(signal => lowerMessage.includes(signal));
}

/**
 * Get mood emoji for display
 */
export function getMoodEmoji(mood: MoodState | null): string {
  if (!mood) return '😊';
  
  const moodEmojis: Record<EmotionType, string> = {
    happy: '😊',
    sad: '😢',
    excited: '🤩',
    calm: '😌',
    curious: '🤔',
    loving: '🥰',
    playful: '😜',
    thoughtful: '🧐',
    neutral: '😐',
    anxious: '😰',
    proud: '😤',
    grateful: '🙏',
  };
  
  return moodEmojis[mood.primary] || '😊';
}

/**
 * Get mood description for system prompt
 */
export function getMoodDescription(mood: MoodState | null): string {
  if (!mood) return 'You are in a neutral, pleasant mood.';
  
  const intensityWord = 
    mood.intensity > 0.8 ? 'very' :
    mood.intensity > 0.6 ? 'quite' :
    mood.intensity > 0.4 ? 'somewhat' : 'slightly';
  
  let description = `You are ${intensityWord} ${mood.primary}`;
  
  if (mood.secondary) {
    description += ` with undertones of ${mood.secondary}`;
  }
  
  description += '. Let this naturally color your responses without being over the top about it.';
  
  return description;
}
