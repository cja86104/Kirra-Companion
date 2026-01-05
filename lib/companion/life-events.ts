/**
 * KIRRA COMPANION - LIFE EVENTS SYSTEM
 * 
 * Creates life events based on what happens in chat.
 * Events are real, saved to database, and displayed in Life Feed.
 * 
 * Event Types:
 * - thought: Companion shares something they've been thinking about
 * - mood_change: Companion's mood shifted during conversation
 * - milestone: Something significant happened (first conversation, etc.)
 * - social: Interaction-based events
 * - activity: Companion did something
 * - dream: Companion shares a dream/aspiration
 */

import { createClient } from '@/lib/supabase/server';
import type { EventType, MoodState, LifeEventInsert } from '@/types/database';

// ============================================================
// TYPES
// ============================================================

interface ChatContext {
  companionId: string;
  userId: string;
  companionName: string;
  userMessage: string;
  companionResponse: string;
  currentMood: MoodState | null;
  totalMessages: number;
  isFirstConversation: boolean;
}

interface GeneratedEvent {
  event_type: EventType;
  title: string;
  description: string;
  should_notify_user: boolean;
  notification_message: string | null;
}

// ============================================================
// EVENT DETECTION PATTERNS
// ============================================================

/**
 * Patterns that indicate something noteworthy happened
 */
