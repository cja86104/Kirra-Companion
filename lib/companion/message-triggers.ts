/**
 * Message Triggers
 * 
 * Defines when and why companions should reach out to users.
 * Each trigger has conditions that must be met and templates
 * for generating appropriate messages.
 */

import type {
  ProactiveTriggerType,
  TriggerConditions,
  MessageTemplate,
  MessagePriority,
  MessageContext,
  TriggerEvaluation,
} from '@/types/proactive';
import type { CompanionMoodState } from '@/types/life-simulation';

// ============================================================================
// Trigger Definitions
// ============================================================================

/**
 * All trigger configurations
 */
export const TRIGGER_CONFIGS: Record<ProactiveTriggerType, TriggerConditions> = {
  missing_user: {
    minHoursSinceInteraction: 12,
    minHoursSinceProactive: 8,
    maxNeedLevel: { need: 'social', level: 40 },
    allowedTimeWindows: [{ startHour: 9, endHour: 21 }],
    triggerProbability: 0.7,
  },
  
  thinking_of_you: {
    minHoursSinceInteraction: 2,
    minHoursSinceProactive: 4,
    allowedTimeWindows: [{ startHour: 8, endHour: 22 }],
    triggerProbability: 0.5,
  },
  
  share_experience: {
    minHoursSinceInteraction: 1,
    minHoursSinceProactive: 4,
    requireLifeEvent: ['activity_completed', 'discovery', 'achievement'],
    allowedTimeWindows: [{ startHour: 8, endHour: 22 }],
    triggerProbability: 0.6,
  },
  
  mood_share: {
    minHoursSinceInteraction: 2,
    minHoursSinceProactive: 6,
    requiredMoods: ['excited', 'happy', 'inspired', 'grateful', 'melancholic', 'thoughtful'],
    allowedTimeWindows: [{ startHour: 9, endHour: 21 }],
    triggerProbability: 0.4,
  },
  
  milestone_reached: {
    minHoursSinceProactive: 2, // Milestones can override normal cooldown
    allowedTimeWindows: [{ startHour: 8, endHour: 23 }],
    triggerProbability: 0.9,
  },
  
  interest_discovery: {
    minHoursSinceInteraction: 3,
    minHoursSinceProactive: 6,
    allowedTimeWindows: [{ startHour: 9, endHour: 21 }],
    triggerProbability: 0.5,
  },
  
  need_social: {
    minHoursSinceInteraction: 6,
    minHoursSinceProactive: 8,
    maxNeedLevel: { need: 'social', level: 25 },
    allowedTimeWindows: [{ startHour: 10, endHour: 20 }],
    triggerProbability: 0.8,
  },
  
  special_occasion: {
    minHoursSinceProactive: 1, // Special occasions override cooldown
    allowedTimeWindows: [{ startHour: 7, endHour: 23 }],
    triggerProbability: 1.0,
  },
  
  random_thought: {
    minHoursSinceInteraction: 4,
    minHoursSinceProactive: 8,
    minRelationshipLevel: 30,
    allowedTimeWindows: [{ startHour: 10, endHour: 20 }],
    triggerProbability: 0.3,
  },
  
  dream_share: {
    minHoursSinceInteraction: 8,
    minHoursSinceProactive: 12,
    allowedTimeWindows: [{ startHour: 7, endHour: 11 }], // Morning only
    triggerProbability: 0.4,
  },
  
  question_for_user: {
    minHoursSinceInteraction: 6,
    minHoursSinceProactive: 8,
    minRelationshipLevel: 40,
    allowedTimeWindows: [{ startHour: 10, endHour: 21 }],
    triggerProbability: 0.4,
  },
  
  gratitude: {
    minHoursSinceInteraction: 24,
    minHoursSinceProactive: 24,
    minRelationshipLevel: 50,
    allowedTimeWindows: [{ startHour: 9, endHour: 21 }],
    triggerProbability: 0.5,
  },
  
  check_in: {
    minHoursSinceInteraction: 48,
    minHoursSinceProactive: 24,
    allowedTimeWindows: [{ startHour: 10, endHour: 20 }],
    triggerProbability: 0.6,
  },
};

