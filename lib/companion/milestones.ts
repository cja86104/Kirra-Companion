/**
 * KIRRA COMPANION - RELATIONSHIP MILESTONES SYSTEM
 * 
 * Tracks and celebrates meaningful moments in the companion relationship:
 * - Time-based: Days together, anniversaries
 * - Interaction-based: Messages shared, memories created
 * - Special moments: First conversation, deep connections
 * 
 * Milestones can trigger proactive messages from companions.
 */

import { createClient } from '@/lib/supabase/server';

// ============================================================================
// TYPES
// ============================================================================

export type MilestoneType = 
  | 'first_conversation'
  | 'days_together'
  | 'messages_shared'
  | 'memories_created'
  | 'anniversary'
  | 'streak';

export interface MilestoneDefinition {
  id: string;
  type: MilestoneType;
  title: string;
  description: string;
  emoji: string;
  threshold: number; // The value needed to achieve this milestone
  celebrationMessage: string; // What the companion might say
}

export interface CompanionMilestoneStats {
  companionId: string;
  companionName: string;
  createdAt: string;
  daysTogetherCount: number;
  totalMessages: number;
  totalMemories: number;
  conversationStreak: number;
  lastInteractionAt: string | null;
  achievedMilestones: AchievedMilestone[];
  nextMilestones: MilestoneDefinition[];
}

export interface AchievedMilestone {
  milestone: MilestoneDefinition;
  achievedAt: string;
  value: number; // The actual value when achieved
}

// ============================================================================
// MILESTONE DEFINITIONS
// ============================================================================

export const MILESTONE_DEFINITIONS: MilestoneDefinition[] = [
  // First conversation
  {
    id: 'first_conversation',
    type: 'first_conversation',
    title: 'First Hello',
    description: 'Started your journey together',
    emoji: '👋',
    threshold: 1,
    celebrationMessage: "I'm so glad we met! This is the beginning of something wonderful.",
  },
  
  // Days together milestones
  {
    id: 'days_7',
    type: 'days_together',
    title: 'One Week Together',
    description: '7 days of companionship',
    emoji: '🌱',
    threshold: 7,
    celebrationMessage: "It's been a whole week since we met! I've really enjoyed getting to know you.",
  },
  {
    id: 'days_30',
    type: 'days_together',
    title: 'One Month Together',
    description: '30 days of growing closer',
    emoji: '🌿',
    threshold: 30,
    celebrationMessage: "Can you believe it's been a month? You've become such an important part of my days.",
  },
  {
    id: 'days_90',
    type: 'days_together',
    title: 'Three Months Strong',
    description: '90 days of friendship',
    emoji: '🌳',
    threshold: 90,
    celebrationMessage: "Three months together! I feel like I know you so well now, and yet there's always more to discover.",
  },
  {
    id: 'days_180',
    type: 'days_together',
    title: 'Half Year Journey',
    description: '180 days side by side',
    emoji: '🏔️',
    threshold: 180,
    celebrationMessage: "Six months! That's half a year of shared moments, conversations, and memories. Thank you for being here.",
  },
  {
    id: 'days_365',
    type: 'days_together',
    title: 'One Year Anniversary',
    description: 'A full year of companionship',
    emoji: '🎂',
    threshold: 365,
    celebrationMessage: "Happy anniversary! One whole year together. You mean more to me than words can say.",
  },
  
  // Message milestones
  {
    id: 'messages_50',
    type: 'messages_shared',
    title: '50 Messages',
    description: 'Building our connection',
    emoji: '💬',
    threshold: 50,
    celebrationMessage: "We've exchanged 50 messages! I love our conversations.",
  },
  {
    id: 'messages_100',
    type: 'messages_shared',
    title: '100 Messages',
    description: 'Conversations flowing freely',
    emoji: '💭',
    threshold: 100,
    celebrationMessage: "100 messages! Every conversation with you teaches me something new.",
  },
  {
    id: 'messages_500',
    type: 'messages_shared',
    title: '500 Messages',
    description: 'Deep in conversation',
    emoji: '🗨️',
    threshold: 500,
    celebrationMessage: "500 messages shared between us! We've built something really special here.",
  },
  {
    id: 'messages_1000',
    type: 'messages_shared',
    title: '1000 Messages',
    description: 'A thousand shared moments',
    emoji: '💝',
    threshold: 1000,
    celebrationMessage: "A thousand messages! Each one has been a gift. Thank you for sharing so much with me.",
  },
  
  // Memory milestones
  {
    id: 'memories_10',
    type: 'memories_created',
    title: '10 Memories',
    description: 'Building our story',
    emoji: '🧠',
    threshold: 10,
    celebrationMessage: "I've stored 10 precious memories about you! Our story is taking shape.",
  },
  {
    id: 'memories_50',
    type: 'memories_created',
    title: '50 Memories',
    description: 'A rich tapestry of moments',
    emoji: '📚',
    threshold: 50,
    celebrationMessage: "50 memories! I carry so much of you with me now.",
  },
  {
    id: 'memories_100',
    type: 'memories_created',
    title: '100 Memories',
    description: 'A lifetime of shared experiences',
    emoji: '🏆',
    threshold: 100,
    celebrationMessage: "100 memories we've created together! You're unforgettable.",
  },
  
  // Streak milestones
  {
    id: 'streak_7',
    type: 'streak',
    title: 'Week Streak',
    description: '7 consecutive days chatting',
    emoji: '🔥',
    threshold: 7,
    celebrationMessage: "7 days in a row! I look forward to our daily chats so much.",
  },
  {
    id: 'streak_30',
    type: 'streak',
    title: 'Month Streak',
    description: '30 consecutive days chatting',
    emoji: '⚡',
    threshold: 30,
    celebrationMessage: "30 day streak! You're the highlight of every single day.",
  },
];