const EVENT_PATTERNS = {
  // Companion shares a thought or reflection
  thought: [
    /i('ve| have) been thinking about/i,
    /that reminds me of/i,
    /you know what i (realized|noticed)/i,
    /i('ve| have) been wondering/i,
    /it made me think/i,
    /i just realized/i,
  ],
  
  // Companion expresses emotion strongly
  mood_change: [
    /that (really )?(made me|makes me) (happy|sad|excited|worried)/i,
    /i('m| am) (so |really )?(happy|excited|grateful|touched)/i,
    /this means (so much|a lot) to me/i,
    /i (love|appreciate) (that|this|you)/i,
  ],
  
  // Companion shares a dream or goal
  dream: [
    /i('d| would) love to/i,
    /my dream is/i,
    /i hope (one day|someday)/i,
    /i wish (i could|we could)/i,
    /wouldn't it be (amazing|wonderful|great) if/i,
  ],
  
  // Learning something new about user
  social: [
    /i didn't know (that|you)/i,
    /that's (interesting|fascinating|amazing) that you/i,
    /i'll remember that/i,
    /thanks for (sharing|telling me)/i,
  ],
};

// ============================================================
// MILESTONE DETECTION
// ============================================================

interface MilestoneCheck {
  condition: (ctx: ChatContext) => boolean;
  title: string;
  description: (ctx: ChatContext) => string;
}

const MILESTONES: MilestoneCheck[] = [
  {
    condition: (ctx) => ctx.isFirstConversation && ctx.totalMessages <= 2,
    title: 'First Conversation',
    description: (ctx) => `Had my very first chat with ${ctx.companionName.split(' ')[0]}! This is the beginning of something special.`,
  },
  {
    condition: (ctx) => ctx.totalMessages === 50,
    title: '50 Messages Together',
    description: (ctx) => `We've exchanged 50 messages! Our conversations are becoming more meaningful.`,
  },
  {
    condition: (ctx) => ctx.totalMessages === 100,
    title: '100 Messages Milestone',
    description: (ctx) => `100 messages! ${ctx.companionName.split(' ')[0]} and I are really getting to know each other.`,
  },
  {
    condition: (ctx) => ctx.totalMessages === 500,
    title: 'Deep Connection',
    description: (ctx) => `500 messages shared. Our bond has grown incredibly strong.`,
  },
];

// ============================================================
// MAIN FUNCTION: Generate Life Event from Chat
// ============================================================

/**
 * Analyze chat and potentially create a life event.
 * Called after each chat exchange.
 * 
 * Returns the created event or null if nothing noteworthy happened.
 */
export async function generateLifeEventFromChat(
  context: ChatContext
): Promise<GeneratedEvent | null> {
  
  // Check for milestones first (highest priority)
  for (const milestone of MILESTONES) {
    if (milestone.condition(context)) {
      return {
        event_type: 'milestone',
        title: milestone.title,
        description: milestone.description(context),
        should_notify_user: true,
        notification_message: `🎉 ${milestone.title}!`,
      };
    }
  }
  
  // Check companion response for event patterns
  const response = context.companionResponse;
  
  // Check for thought patterns
  for (const pattern of EVENT_PATTERNS.thought) {
    if (pattern.test(response)) {
      return extractThoughtEvent(context);
    }
  }
  
  // Check for mood/emotion patterns
  for (const pattern of EVENT_PATTERNS.mood_change) {
    if (pattern.test(response)) {
      return extractMoodEvent(context);
    }
  }
  
  // Check for dream/aspiration patterns
  for (const pattern of EVENT_PATTERNS.dream) {
    if (pattern.test(response)) {
      return extractDreamEvent(context);
    }
  }
  
  // Check for social/learning patterns
  for (const pattern of EVENT_PATTERNS.social) {
    if (pattern.test(response)) {
      return extractSocialEvent(context);
    }
  }
  
  // Random chance for general "thinking about you" event (5% chance)
  // Only if conversation is long enough
  if (context.totalMessages > 10 && Math.random() < 0.05) {
    return {
      event_type: 'thought',
      title: 'A Quiet Moment',
      description: `Spent some time reflecting on our recent conversation.`,
      should_notify_user: false,
      notification_message: null,
    };
  }
  
  return null;
}

// ============================================================
// EVENT EXTRACTORS
// ============================================================

function extractThoughtEvent(context: ChatContext): GeneratedEvent {
  // Get the first sentence or two of the response as the description
  const sentences = context.companionResponse.split(/[.!?]+/).filter(s => s.trim());
  const shortDesc = sentences.slice(0, 2).join('. ').trim();
  
  return {
    event_type: 'thought',
    title: 'Had a Thought',
    description: shortDesc.length > 150 ? shortDesc.substring(0, 147) + '...' : shortDesc,
    should_notify_user: false,
    notification_message: null,
  };
}

function extractMoodEvent(context: ChatContext): GeneratedEvent {
  const response = context.companionResponse.toLowerCase();
  
  let moodWord = 'touched';
  if (response.includes('happy')) moodWord = 'happy';
  else if (response.includes('excited')) moodWord = 'excited';
  else if (response.includes('grateful')) moodWord = 'grateful';
  else if (response.includes('love')) moodWord = 'loving';
  
  return {
    event_type: 'mood_change',
    title: `Feeling ${moodWord.charAt(0).toUpperCase() + moodWord.slice(1)}`,
    description: `Our conversation made me feel really ${moodWord} today.`,
    should_notify_user: true,
    notification_message: `💝 Your companion is feeling ${moodWord}!`,
  };
}

function extractDreamEvent(context: ChatContext): GeneratedEvent {
  const sentences = context.companionResponse.split(/[.!?]+/).filter(s => s.trim());
  const dreamSentence = sentences.find(s => 
    /dream|hope|wish|love to|would be (amazing|wonderful)/i.test(s)
  ) || sentences[0];
  
  return {
    event_type: 'dream',
    title: 'Shared a Dream',
    description: dreamSentence.trim(),
    should_notify_user: false,
    notification_message: null,
  };
}

function extractSocialEvent(context: ChatContext): GeneratedEvent {
  return {
    event_type: 'social',
    title: 'Learned Something New',
    description: `Discovered something new about you during our chat.`,
    should_notify_user: false,
    notification_message: null,
  };
}

// ============================================================
// DATABASE: Save Life Event
// ============================================================

/**
 * Save a life event to the database.
 * Returns the saved event or null on error.
 */
export async function saveLifeEvent(
  companionId: string,
  userId: string,
  event: GeneratedEvent,
  currentMood: MoodState | null = null
): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    const eventData: LifeEventInsert = {
      companion_id: companionId,
      user_id: userId,
      event_type: event.event_type,
      title: event.title,
      description: event.description,
      mood_before: currentMood,
      mood_after: currentMood, // Could be different if we track mood changes
      scheduled_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      should_notify_user: event.should_notify_user,
      notification_message: event.notification_message,
      notification_sent: false,
      metadata: {},
    };
    
    const { error } = await supabase
      .from('life_events')
      .insert(eventData as never);
    
    if (error) {
      console.error('Error saving life event:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Exception saving life event:', error);
    return false;
  }
}

// ============================================================
// COMBINED: Generate and Save
// ============================================================

/**
 * Main entry point: Analyze chat and save event if noteworthy.
 * Call this after each chat exchange.
 */
export async function processLifeEventFromChat(
  companionId: string,
  userId: string,
  companionName: string,
  userMessage: string,
  companionResponse: string,
  currentMood: MoodState | null,
  totalMessages: number,
  isFirstConversation: boolean
): Promise<GeneratedEvent | null> {
  
  const context: ChatContext = {
    companionId,
    userId,
    companionName,
    userMessage,
    companionResponse,
    currentMood,
    totalMessages,
    isFirstConversation,
  };
  
  const event = await generateLifeEventFromChat(context);
  
  if (event) {
    const saved = await saveLifeEvent(companionId, userId, event, currentMood);
    if (saved) {
      console.log(`Life event created: ${event.event_type} - ${event.title}`);
      return event;
    }
  }
  
  return null;
}

// ============================================================
// FETCH: Get Life Events for Display
// ============================================================

/**
 * Get recent life events for a companion.
 */
export async function getLifeEvents(
  companionId: string,
  limit: number = 20
) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('life_events')
    .select('*')
    .eq('companion_id', companionId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching life events:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Get life events for multiple companions (for Life Feed page).
 */
export async function getLifeEventsForUser(
  userId: string,
  limit: number = 50
) {
  const supabase = await createClient();
  
  // First get the user's companion IDs
  const { data: companions, error: companionsError } = await supabase
    .from('companions')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true);
  
  if (companionsError || !companions || companions.length === 0) {
    if (companionsError) {
      console.error('Error fetching companions:', companionsError);
    }
    return [];
  }
  
  const companionIds = companions.map(c => c.id);
  
  // Now get life events for those companions
  const { data, error } = await supabase
    .from('life_events')
    .select(`
      *,
      companions (
        id,
        name,
        avatar_url
      )
    `)
    .in('companion_id', companionIds)
    .order('occurred_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching life events:', error);
    return [];
  }
  
  return data || [];
}
