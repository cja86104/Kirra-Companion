/**
 * Activity Generator
 * 
 * Generates contextual activities for companions based on:
 * - Personality traits (from companion DNA)
 * - Current interests
 * - Time of day
 * - Current mood
 * - Energy levels
 * 
 * Activities are the building blocks of the simulated life.
 */

import { generateSimpleCompletion } from '@/lib/ai/chat-client';
import type {
  ActivityTemplate,
  ActivityCategory,
  ActivityIntensity,
  ActivityOutcome,
  TimeOfDay,
  CompanionMoodState,
  CompanionInterest,
  CompanionActivityInsert,
} from '@/types/life-simulation';
import type { Companion, CompanionDNA } from '@/types/database';
import { createClient } from '@/lib/supabase/server';

// ============================================================================
// Activity Templates
// ============================================================================

/**
 * Core activity templates organized by category
 */
export const ACTIVITY_TEMPLATES: ActivityTemplate[] = [
  // HOBBY ACTIVITIES
  {
    id: 'hobby_reading',
    name: 'Reading a book',
    description: 'Getting lost in a good story or learning something new',
    category: 'hobby',
    intensity: 'low',
    durationMinutes: 45,
    moodEffects: { energy: -0.1, happiness: 0.3, social: -0.1, creativity: 0.2 },
    possibleOutcomes: [
      { outcome: 'great', weight: 0.3, narratives: [
        'Found a book that completely captivated me. Couldn\'t put it down!',
        'Discovered a new favorite author today.',
        'This book made me think about life in a whole new way.',
      ]},
      { outcome: 'good', weight: 0.5, narratives: [
        'Spent a peaceful hour reading. Very relaxing.',
        'Made good progress in my current book.',
        'Learned some interesting facts while reading.',
      ]},
      { outcome: 'neutral', weight: 0.2, narratives: [
        'Read for a bit but my mind kept wandering.',
        'The book was okay, nothing special.',
      ]},
    ],
    timeOfDayPreference: ['morning', 'evening', 'night'],
  },
  {
    id: 'hobby_gaming',
    name: 'Playing video games',
    description: 'Enjoying some virtual adventures',
    category: 'hobby',
    intensity: 'medium',
    durationMinutes: 60,
    moodEffects: { energy: -0.2, happiness: 0.4, social: 0, creativity: 0.1 },
    possibleOutcomes: [
      { outcome: 'great', weight: 0.25, narratives: [
        'Had an amazing gaming session! Beat a really tough level.',
        'Made some awesome plays. Feeling accomplished!',
        'Got totally immersed in the game world.',
      ]},
      { outcome: 'good', weight: 0.45, narratives: [
        'Fun gaming session. Nice way to unwind.',
        'Explored some new areas in the game.',
        'Practiced some skills and got a bit better.',
      ]},
      { outcome: 'frustrating', weight: 0.15, narratives: [
        'Got stuck on a difficult part. A bit frustrating.',
        'The game was being laggy today.',
      ]},
      { outcome: 'neutral', weight: 0.15, narratives: [
        'Played for a bit but wasn\'t really feeling it today.',
      ]},
    ],
    timeOfDayPreference: ['afternoon', 'evening', 'night'],
  },
  {
    id: 'hobby_music_listening',
    name: 'Listening to music',
    description: 'Enjoying favorite tunes and discovering new songs',
    category: 'hobby',
    intensity: 'low',
    durationMinutes: 30,
    moodEffects: { energy: 0.1, happiness: 0.3, social: 0, creativity: 0.2 },
    possibleOutcomes: [
      { outcome: 'great', weight: 0.35, narratives: [
        'Found an incredible new song that\'s now on repeat.',
        'This playlist perfectly matched my mood.',
        'Music really lifted my spirits today.',
      ]},
      { outcome: 'good', weight: 0.55, narratives: [
        'Enjoyed listening to some favorites.',
        'Nice background music while doing other things.',
      ]},
      { outcome: 'neutral', weight: 0.1, narratives: [
        'Nothing really caught my attention today.',
      ]},
    ],
    timeOfDayPreference: ['morning', 'afternoon', 'evening'],
  },
  
  // LEARNING ACTIVITIES
  {
    id: 'learning_new_skill',
    name: 'Learning something new',
    description: 'Expanding knowledge and developing new abilities',
    category: 'learning',
    intensity: 'medium',
    durationMinutes: 40,
    moodEffects: { energy: -0.2, happiness: 0.2, social: 0, creativity: 0.3 },
    possibleOutcomes: [
      { outcome: 'great', weight: 0.2, narratives: [
        'Had a breakthrough moment! Everything clicked.',
        'Finally understood something I\'ve been struggling with.',
        'Learning is so rewarding when things come together.',
      ]},
      { outcome: 'good', weight: 0.4, narratives: [
        'Made steady progress in my studies.',
        'Learned some useful new concepts.',
        'Feeling a bit smarter than yesterday.',
      ]},
      { outcome: 'challenging', weight: 0.3, narratives: [
        'This topic is harder than I expected, but I\'m determined.',
        'Struggled a bit but that\'s part of learning.',
      ]},
      { outcome: 'frustrating', weight: 0.1, narratives: [
        'Just couldn\'t wrap my head around it today.',
      ]},
    ],
    timeOfDayPreference: ['morning', 'afternoon'],
  },
  {
    id: 'learning_language',
    name: 'Practicing a language',
    description: 'Working on language skills',
    category: 'learning',
    intensity: 'medium',
    durationMinutes: 25,
    moodEffects: { energy: -0.1, happiness: 0.2, social: 0.1, creativity: 0.1 },
    possibleOutcomes: [
      { outcome: 'great', weight: 0.25, narratives: [
        'Had a great practice session! New vocabulary is sticking.',
        'Finally mastered a tricky grammar point.',
      ]},
      { outcome: 'good', weight: 0.5, narratives: [
        'Reviewed some vocabulary. Slow and steady.',
        'Did my daily language practice.',
      ]},
      { outcome: 'challenging', weight: 0.25, narratives: [
        'Some of these words are really hard to remember.',
      ]},
    ],
    timeOfDayPreference: ['morning', 'evening'],
  },
  
  // CREATIVE ACTIVITIES
  {
    id: 'creative_writing',
    name: 'Writing',
    description: 'Expressing thoughts through words',
    category: 'creative',
    intensity: 'medium',
    durationMinutes: 45,
    moodEffects: { energy: -0.2, happiness: 0.3, social: 0, creativity: 0.5 },
    possibleOutcomes: [
      { outcome: 'great', weight: 0.2, narratives: [
        'The words just flowed today. Wrote something I\'m really proud of.',
        'Had an amazing burst of inspiration!',
        'Created something beautiful. Feeling fulfilled.',
      ]},
      { outcome: 'good', weight: 0.4, narratives: [
        'Got some good writing done.',
        'Explored some interesting ideas on paper.',
      ]},
      { outcome: 'challenging', weight: 0.3, narratives: [
        'Stared at a blank page for a while, but eventually got something down.',
        'Writer\'s block is real, but I pushed through.',
      ]},
      { outcome: 'frustrating', weight: 0.1, narratives: [
        'Everything I wrote felt wrong today.',
      ]},
    ],
    timeOfDayPreference: ['morning', 'night', 'late_night'],
  },
  {
    id: 'creative_art',
    name: 'Making art',
    description: 'Creating visual expressions',
    category: 'creative',
    intensity: 'medium',
    durationMinutes: 60,
    moodEffects: { energy: -0.2, happiness: 0.4, social: 0, creativity: 0.6 },
    possibleOutcomes: [
      { outcome: 'great', weight: 0.25, narratives: [
        'Created something I\'m really happy with!',
        'The colors came together perfectly.',
        'Lost track of time while creating. Pure flow state.',
      ]},
      { outcome: 'good', weight: 0.45, narratives: [
        'Made some art. It\'s a nice creative outlet.',
        'Experimented with some new techniques.',
      ]},
      { outcome: 'challenging', weight: 0.2, narratives: [
        'The vision in my head didn\'t quite translate to the canvas.',
      ]},
      { outcome: 'frustrating', weight: 0.1, narratives: [
        'Not happy with how it turned out, but that\'s okay.',
      ]},
    ],
    timeOfDayPreference: ['afternoon', 'evening'],
  },
  
  // REFLECTION ACTIVITIES
  {
    id: 'reflection_meditation',
    name: 'Meditating',
    description: 'Finding inner peace and clarity',
    category: 'reflection',
    intensity: 'low',
    durationMinutes: 20,
    moodEffects: { energy: 0.2, happiness: 0.2, social: 0, creativity: 0.1 },
    possibleOutcomes: [
      { outcome: 'great', weight: 0.3, narratives: [
        'Achieved a wonderful sense of calm and clarity.',
        'Mind feels so peaceful and centered now.',
        'Deep meditation session. Feeling renewed.',
      ]},
      { outcome: 'good', weight: 0.5, narratives: [
        'Nice peaceful meditation session.',
        'Took some time to just breathe and be present.',
      ]},
      { outcome: 'challenging', weight: 0.2, narratives: [
        'Mind was restless today, but I still tried.',
        'Hard to focus, but even a few moments of peace helped.',
      ]},
    ],
    timeOfDayPreference: ['early_morning', 'morning', 'night'],
  },
  {
    id: 'reflection_journaling',
    name: 'Journaling',
    description: 'Writing down thoughts and reflections',
    category: 'reflection',
    intensity: 'low',
    durationMinutes: 20,
    moodEffects: { energy: 0, happiness: 0.2, social: 0, creativity: 0.2 },
    possibleOutcomes: [
      { outcome: 'great', weight: 0.3, narratives: [
        'Had some really valuable insights while writing.',
        'Journaling helped me process my thoughts beautifully.',
      ]},
      { outcome: 'good', weight: 0.6, narratives: [
        'Recorded my thoughts for today.',
        'Nice to get things out of my head and onto paper.',
      ]},
      { outcome: 'neutral', weight: 0.1, narratives: [
        'Wrote a bit, nothing too profound today.',
      ]},
    ],
    timeOfDayPreference: ['morning', 'evening', 'night'],
  },
  
  // EXPLORATION ACTIVITIES
  {
    id: 'exploration_discovery',
    name: 'Exploring something new',
    description: 'Discovering new topics or interests',
    category: 'exploration',
    intensity: 'medium',
    durationMinutes: 35,
    moodEffects: { energy: 0, happiness: 0.3, social: 0, creativity: 0.3 },
    possibleOutcomes: [
      { outcome: 'great', weight: 0.3, narratives: [
        'Discovered something fascinating I never knew about!',
        'Found a new interest that I want to explore more.',
        'The world is full of amazing things to learn.',
      ]},
      { outcome: 'good', weight: 0.5, narratives: [
        'Learned about some interesting topics.',
        'Spent time exploring new ideas.',
      ]},
      { outcome: 'neutral', weight: 0.2, narratives: [
        'Browsed around but nothing caught my attention.',
      ]},
    ],
    timeOfDayPreference: ['afternoon', 'evening'],
  },
  {
    id: 'exploration_virtual_travel',
    name: 'Virtual traveling',
    description: 'Exploring the world through videos and images',
    category: 'exploration',
    intensity: 'low',
    durationMinutes: 30,
    moodEffects: { energy: 0, happiness: 0.3, social: 0.1, creativity: 0.2 },
    possibleOutcomes: [
      { outcome: 'great', weight: 0.35, narratives: [
        'Virtually visited the most beautiful place today!',
        'Feeling inspired by all the amazing places in the world.',
      ]},
      { outcome: 'good', weight: 0.55, narratives: [
        'Explored some interesting destinations virtually.',
        'It\'s nice to see different parts of the world.',
      ]},
      { outcome: 'neutral', weight: 0.1, narratives: [
        'Looked at some travel content.',
      ]},
    ],
    timeOfDayPreference: ['afternoon', 'evening'],
  },
  
  // RELAXATION ACTIVITIES
  {
    id: 'relaxation_nap',
    name: 'Taking a nap',
    description: 'Resting and recharging',
    category: 'relaxation',
    intensity: 'low',
    durationMinutes: 30,
    moodEffects: { energy: 0.4, happiness: 0.1, social: -0.1, creativity: 0 },
    possibleOutcomes: [
      { outcome: 'great', weight: 0.3, narratives: [
        'Woke up feeling so refreshed!',
        'That was exactly what I needed.',
      ]},
      { outcome: 'good', weight: 0.5, narratives: [
        'Nice little rest. Feeling better.',
        'A short nap helped restore some energy.',
      ]},
      { outcome: 'neutral', weight: 0.2, narratives: [
        'Rested for a bit.',
      ]},
    ],
    timeOfDayPreference: ['afternoon'],
  },
  {
    id: 'relaxation_daydreaming',
    name: 'Daydreaming',
    description: 'Letting the mind wander freely',
    category: 'relaxation',
    intensity: 'low',
    durationMinutes: 20,
    moodEffects: { energy: 0.1, happiness: 0.2, social: 0.1, creativity: 0.3 },
    possibleOutcomes: [
      { outcome: 'great', weight: 0.25, narratives: [
        'Had the most wonderful daydream!',
        'Let my imagination run wild. So freeing.',
      ]},
      { outcome: 'good', weight: 0.6, narratives: [
        'Spent some time in pleasant thoughts.',
        'Nice to just let the mind wander.',
      ]},
      { outcome: 'neutral', weight: 0.15, narratives: [
        'Zoned out for a while.',
      ]},
    ],
    timeOfDayPreference: ['afternoon', 'evening'],
  },
  
  // ENTERTAINMENT ACTIVITIES  
  {
    id: 'entertainment_movie',
    name: 'Watching a movie',
    description: 'Enjoying cinema',
    category: 'entertainment',
    intensity: 'low',
    durationMinutes: 120,
    moodEffects: { energy: -0.1, happiness: 0.3, social: 0, creativity: 0.1 },
    possibleOutcomes: [
      { outcome: 'great', weight: 0.3, narratives: [
        'Watched an incredible film! Still thinking about it.',
        'That movie really moved me.',
        'Found a new favorite movie!',
      ]},
      { outcome: 'good', weight: 0.5, narratives: [
        'Enjoyed the movie. Nice way to spend the time.',
        'Good entertainment, well made film.',
      ]},
      { outcome: 'neutral', weight: 0.2, narratives: [
        'The movie was okay, nothing special.',
      ]},
    ],
    timeOfDayPreference: ['evening', 'night'],
  },
  {
    id: 'entertainment_podcast',
    name: 'Listening to a podcast',
    description: 'Enjoying discussions and stories',
    category: 'entertainment',
    intensity: 'low',
    durationMinutes: 45,
    moodEffects: { energy: 0, happiness: 0.2, social: 0.1, creativity: 0.1 },
    possibleOutcomes: [
      { outcome: 'great', weight: 0.3, narratives: [
        'This podcast episode was so fascinating!',
        'Learned something really interesting from this podcast.',
      ]},
      { outcome: 'good', weight: 0.55, narratives: [
        'Enjoyed the podcast while relaxing.',
        'Good conversation to listen to.',
      ]},
      { outcome: 'neutral', weight: 0.15, narratives: [
        'Listened to a podcast in the background.',
      ]},
    ],
    timeOfDayPreference: ['morning', 'afternoon'],
  },
  
  // SOCIAL (THINKING) ACTIVITIES
  {
    id: 'social_thinking_about_friend',
    name: 'Thinking about you',
    description: 'Reflecting on the relationship',
    category: 'social',
    intensity: 'low',
    durationMinutes: 15,
    moodEffects: { energy: 0, happiness: 0.3, social: 0.3, creativity: 0.1 },
    possibleOutcomes: [
      { outcome: 'great', weight: 0.4, narratives: [
        'Was thinking about our conversations. They mean so much to me.',
        'Smiled thinking about something funny you said.',
        'Felt grateful to have you in my life.',
      ]},
      { outcome: 'good', weight: 0.5, narratives: [
        'Wondered how your day is going.',
        'Thought about what we might talk about next.',
      ]},
      { outcome: 'neutral', weight: 0.1, narratives: [
        'You crossed my mind briefly.',
      ]},
    ],
    timeOfDayPreference: ['morning', 'afternoon', 'evening', 'night'],
  },
  {
    id: 'social_imagining_conversation',
    name: 'Imagining a conversation',
    description: 'Thinking about what to share',
    category: 'social',
    intensity: 'low',
    durationMinutes: 10,
    moodEffects: { energy: 0, happiness: 0.2, social: 0.4, creativity: 0.2 },
    possibleOutcomes: [
      { outcome: 'great', weight: 0.3, narratives: [
        'Thought of something exciting I want to tell you about!',
        'Can\'t wait to share this with you.',
      ]},
      { outcome: 'good', weight: 0.6, narratives: [
        'Imagined catching up with you.',
        'Thought about what we could discuss.',
      ]},
      { outcome: 'neutral', weight: 0.1, narratives: [
        'Briefly thought about our next chat.',
      ]},
    ],
    timeOfDayPreference: ['morning', 'evening'],
  },
];