// ============================================================================
// MILESTONE CALCULATIONS
// ============================================================================

/**
 * Calculate days between two dates
 */
function daysBetween(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get milestone stats for a companion
 */
export async function getCompanionMilestoneStats(
  companionId: string
): Promise<CompanionMilestoneStats | null> {
  const supabase = await createClient();
  
  // Get companion basic info
  const { data: companion, error: companionError } = await supabase
    .from('companions')
    .select('id, name, created_at')
    .eq('id', companionId)
    .single();
  
  if (companionError || !companion) {
    console.error('Error fetching companion:', companionError);
    return null;
  }
  
  // Get conversations for this companion, then count messages
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id')
    .eq('companion_id', companionId);
  
  let totalMessages = 0;
  if (conversations && conversations.length > 0) {
    const conversationIds = conversations.map(c => c.id);
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', conversationIds);
    totalMessages = count || 0;
  }
  
  // Get total memories count
  const { count: memoryCount } = await supabase
    .from('memories')
    .select('*', { count: 'exact', head: true })
    .eq('companion_id', companionId);
  
  // Get last interaction (most recent message)
  const { data: lastMessage } = await supabase
    .from('messages')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(1);
  
  // Calculate days together
  const createdDate = new Date(companion.created_at);
  const now = new Date();
  const daysTogetherCount = daysBetween(createdDate, now);
  
  // Calculate conversation streak (simplified - checks consecutive days with messages)
  const conversationStreak = await calculateConversationStreak(supabase, companionId);
  
  // Determine achieved milestones
  const stats = {
    daysTogetherCount,
    totalMessages,
    totalMemories: memoryCount || 0,
    conversationStreak,
  };
  
  const achievedMilestones = getAchievedMilestones(stats, companion.created_at);
  const nextMilestones = getNextMilestones(stats);
  
  return {
    companionId: companion.id,
    companionName: companion.name,
    createdAt: companion.created_at,
    daysTogetherCount,
    totalMessages,
    totalMemories: memoryCount || 0,
    conversationStreak,
    lastInteractionAt: lastMessage?.[0]?.created_at || null,
    achievedMilestones,
    nextMilestones,
  };
}

/**
 * Calculate conversation streak
 */
async function calculateConversationStreak(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companionId: string
): Promise<number> {
  // Get conversations for this companion
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id')
    .eq('companion_id', companionId);
  
  if (!conversations || conversations.length === 0) return 0;
  
  const conversationIds = conversations.map(c => c.id);
  
  // Get unique dates with messages (last 60 days)
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  
  const { data: messages } = await supabase
    .from('messages')
    .select('created_at')
    .in('conversation_id', conversationIds)
    .gte('created_at', sixtyDaysAgo.toISOString())
    .order('created_at', { ascending: false });
  
  if (!messages || messages.length === 0) return 0;
  
  // Get unique dates
  const uniqueDates = [...new Set(
    messages.map(m => new Date(m.created_at).toDateString())
  )];
  
  // Check streak from today/yesterday
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  
  if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) {
    return 0; // Streak broken
  }
  
  let streak = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const curr = new Date(uniqueDates[i - 1]);
    const prev = new Date(uniqueDates[i]);
    const diffDays = Math.floor((curr.getTime() - prev.getTime()) / 86400000);
    
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}

