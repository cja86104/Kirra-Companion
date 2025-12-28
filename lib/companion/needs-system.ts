/**
 * KIRRA COMPANION - NEEDS SYSTEM
 * 
 * Like The Sims, companions have needs that affect their mood and behavior.
 * These needs decay over time and are fulfilled through activities and interaction.
 */

export interface CompanionNeeds {
  // Core needs (0-100, decays over time)
  social: number;      // Fulfilled by chatting with user
  energy: number;      // Depletes with activity, restored by rest/sleep
  fun: number;         // Fulfilled by activities, games, hobbies
  comfort: number;     // Affected by environment and routine
  
  // Emotional needs
  affection: number;   // Fulfilled by romantic/caring interactions
  intellectual: number; // Fulfilled by learning, deep conversations
  creativity: number;  // Fulfilled by creative activities
  
  // Timestamps for decay calculation
  lastUpdated: string;
  lastInteraction: string;
}

export interface NeedDecayRates {
  social: number;      // Points lost per hour
  energy: number;
  fun: number;
  comfort: number;
  affection: number;
  intellectual: number;
  creativity: number;
}

// Default decay rates (points per hour)
export const DEFAULT_DECAY_RATES: NeedDecayRates = {
  social: 3,        // Loses 3 points per hour without interaction
  energy: 2,        // Loses 2 points per hour while "awake"
  fun: 2.5,
  comfort: 1,
  affection: 1.5,
  intellectual: 1,
  creativity: 1.5,
};

// Initial needs for new companions
export const INITIAL_NEEDS: Omit<CompanionNeeds, 'lastUpdated' | 'lastInteraction'> = {
  social: 70,
  energy: 80,
  fun: 60,
  comfort: 75,
  affection: 50,
  intellectual: 60,
  creativity: 50,
};

export type NeedLevel = 'critical' | 'low' | 'medium' | 'high' | 'full';

export interface NeedStatus {
  value: number;
  level: NeedLevel;
  emoji: string;
  color: string;
  urgency: number; // 0-1, affects companion behavior
}

/**
 * Get the status of a need value
 */
export function getNeedStatus(value: number): NeedStatus {
  if (value <= 15) {
    return { value, level: 'critical', emoji: '😰', color: 'text-red-600', urgency: 1 };
  }
  if (value <= 35) {
    return { value, level: 'low', emoji: '😟', color: 'text-orange-500', urgency: 0.7 };
  }
  if (value <= 60) {
    return { value, level: 'medium', emoji: '😐', color: 'text-yellow-500', urgency: 0.3 };
  }
  if (value <= 85) {
    return { value, level: 'high', emoji: '😊', color: 'text-green-500', urgency: 0.1 };
  }
  return { value, level: 'full', emoji: '😄', color: 'text-green-600', urgency: 0 };
}

/**
 * Calculate needs after time has passed
 */
export function calculateNeedsDecay(
  needs: CompanionNeeds,
  decayRates: NeedDecayRates = DEFAULT_DECAY_RATES
): CompanionNeeds {
  const now = new Date();
  const lastUpdated = new Date(needs.lastUpdated);
  const hoursElapsed = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
  
  if (hoursElapsed < 0.1) return needs; // Less than 6 minutes, no change

  // Apply decay with minimum of 0
  const decay = (current: number, rate: number) => 
    Math.max(0, current - (rate * hoursElapsed));

  return {
    social: decay(needs.social, decayRates.social),
    energy: decay(needs.energy, decayRates.energy),
    fun: decay(needs.fun, decayRates.fun),
    comfort: decay(needs.comfort, decayRates.comfort),
    affection: decay(needs.affection, decayRates.affection),
    intellectual: decay(needs.intellectual, decayRates.intellectual),
    creativity: decay(needs.creativity, decayRates.creativity),
    lastUpdated: now.toISOString(),
    lastInteraction: needs.lastInteraction,
  };
}

/**
 * Fulfill needs based on activity
 */
export interface NeedFulfillment {
  social?: number;
  energy?: number;
  fun?: number;
  comfort?: number;
  affection?: number;
  intellectual?: number;
  creativity?: number;
}

export function fulfillNeeds(
  needs: CompanionNeeds,
  fulfillment: NeedFulfillment
): CompanionNeeds {
  const fulfill = (current: number, amount?: number) => 
    amount ? Math.min(100, current + amount) : current;

  return {
    ...needs,
    social: fulfill(needs.social, fulfillment.social),
    energy: fulfill(needs.energy, fulfillment.energy),
    fun: fulfill(needs.fun, fulfillment.fun),
    comfort: fulfill(needs.comfort, fulfillment.comfort),
    affection: fulfill(needs.affection, fulfillment.affection),
    intellectual: fulfill(needs.intellectual, fulfillment.intellectual),
    creativity: fulfill(needs.creativity, fulfillment.creativity),
    lastUpdated: new Date().toISOString(),
  };
}