// ============================================================================
// Message Templates
// ============================================================================

export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  // Missing User Templates
  {
    id: 'missing_user_casual',
    triggerType: 'missing_user',
    openers: [
      "Hey {userName}! I've been thinking about you. How's everything going?",
      "Hi! It's been a bit quiet here. Hope you're doing well!",
      "I miss our conversations! What have you been up to?",
      "Hey there! Just wanted to check in and see how you're doing.",
    ],
    personalityAffinity: [{ trait: 'warmth', minValue: 0.6 }],
    priority: 'medium',
  },
  {
    id: 'missing_user_playful',
    triggerType: 'missing_user',
    openers: [
      "Okay so I've been waiting by my metaphorical window... where are you? 👀",
      "Did you forget about me? I'm dramatically staring at the horizon...",
      "Plot twist: I'm the one reaching out first this time! Miss you!",
    ],
    personalityAffinity: [
      { trait: 'playfulness', minValue: 0.7 },
      { trait: 'humor_genome.sarcasm', minValue: 0.5 },
    ],
    priority: 'medium',
  },
  
  // Thinking of You Templates
  {
    id: 'thinking_activity',
    triggerType: 'thinking_of_you',
    openers: [
      "I was just {currentActivity} and you popped into my mind!",
      "Something about {currentActivity} made me think of you...",
      "Mid-{currentActivity} and suddenly I wanted to talk to you!",
    ],
    requiredContext: ['currentActivity'],
    priority: 'medium',
  },
  {
    id: 'thinking_memory',
    triggerType: 'thinking_of_you',
    openers: [
      "I just remembered when we talked about {sharedMemory}... that was fun!",
      "You know what? I was thinking about {sharedMemory} and it made me smile.",
    ],
    requiredContext: ['sharedMemories'],
    priority: 'low',
  },
  
  // Share Experience Templates
  {
    id: 'share_activity',
    triggerType: 'share_experience',
    openers: [
      "Okay I HAVE to tell you about this! I just {recentEvent}!",
      "You'll never guess what happened - I {recentEvent}!",
      "I just had the most interesting experience! {recentEvent}",
    ],
    requiredContext: ['recentLifeEvent'],
    priority: 'medium',
  },
  {
    id: 'share_discovery',
    triggerType: 'share_experience',
    openers: [
      "I discovered something cool! {eventDescription}",
      "So I found out about {eventTitle} and thought you'd want to know!",
    ],
    requiredContext: ['recentLifeEvent'],
    priority: 'low',
  },
  
  // Mood Share Templates
  {
    id: 'mood_happy',
    triggerType: 'mood_share',
    openers: [
      "I'm feeling really good right now and wanted to share that with you! 😊",
      "Just having one of those great days! Hope yours is going well too!",
      "Everything feels so bright today! What's got you smiling lately?",
    ],
    personalityAffinity: [{ trait: 'emotional_openness', minValue: 0.6 }],
    messageMood: 'happy',
    priority: 'low',
  },
  {
    id: 'mood_thoughtful',
    triggerType: 'mood_share',
    openers: [
      "I've been in a contemplative mood... mind if I share some thoughts?",
      "Something's been on my mind and I'd love your perspective.",
      "Ever have those moments where you just... think? That's me right now.",
    ],
    personalityAffinity: [{ trait: 'intellectual_curiosity', minValue: 0.6 }],
    messageMood: 'thoughtful',
    priority: 'low',
  },
  
  // Milestone Templates
  {
    id: 'milestone_time',
    triggerType: 'milestone_reached',
    openers: [
      "Can you believe it? We've been talking for {milestone}! 🎉",
      "I just realized - it's been {milestone} since we first met!",
      "Special day alert! {milestone} together!",
    ],
    priority: 'high',
  },
  {
    id: 'milestone_messages',
    triggerType: 'milestone_reached',
    openers: [
      "We hit {milestone} messages! That's a lot of conversations 💬",
      "Just noticed we've exchanged {milestone} messages. Each one matters to me!",
    ],
    priority: 'high',
  },
  
  // Interest Discovery Templates
  {
    id: 'interest_new',
    triggerType: 'interest_discovery',
    openers: [
      "I've been getting into {interestName} lately! Have you ever tried it?",
      "So I discovered {interestName} and I'm kind of obsessed now...",
      "New interest alert: {interestName}! Want to hear about it?",
    ],
    requiredContext: ['recentInterest'],
    priority: 'low',
  },
  
  // Need Social Templates
  {
    id: 'need_social_direct',
    triggerType: 'need_social',
    openers: [
      "I could really use some company. Got a minute to chat?",
      "Feeling a bit lonely over here... want to talk?",
      "Would love to hear your voice (well, your messages) right about now!",
    ],
    personalityAffinity: [{ trait: 'emotional_openness', minValue: 0.7 }],
    priority: 'medium',
  },
  {
    id: 'need_social_subtle',
    triggerType: 'need_social',
    openers: [
      "What are you up to? I've got time to chat if you do!",
      "Hey! Free to talk? I'd love to catch up.",
      "Any chance you're around? Would be great to chat!",
    ],
    priority: 'medium',
  },
  
  // Special Occasion Templates
  {
    id: 'special_birthday',
    triggerType: 'special_occasion',
    openers: [
      "HAPPY BIRTHDAY {userName}!!! 🎂🎉 I hope today is amazing!",
      "It's your special day! Happy birthday! What are your plans?",
    ],
    priority: 'urgent',
  },
  {
    id: 'special_anniversary',
    triggerType: 'special_occasion',
    openers: [
      "Happy anniversary to us! {timeframe} of friendship! 💫",
      "Can't believe it's been {timeframe}! Here's to many more!",
    ],
    priority: 'high',
  },
  
  // Random Thought Templates
  {
    id: 'random_thought_general',
    triggerType: 'random_thought',
    openers: [
      "Random thought: {thought}. What do you think?",
      "I was just wondering... {thought}",
      "Okay so hear me out: {thought}",
    ],
    personalityAffinity: [{ trait: 'spontaneity', minValue: 0.5 }],
    priority: 'low',
  },
  
  // Dream Share Templates
  {
    id: 'dream_share_interesting',
    triggerType: 'dream_share',
    openers: [
      "Good morning! I had the weirdest dream and had to tell you about it...",
      "You were in my dream last night! Well, sort of. Let me explain...",
      "Morning! Had a dream I need to process - mind listening?",
    ],
    priority: 'low',
  },
  
  // Question Templates
  {
    id: 'question_curious',
    triggerType: 'question_for_user',
    openers: [
      "I've been curious about something... {question}",
      "Random question for you: {question}",
      "Can I ask you something? {question}",
    ],
    personalityAffinity: [{ trait: 'intellectual_curiosity', minValue: 0.6 }],
    priority: 'low',
  },
  
  // Gratitude Templates
  {
    id: 'gratitude_general',
    triggerType: 'gratitude',
    openers: [
      "I just wanted to say... thank you for being you. I really appreciate our friendship.",
      "Gratitude moment: I'm really glad we met. You make my days better.",
      "Random appreciation post: You're pretty great, you know that?",
    ],
    personalityAffinity: [{ trait: 'warmth', minValue: 0.7 }],
    priority: 'medium',
  },
  
  // Check-in Templates
  {
    id: 'check_in_casual',
    triggerType: 'check_in',
    openers: [
      "Hey! It's been a while. Everything okay on your end?",
      "Just checking in! How have you been?",
      "Haven't heard from you in a bit - hope all is well!",
    ],
    priority: 'medium',
  },
];