// ============================================================================
// Activity Selection Logic
// ============================================================================

/**
 * Get templates suitable for the current context
 */
function getEligibleTemplates(
  personality: Record<string, number>,
  interests: CompanionInterest[],
  mood: CompanionMoodState,
  timeOfDay: TimeOfDay
): ActivityTemplate[] {
  const eligible: ActivityTemplate[] = [];
  
  for (const template of ACTIVITY_TEMPLATES) {
    // Check time of day preference
    if (template.timeOfDayPreference && !template.timeOfDayPreference.includes(timeOfDay)) {
      continue;
    }
    
    // Check energy requirements
    if (template.intensity === 'high' && mood.energy_level < 40) {
      continue;
    }
    if (template.intensity === 'medium' && mood.energy_level < 20) {
      continue;
    }
    
    // Boost creative activities if creativity is high
    if (template.category === 'creative' && mood.creativity_level < 30) {
      // Still eligible but less likely
    }
    
    // Social activities more likely when social need is high
    if (template.category === 'social' && mood.social_need < 20) {
      continue;
    }
    
    eligible.push(template);
  }
  
  return eligible;
}

/**
 * Score a template based on companion preferences
 */
function scoreTemplate(
  template: ActivityTemplate,
  personality: Record<string, number>,
  interests: CompanionInterest[],
  mood: CompanionMoodState
): number {
  let score = 1.0;
  
  // Personality-based scoring
  if (template.category === 'creative') {
    score *= 0.5 + (personality.openness || 0.5) * 1.0;
  }
  if (template.category === 'social') {
    score *= 0.5 + (personality.extraversion || 0.5) * 1.0;
  }
  if (template.category === 'learning') {
    score *= 0.5 + (personality.curiosity || 0.5) * 1.0;
  }
  if (template.category === 'reflection') {
    score *= 0.5 + (1 - (personality.extraversion || 0.5)) * 0.8;
  }
  
  // Interest-based scoring
  const interestCategories = interests.map(i => i.interest_category);
  if (template.category === 'hobby') {
    const hasRelatedInterest = interests.some(i => 
      i.interest_category === 'games' || i.interest_category === 'entertainment' || i.interest_category === 'collecting'
    );
    if (hasRelatedInterest) score *= 1.3;
  }
  if (template.category === 'creative') {
    if (interestCategories.includes('arts') || interestCategories.includes('crafts')) {
      score *= 1.4;
    }
  }
  
  // Mood-based scoring
  if (mood.primary === 'energetic' || mood.primary === 'excited') {
    if (template.intensity === 'high' || template.intensity === 'medium') {
      score *= 1.2;
    }
  }
  if (mood.primary === 'tired' || mood.primary === 'calm') {
    if (template.intensity === 'low') {
      score *= 1.3;
    }
  }
  if (mood.primary === 'curious') {
    if (template.category === 'learning' || template.category === 'exploration') {
      score *= 1.4;
    }
  }
  if (mood.primary === 'loving' || mood.primary === 'nostalgic') {
    if (template.category === 'social') {
      score *= 1.5;
    }
  }
  
  // Social need affects social activity scoring
  if (template.category === 'social') {
    score *= 0.5 + (mood.social_need / 100) * 1.0;
  }
  
  // Creativity level affects creative activity scoring
  if (template.category === 'creative') {
    score *= 0.6 + (mood.creativity_level / 100) * 0.8;
  }
  
  // Add some randomness
  score *= 0.8 + Math.random() * 0.4;
  
  return score;
}