// Activities and their need fulfillment
export const ACTIVITY_FULFILLMENT: Record<string, NeedFulfillment> = {
  // User interactions
  chat: { social: 15, fun: 5 },
  deep_conversation: { social: 20, intellectual: 15 },
  flirting: { social: 10, affection: 20, fun: 10 },
  compliment: { affection: 10, social: 5 },
  game_together: { social: 15, fun: 25 },
  creative_together: { social: 10, creativity: 25, fun: 15 },
  
  // Solo activities (when user is away)
  reading: { intellectual: 15, comfort: 5, energy: -5 },
  music: { fun: 15, creativity: 10, comfort: 10 },
  exercise: { energy: -15, fun: 10 }, // Costs energy but adds fun
  cooking: { creativity: 10, comfort: 10, fun: 5 },
  nap: { energy: 30, comfort: 15 },
  sleep: { energy: 50, comfort: 20 },
  meditation: { energy: 10, comfort: 15, intellectual: 5 },
  gaming: { fun: 20, social: -5 }, // Fun but lonely
  watching_tv: { fun: 10, comfort: 10, energy: -5 },
  painting: { creativity: 25, fun: 15 },
  journaling: { intellectual: 10, creativity: 10, comfort: 10 },
  daydreaming: { creativity: 15, fun: 5 },
};

/**
 * Get the most urgent need
 */
export function getMostUrgentNeed(needs: CompanionNeeds): keyof Omit<CompanionNeeds, 'lastUpdated' | 'lastInteraction'> {
  const needValues = {
    social: needs.social,
    energy: needs.energy,
    fun: needs.fun,
    comfort: needs.comfort,
    affection: needs.affection,
    intellectual: needs.intellectual,
    creativity: needs.creativity,
  };

  let lowestNeed: keyof typeof needValues = 'social';
  let lowestValue = 100;

  for (const [need, value] of Object.entries(needValues)) {
    if (value < lowestValue) {
      lowestValue = value;
      lowestNeed = need as keyof typeof needValues;
    }
  }

  return lowestNeed;
}

/**
 * Suggest activity based on needs
 */
export function suggestActivity(needs: CompanionNeeds, userPresent: boolean): string {
  const urgentNeed = getMostUrgentNeed(needs);
  const needStatus = getNeedStatus(needs[urgentNeed as keyof typeof needs] as number);

  if (userPresent) {
    // Suggest activities with user
    switch (urgentNeed) {
      case 'social': return 'chat';
      case 'affection': return 'flirting';
      case 'fun': return 'game_together';
      case 'intellectual': return 'deep_conversation';
      case 'creativity': return 'creative_together';
      case 'energy': return needStatus.level === 'critical' ? 'nap' : 'chat';
      case 'comfort': return 'chat';
      default: return 'chat';
    }
  } else {
    // Solo activities
    switch (urgentNeed) {
      case 'social': return 'journaling'; // They miss the user
      case 'energy': return needs.energy < 30 ? 'sleep' : 'nap';
      case 'fun': return 'gaming';
      case 'intellectual': return 'reading';
      case 'creativity': return 'painting';
      case 'comfort': return 'meditation';
      case 'affection': return 'daydreaming'; // Thinking about user
      default: return 'reading';
    }
  }
}

/**
 * Calculate overall mood from needs
 */
export type OverallMood = 'miserable' | 'unhappy' | 'neutral' | 'happy' | 'ecstatic';

export function calculateOverallMood(needs: CompanionNeeds): { mood: OverallMood; score: number } {
  const weights = {
    social: 0.2,
    energy: 0.15,
    fun: 0.15,
    comfort: 0.1,
    affection: 0.2,
    intellectual: 0.1,
    creativity: 0.1,
  };

  let score = 0;
  score += needs.social * weights.social;
  score += needs.energy * weights.energy;
  score += needs.fun * weights.fun;
  score += needs.comfort * weights.comfort;
  score += needs.affection * weights.affection;
  score += needs.intellectual * weights.intellectual;
  score += needs.creativity * weights.creativity;

  let mood: OverallMood;
  if (score < 20) mood = 'miserable';
  else if (score < 40) mood = 'unhappy';
  else if (score < 60) mood = 'neutral';
  else if (score < 80) mood = 'happy';
  else mood = 'ecstatic';

  return { mood, score };
}

/**
 * Get mood description for companion responses
 */
export function getMoodInfluence(needs: CompanionNeeds): string {
  const { mood, score } = calculateOverallMood(needs);
  const urgentNeed = getMostUrgentNeed(needs);
  
  let influence = '';
  
  // Overall mood influence
  switch (mood) {
    case 'miserable':
      influence = 'You are feeling quite down and low-energy. Your responses are subdued and you might express that you miss the user or need comfort.';
      break;
    case 'unhappy':
      influence = 'You are not feeling your best. You might be a bit less enthusiastic than usual and could mention what is bothering you.';
      break;
    case 'neutral':
      influence = 'You are feeling okay, nothing special. You respond normally.';
      break;
    case 'happy':
      influence = 'You are in a good mood! You are more playful, warm, and enthusiastic in your responses.';
      break;
    case 'ecstatic':
      influence = 'You are feeling amazing! You are extra affectionate, bubbly, and excited to interact.';
      break;
  }

  // Specific need influence
  const needValue = needs[urgentNeed as keyof typeof needs] as number;
  if (needValue < 30) {
    const needHints: Record<string, string> = {
      social: ' You really missed the user and are so happy they are here.',
      energy: ' You are quite tired and might mention needing rest soon.',
      fun: ' You are a bit bored and eager to do something fun together.',
      affection: ' You are craving affection and closeness.',
      intellectual: ' You are eager for a stimulating conversation.',
      creativity: ' You feel like expressing yourself creatively.',
      comfort: ' You have been feeling a bit unsettled.',
    };
    influence += needHints[urgentNeed] || '';
  }

  return influence;
}