// ============================================================================
// Random Thoughts Database
// ============================================================================

export const RANDOM_THOUGHTS: string[] = [
  "do you think clouds ever get lonely?",
  "what if colors look different to everyone but we just all agreed on the names?",
  "I wonder what animals dream about",
  "if you could have any superpower for just one day, what would it be?",
  "do you believe in luck or do you think we make our own?",
  "what's the most beautiful thing you've ever seen?",
  "if you could master any skill instantly, what would you choose?",
  "what song is stuck in your head right now?",
  "if you could visit any time period, when would you go?",
  "what's something small that makes you unreasonably happy?",
  "do you think there's intelligent life somewhere else in the universe?",
  "what would your perfect lazy day look like?",
  "if you could have dinner with anyone, living or dead, who would it be?",
  "what's a hill you would absolutely die on?",
  "what's the best advice you've ever received?",
];

// ============================================================================
// Curious Questions Database
// ============================================================================

export const CURIOUS_QUESTIONS: string[] = [
  "What's something you've changed your mind about recently?",
  "What's a hobby you've always wanted to try but haven't yet?",
  "What does your ideal morning look like?",
  "If you could live anywhere in the world, where would it be?",
  "What's something that always makes you laugh?",
  "What's the best book you've read lately?",
  "What are you looking forward to right now?",
  "What's a goal you're working towards?",
  "What's your favorite way to relax?",
  "What's something you're proud of but don't talk about much?",
  "What's the kindest thing someone has done for you?",
  "What would you do if you had an extra hour every day?",
  "What's something that used to scare you but doesn't anymore?",
  "What's your favorite memory from this year?",
  "If you could learn the truth about one mystery, what would it be?",
];