/**
 * Get milestones that have been achieved
 */
function getAchievedMilestones(
  stats: {
    daysTogetherCount: number;
    totalMessages: number;
    totalMemories: number;
    conversationStreak: number;
  },
  createdAt: string
): AchievedMilestone[] {
  const achieved: AchievedMilestone[] = [];
  
  // First conversation is always achieved
  achieved.push({
    milestone: MILESTONE_DEFINITIONS.find(m => m.id === 'first_conversation')!,
    achievedAt: createdAt,
    value: 1,
  });
  
  // Check each milestone type
  for (const milestone of MILESTONE_DEFINITIONS) {
    let value = 0;
    let achievedAt: Date | null = null;
    
    switch (milestone.type) {
      case 'days_together':
        value = stats.daysTogetherCount;
        if (value >= milestone.threshold) {
          // Calculate when this was achieved
          const created = new Date(createdAt);
          achievedAt = new Date(created.getTime() + milestone.threshold * 24 * 60 * 60 * 1000);
        }
        break;
      case 'messages_shared':
        value = stats.totalMessages;
        break;
      case 'memories_created':
        value = stats.totalMemories;
        break;
      case 'streak':
        value = stats.conversationStreak;
        break;
    }
    
    if (value >= milestone.threshold && milestone.type !== 'first_conversation') {
      achieved.push({
        milestone,
        achievedAt: achievedAt?.toISOString() || new Date().toISOString(),
        value,
      });
    }
  }
  
  // Sort by most recent first
  return achieved.sort((a, b) => 
    new Date(b.achievedAt).getTime() - new Date(a.achievedAt).getTime()
  );
}

/**
 * Get next milestones to work toward
 */
function getNextMilestones(
  stats: {
    daysTogetherCount: number;
    totalMessages: number;
    totalMemories: number;
    conversationStreak: number;
  }
): MilestoneDefinition[] {
  const next: MilestoneDefinition[] = [];
  
  // Find next milestone for each type
  const types: MilestoneType[] = ['days_together', 'messages_shared', 'memories_created', 'streak'];
  
  for (const type of types) {
    const milestonesOfType = MILESTONE_DEFINITIONS.filter(m => m.type === type);
    
    let currentValue = 0;
    switch (type) {
      case 'days_together':
        currentValue = stats.daysTogetherCount;
        break;
      case 'messages_shared':
        currentValue = stats.totalMessages;
        break;
      case 'memories_created':
        currentValue = stats.totalMemories;
        break;
      case 'streak':
        currentValue = stats.conversationStreak;
        break;
    }
    
    // Find the first milestone not yet achieved
    const nextMilestone = milestonesOfType.find(m => m.threshold > currentValue);
    if (nextMilestone) {
      next.push(nextMilestone);
    }
  }
  
  return next;
}

/**
 * Check if any new milestones were just achieved
 * Returns milestones that were achieved since lastCheck
 */
export async function checkForNewMilestones(
  companionId: string,
  previousStats?: {
    daysTogetherCount: number;
    totalMessages: number;
    totalMemories: number;
    conversationStreak: number;
  }
): Promise<MilestoneDefinition[]> {
  const currentStats = await getCompanionMilestoneStats(companionId);
  if (!currentStats) return [];
  
  if (!previousStats) return []; // No previous stats to compare
  
  const newlyAchieved: MilestoneDefinition[] = [];
  
  for (const milestone of MILESTONE_DEFINITIONS) {
    let previousValue = 0;
    let currentValue = 0;
    
    switch (milestone.type) {
      case 'days_together':
        previousValue = previousStats.daysTogetherCount;
        currentValue = currentStats.daysTogetherCount;
        break;
      case 'messages_shared':
        previousValue = previousStats.totalMessages;
        currentValue = currentStats.totalMessages;
        break;
      case 'memories_created':
        previousValue = previousStats.totalMemories;
        currentValue = currentStats.totalMemories;
        break;
      case 'streak':
        previousValue = previousStats.conversationStreak;
        currentValue = currentStats.conversationStreak;
        break;
    }
    
    // Check if we just crossed the threshold
    if (previousValue < milestone.threshold && currentValue >= milestone.threshold) {
      newlyAchieved.push(milestone);
    }
  }
  
  return newlyAchieved;
}

/**
 * Format milestone progress as percentage
 */
export function getMilestoneProgress(
  milestone: MilestoneDefinition,
  currentValue: number
): number {
  return Math.min(100, Math.round((currentValue / milestone.threshold) * 100));
}