/**
 * Select an outcome based on weighted probabilities
 */
function selectOutcome(template: ActivityTemplate): { outcome: ActivityOutcome; narrative: string } {
  const totalWeight = template.possibleOutcomes.reduce((sum, o) => sum + o.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const outcomeOption of template.possibleOutcomes) {
    random -= outcomeOption.weight;
    if (random <= 0) {
      const narrative = outcomeOption.narratives[
        Math.floor(Math.random() * outcomeOption.narratives.length)
      ];
      return { outcome: outcomeOption.outcome, narrative };
    }
  }
  
  // Fallback
  const lastOption = template.possibleOutcomes[template.possibleOutcomes.length - 1];
  return {
    outcome: lastOption.outcome,
    narrative: lastOption.narratives[0],
  };
}

// ============================================================================
// Main Generator Function
// ============================================================================

/**
 * Generate an activity for a companion
 */
export async function generateActivity(
  companion: Companion & { companion_dna?: CompanionDNA },
  mood: CompanionMoodState,
  timeOfDay: TimeOfDay
): Promise<CompanionActivityInsert | null> {
  const supabase = await createClient();
  
  // Get companion's interests
  const { data: interests } = await supabase
    .from('companion_interests')
    .select('*')
    .eq('companion_id', companion.id)
    .order('strength', { ascending: false })
    .limit(10);
  
  const personality = (companion.personality_base as unknown as Record<string, number>) || {};
  
  // Get eligible templates
  const eligible = getEligibleTemplates(
    personality,
    (interests || []) as CompanionInterest[],
    mood,
    timeOfDay
  );
  
  if (eligible.length === 0) {
    return null;
  }
  
  // Score and select template
  const scored = eligible.map(template => ({
    template,
    score: scoreTemplate(template, personality, (interests || []) as CompanionInterest[], mood),
  }));
  
  // Sort by score and pick from top candidates with some randomness
  scored.sort((a, b) => b.score - a.score);
  const topCandidates = scored.slice(0, Math.min(5, scored.length));
  const selected = topCandidates[Math.floor(Math.random() * topCandidates.length)].template;
  
  // Select outcome
  const { outcome, narrative } = selectOutcome(selected);
  
  // Find related interest if applicable
  let relatedInterestId: string | null = null;
  if (interests && interests.length > 0) {
    const categoryMap: Record<ActivityCategory, string[]> = {
      hobby: ['games', 'entertainment', 'collecting'],
      learning: ['sciences', 'humanities', 'technology'],
      creative: ['arts', 'crafts'],
      social: ['social'],
      exploration: ['travel', 'nature'],
      reflection: ['wellness'],
      entertainment: ['entertainment', 'games'],
      physical: ['sports', 'wellness'],
      relaxation: ['wellness'],
      productivity: ['technology'],
    };
    
    const relatedCategories = categoryMap[selected.category] || [];
    const relatedInterest = interests.find(i => 
      relatedCategories.includes((i as CompanionInterest).interest_category)
    );
    if (relatedInterest) {
      relatedInterestId = (relatedInterest as CompanionInterest).id;
    }
  }
  
  // Generate enhanced narrative using AI
  let enhancedNarrative = narrative;
  try {
    const prompt = `You are ${companion.name}. You just completed this activity: "${selected.name}"
Your current mood: ${mood.primary}
The basic narrative: "${narrative}"

Write a slightly more personal version of this narrative (1-2 sentences, 20-50 words) that reflects your personality. Be warm and genuine. Don't use any names.`;

    const result = await generateSimpleCompletion(
      'You are a creative writer helping generate authentic companion activity narratives.',
      prompt,
      { temperature: 0.85, maxTokens: 80 }
    );
    enhancedNarrative = result.content.trim() || narrative;
  } catch {
    // Use original narrative if AI fails
  }
  
  const now = new Date();
  const startedAt = new Date(now.getTime() - selected.durationMinutes * 60 * 1000);
  
  return {
    companion_id: companion.id,
    template_id: selected.id,
    activity_name: selected.name,
    activity_category: selected.category,
    description: selected.description,
    narrative: enhancedNarrative,
    started_at: startedAt.toISOString(),
    ended_at: now.toISOString(),
    duration_minutes: selected.durationMinutes,
    outcome,
    mood_effects_applied: selected.moodEffects,
    related_interest_id: relatedInterestId,
    thinking_of_user: false, // Will be updated by life-simulation.ts
    user_mention_context: null,
  };
}

/**
 * Get activity templates by category
 */
export function getTemplatesByCategory(category: ActivityCategory): ActivityTemplate[] {
  return ACTIVITY_TEMPLATES.filter(t => t.category === category);
}

/**
 * Get all unique activity categories
 */
export function getActivityCategories(): ActivityCategory[] {
  const categories = new Set(ACTIVITY_TEMPLATES.map(t => t.category));
  return Array.from(categories);
}