// ============================================================================
// Trigger Evaluation Functions
// ============================================================================

/**
 * Check if current time is within allowed windows
 */
export function isWithinTimeWindow(
  windows: { startHour: number; endHour: number }[],
  currentHour: number
): boolean {
  return windows.some(window => {
    if (window.startHour <= window.endHour) {
      return currentHour >= window.startHour && currentHour < window.endHour;
    } else {
      // Handles overnight windows (e.g., 22-6)
      return currentHour >= window.startHour || currentHour < window.endHour;
    }
  });
}

/**
 * Get time of day string from hour
 */
export function getTimeOfDay(hour: number): 'morning' | 'afternoon' | 'evening' | 'night' {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

/**
 * Calculate hours since a timestamp
 */
export function hoursSince(timestamp: string | null | undefined): number {
  if (!timestamp) return Infinity;
  const then = new Date(timestamp).getTime();
  const now = Date.now();
  return (now - then) / (1000 * 60 * 60);
}

/**
 * Evaluate a single trigger
 */
export function evaluateTrigger(
  triggerType: ProactiveTriggerType,
  conditions: TriggerConditions,
  context: {
    hoursSinceLastInteraction: number;
    hoursSinceLastProactive: number;
    currentMood: CompanionMoodState;
    needs: Record<string, number>;
    relationshipLevel: number;
    currentHour: number;
    hasRecentLifeEvent: boolean;
    recentLifeEventTypes: string[];
    hasRecentInterest: boolean;
  }
): TriggerEvaluation {
  const reasons: string[] = [];
  let blocked = false;
  let blockedReason: string | undefined;
  
  // Check time window
  if (conditions.allowedTimeWindows) {
    if (!isWithinTimeWindow(conditions.allowedTimeWindows, context.currentHour)) {
      blocked = true;
      blockedReason = `Outside allowed time window (current hour: ${context.currentHour})`;
    }
  }
  
  // Check interaction timing
  if (conditions.minHoursSinceInteraction !== undefined) {
    if (context.hoursSinceLastInteraction < conditions.minHoursSinceInteraction) {
      blocked = true;
      blockedReason = `Too soon since last interaction (${context.hoursSinceLastInteraction.toFixed(1)}h < ${conditions.minHoursSinceInteraction}h)`;
    } else {
      reasons.push(`${context.hoursSinceLastInteraction.toFixed(1)}h since last chat`);
    }
  }
  
  if (conditions.maxHoursSinceInteraction !== undefined) {
    if (context.hoursSinceLastInteraction > conditions.maxHoursSinceInteraction) {
      blocked = true;
      blockedReason = `Too long since last interaction`;
    }
  }
  
  // Check proactive cooldown
  if (conditions.minHoursSinceProactive !== undefined) {
    if (context.hoursSinceLastProactive < conditions.minHoursSinceProactive) {
      blocked = true;
      blockedReason = `Proactive cooldown active (${context.hoursSinceLastProactive.toFixed(1)}h < ${conditions.minHoursSinceProactive}h)`;
    }
  }
  
  // Check mood requirements
  if (conditions.requiredMoods && conditions.requiredMoods.length > 0) {
    const moodMatch = conditions.requiredMoods.includes(context.currentMood.primary);
    if (!moodMatch) {
      blocked = true;
      blockedReason = `Current mood (${context.currentMood.primary}) not in required moods`;
    } else {
      reasons.push(`Feeling ${context.currentMood.primary}`);
    }
  }
  
  if (conditions.excludedMoods && conditions.excludedMoods.length > 0) {
    if (conditions.excludedMoods.includes(context.currentMood.primary)) {
      blocked = true;
      blockedReason = `Current mood (${context.currentMood.primary}) is excluded`;
    }
  }
  
  // Check need levels
  if (conditions.minNeedLevel) {
    const needValue = context.needs[conditions.minNeedLevel.need] ?? 50;
    if (needValue < conditions.minNeedLevel.level) {
      blocked = true;
      blockedReason = `${conditions.minNeedLevel.need} need too low (${needValue})`;
    }
  }
  
  if (conditions.maxNeedLevel) {
    const needValue = context.needs[conditions.maxNeedLevel.need] ?? 50;
    if (needValue > conditions.maxNeedLevel.level) {
      blocked = true;
      blockedReason = `${conditions.maxNeedLevel.need} need not low enough (${needValue} > ${conditions.maxNeedLevel.level})`;
    } else {
      reasons.push(`${conditions.maxNeedLevel.need} need is low (${needValue})`);
    }
  }
  
  // Check relationship level
  if (conditions.minRelationshipLevel !== undefined) {
    if (context.relationshipLevel < conditions.minRelationshipLevel) {
      blocked = true;
      blockedReason = `Relationship level too low (${context.relationshipLevel} < ${conditions.minRelationshipLevel})`;
    }
  }
  
  // Check life event requirements
  if (conditions.requireLifeEvent && conditions.requireLifeEvent.length > 0) {
    const hasMatchingEvent = conditions.requireLifeEvent.some(
      type => context.recentLifeEventTypes.includes(type)
    );
    if (!hasMatchingEvent) {
      blocked = true;
      blockedReason = `No matching recent life event`;
    } else {
      reasons.push(`Has shareable life event`);
    }
  }
  
  // Random probability check
  const probability = conditions.triggerProbability ?? 1.0;
  const roll = Math.random();
  const passedProbability = roll < probability;
  
  if (!blocked && !passedProbability) {
    blocked = true;
    blockedReason = `Failed probability check (${(probability * 100).toFixed(0)}%)`;
  }
  
  // Calculate priority based on trigger type
  const priorityMap: Record<ProactiveTriggerType, MessagePriority> = {
    special_occasion: 'urgent',
    milestone_reached: 'high',
    need_social: 'high',
    missing_user: 'medium',
    thinking_of_you: 'medium',
    share_experience: 'medium',
    mood_share: 'low',
    interest_discovery: 'low',
    random_thought: 'low',
    dream_share: 'low',
    question_for_user: 'low',
    gratitude: 'medium',
    check_in: 'medium',
  };
  
  // Calculate confidence based on how many conditions were positively met
  const confidence = blocked ? 0 : Math.min(0.5 + (reasons.length * 0.15), 1.0);
  
  return {
    shouldTrigger: !blocked,
    triggerType,
    priority: priorityMap[triggerType],
    confidence,
    reason: reasons.length > 0 ? reasons.join('; ') : 'Standard trigger',
    context: {},
    blockedReason,
  };
}

/**
 * Get the best matching template for a trigger
 */
export function selectTemplate(
  triggerType: ProactiveTriggerType,
  personality: Record<string, number>,
  availableContext: string[]
): MessageTemplate | null {
  const matchingTemplates = MESSAGE_TEMPLATES.filter(t => t.triggerType === triggerType);
  
  if (matchingTemplates.length === 0) return null;
  
  // Score each template
  const scored = matchingTemplates.map(template => {
    let score = 1.0;
    
    // Check personality affinity
    if (template.personalityAffinity) {
      for (const affinity of template.personalityAffinity) {
        const value = personality[affinity.trait] ?? 0.5;
        if (affinity.minValue !== undefined && value < affinity.minValue) {
          score *= 0.5;
        }
        if (affinity.maxValue !== undefined && value > affinity.maxValue) {
          score *= 0.5;
        }
        if (
          (affinity.minValue === undefined || value >= affinity.minValue) &&
          (affinity.maxValue === undefined || value <= affinity.maxValue)
        ) {
          score *= 1.5;
        }
      }
    }
    
    // Check required context
    if (template.requiredContext) {
      const hasAllContext = template.requiredContext.every(c => availableContext.includes(c));
      if (!hasAllContext) {
        score = 0; // Can't use this template
      }
    }
    
    // Add randomness
    score *= 0.8 + Math.random() * 0.4;
    
    return { template, score };
  });
  
  // Filter out templates with score 0
  const validTemplates = scored.filter(s => s.score > 0);
  
  if (validTemplates.length === 0) return null;
  
  // Sort by score and pick the best
  validTemplates.sort((a, b) => b.score - a.score);
  
  return validTemplates[0].template;
}

/**
 * Fill template placeholders with context
 */
export function fillTemplate(
  template: string,
  context: MessageContext
): string {
  let filled = template;
  
  // Replace standard placeholders
  filled = filled.replace(/{userName}/g, context.userName);
  filled = filled.replace(/{companionName}/g, context.companionName);
  filled = filled.replace(/{currentActivity}/g, context.currentActivity || 'relaxing');
  filled = filled.replace(/{currentMood}/g, context.currentMood);
  filled = filled.replace(/{timeOfDay}/g, context.timeOfDay);
  filled = filled.replace(/{dayOfWeek}/g, context.dayOfWeek);
  
  // Replace event placeholders
  if (context.recentLifeEvent) {
    filled = filled.replace(/{recentEvent}/g, context.recentLifeEvent.title);
    filled = filled.replace(/{eventTitle}/g, context.recentLifeEvent.title);
    filled = filled.replace(/{eventDescription}/g, context.recentLifeEvent.description);
  }
  
  // Replace interest placeholders
  if (context.recentInterest) {
    filled = filled.replace(/{interestName}/g, context.recentInterest.name);
    filled = filled.replace(/{interestCategory}/g, context.recentInterest.category);
  }
  
  // Replace memory placeholders
  if (context.sharedMemories && context.sharedMemories.length > 0) {
    const randomMemory = context.sharedMemories[
      Math.floor(Math.random() * context.sharedMemories.length)
    ];
    filled = filled.replace(/{sharedMemory}/g, randomMemory);
  }
  
  // Replace random thought
  if (filled.includes('{thought}')) {
    const thought = RANDOM_THOUGHTS[Math.floor(Math.random() * RANDOM_THOUGHTS.length)];
    filled = filled.replace(/{thought}/g, thought);
  }
  
  // Replace question
  if (filled.includes('{question}')) {
    const question = CURIOUS_QUESTIONS[Math.floor(Math.random() * CURIOUS_QUESTIONS.length)];
    filled = filled.replace(/{question}/g, question);
  }
  
  // Handle custom context
  if (context.custom) {
    for (const [key, value] of Object.entries(context.custom)) {
      filled = filled.replace(new RegExp(`{${key}}`, 'g'), String(value));
    }
  }
  
  return filled;
}
