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
import type { MoodState } from '@/types/database';

// ============================================================
// TYPES
// ============================================================

type LifeEventType = 
  | 'thought'
  | 'mood_change'
  | 'milestone'
  | 'social'
  | 'activity'
  | 'dream';

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
  event_type: LifeEventType;
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
    description: () => `We've exchanged 50 messages! Our conversations are becoming more meaningful.`,
  },
  {
    condition: (ctx) => ctx.totalMessages === 100,
    title: '100 Messages Milestone',
    description: (ctx) => `100 messages! ${ctx.companionName.split(' ')[0]} and I are really getting to know each other.`,
  },
  {
    condition: (ctx) => ctx.totalMessages === 500,
    title: 'Deep Connection',
    description: () => `500 messages shared. Our bond has grown incredibly strong.`,
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
      return extractSocialEvent();
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

function extractSocialEvent(): GeneratedEvent {
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
 * Returns true if saved successfully.
 */
export async function saveLifeEvent(
  companionId: string,
  userId: string,
  event: GeneratedEvent,
  currentMood: MoodState | null = null
): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    // Suppress unused parameter warning - userId could be used for triggered_by
    void userId;
    
    // Map event significance based on type
    const significanceMap: Record<LifeEventType, 'trivial' | 'minor' | 'moderate' | 'major' | 'milestone'> = {
      thought: 'trivial',
      mood_change: 'minor',
      social: 'minor',
      activity: 'minor',
      dream: 'moderate',
      milestone: 'milestone',
    };
    
    const eventData = {
      companion_id: companionId,
      event_type: event.event_type,
      title: event.title,
      description: event.description,
      significance: significanceMap[event.event_type],
      emotional_impact: currentMood ? { mood: currentMood } : null,
      metadata: {
        should_notify_user: event.should_notify_user,
        notification_message: event.notification_message,
        notification_sent: false,
      },
      is_shared: false,
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

interface LifeEventRow {
  id: string;
  companion_id: string;
  event_type: string;
  title: string;
  description: string;
  significance: string;
  emotional_impact: unknown;
  triggered_by: string | null;
  metadata: unknown;
  is_shared: boolean;
  created_at: string;
}

/**
 * Get recent life events for a companion.
 */
export async function getLifeEvents(
  companionId: string,
  limit: number = 20
): Promise<LifeEventRow[]> {
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
  
  return (data || []) as LifeEventRow[];
}

interface LifeEventWithCompanion extends LifeEventRow {
  companions: {
    id: string;
    name: string;
    avatar_url: string | null;
  } | null;
}

/**
 * Get life events for multiple companions (for Life Feed page).
 */
export async function getLifeEventsForUser(
  userId: string,
  limit: number = 50
): Promise<LifeEventWithCompanion[]> {
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
  
  const companionIds = (companions as { id: string }[]).map(c => c.id);
  
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
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching life events:', error);
    return [];
  }
  
  return (data || []) as LifeEventWithCompanion[];
}
