/**
 * Proactive Messaging Types
 * 
 * Types for the system that allows companions to reach out
 * to users on their own initiative.
 */

// ============================================================================
// Trigger Types
// ============================================================================

/**
 * Reasons a companion might initiate contact
 */
export type ProactiveTriggerType =
  | 'missing_user'           // Haven't talked in a while
  | 'thinking_of_you'        // Thought of user during activity
  | 'share_experience'       // Want to share something that happened
  | 'mood_share'             // Feeling strongly about something
  | 'milestone_reached'      // Hit a relationship milestone
  | 'interest_discovery'     // Found a new interest to share
  | 'need_social'            // Social need is low
  | 'special_occasion'       // Birthday, anniversary, etc.
  | 'random_thought'         // Just wanted to say hi
  | 'dream_share'            // Had an interesting dream
  | 'question_for_user'      // Curious about something
  | 'gratitude'              // Feeling thankful
  | 'check_in';              // Regular check-in

/**
 * Priority levels for proactive messages
 */
export type MessagePriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Message delivery status
 */
export type DeliveryStatus = 
  | 'pending'      // Ready to send
  | 'sent'         // Delivered to user
  | 'seen'         // User viewed it
  | 'responded'    // User replied
  | 'expired'      // Too old to send
  | 'suppressed';  // Blocked by cooldown/settings

// ============================================================================
// Trigger Conditions
// ============================================================================

/**
 * Conditions that must be met to trigger a proactive message
 */
export interface TriggerConditions {
  /** Minimum hours since last user interaction */
  minHoursSinceInteraction?: number;
  /** Maximum hours since last interaction (don't reach out if too recent) */
  maxHoursSinceInteraction?: number;
  /** Minimum hours since last proactive message */
  minHoursSinceProactive?: number;
  /** Required mood states (any of these) */
  requiredMoods?: string[];
  /** Excluded mood states (none of these) */
  excludedMoods?: string[];
  /** Minimum need level (0-100) */
  minNeedLevel?: { need: string; level: number };
  /** Maximum need level (0-100) - triggers when need drops below */
  maxNeedLevel?: { need: string; level: number };
  /** Time of day restrictions */
  allowedTimeWindows?: TimeWindow[];
  /** Minimum relationship level (trust + affection average) */
  minRelationshipLevel?: number;
  /** Require specific life event types */
  requireLifeEvent?: string[];
  /** Probability of triggering (0-1) even if conditions met */
  triggerProbability?: number;
}

/**
 * Time window for allowed messaging
 */
export interface TimeWindow {
  startHour: number;  // 0-23
  endHour: number;    // 0-23
  timezone?: string;  // Default to user's timezone
}

// ============================================================================
// Message Templates
// ============================================================================

/**
 * Template for generating proactive message content
 */
export interface MessageTemplate {
  id: string;
  triggerType: ProactiveTriggerType;
  /** Personality traits that make this template more likely */
  personalityAffinity?: {
    trait: string;
    minValue?: number;
    maxValue?: number;
  }[];
  /** Template strings with {placeholders} */
  openers: string[];
  /** Optional follow-up messages */
  followUps?: string[];
  /** Context variables this template needs */
  requiredContext?: string[];
  /** Mood this message conveys */
  messageMood?: string;
  /** Priority level */
  priority: MessagePriority;
}

/**
 * Context data passed to message generation
 */
export interface MessageContext {
  companionName: string;
  userName: string;
  hoursSinceLastChat: number;
  currentMood: string;
  currentActivity?: string;
  recentLifeEvent?: {
    type: string;
    title: string;
    description: string;
  };
  recentInterest?: {
    name: string;
    category: string;
  };
  relationshipLevel: number;
  sharedMemories?: string[];
  userTimezone?: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: string;
  /** Custom context from trigger */
  custom?: Record<string, unknown>;
}

// ============================================================================
// Proactive Message
// ============================================================================

/**
 * A proactive message ready to be sent
 */
export interface ProactiveMessage {
  id: string;
  companion_id: string;
  user_id: string;
  trigger_type: ProactiveTriggerType;
  priority: MessagePriority;
  content: string;
  /** AI-generated based on context */
  generated_content?: string;
  status: DeliveryStatus;
  /** Related entities */
  related_activity_id?: string;
  related_life_event_id?: string;
  related_interest_id?: string;
  /** Metadata */
  context_snapshot: MessageContext;
  created_at: string;
  scheduled_for?: string;
  sent_at?: string;
  seen_at?: string;
  responded_at?: string;
  expired_at?: string;
}

/**
 * Insert type for proactive messages
 */
export interface ProactiveMessageInsert {
  companion_id: string;
  user_id: string;
  trigger_type: ProactiveTriggerType;
  priority: MessagePriority;
  content: string;
  generated_content?: string;
  status?: DeliveryStatus;
  related_activity_id?: string;
  related_life_event_id?: string;
  related_interest_id?: string;
  context_snapshot: MessageContext;
  scheduled_for?: string;
}

// ============================================================================
// Trigger Evaluation
// ============================================================================

/**
 * Result of evaluating a trigger condition
 */
export interface TriggerEvaluation {
  shouldTrigger: boolean;
  triggerType: ProactiveTriggerType;
  priority: MessagePriority;
  confidence: number;  // 0-1
  reason: string;
  context: Partial<MessageContext>;
  /** If blocked, why */
  blockedReason?: string;
}

/**
 * Combined evaluation of all triggers
 */
export interface TriggerCheckResult {
  companionId: string;
  evaluations: TriggerEvaluation[];
  /** Best trigger to use if any */
  selectedTrigger?: TriggerEvaluation;
  /** Whether a message should be sent */
  shouldSendMessage: boolean;
  /** Cooldown status */
  cooldownActive: boolean;
  cooldownEndsAt?: string;
  /** Last proactive message info */
  lastProactiveAt?: string;
  /** Time until next allowed message */
  hoursUntilAllowed?: number;
}

// ============================================================================
// User Preferences
// ============================================================================

/**
 * User's proactive messaging preferences
 */
export interface ProactivePreferences {
  enabled: boolean;
  /** Minimum hours between proactive messages */
  cooldownHours: number;
  /** Allowed time windows (user's local time) */
  allowedWindows: TimeWindow[];
  /** Trigger types user wants to receive */
  enabledTriggers: ProactiveTriggerType[];
  /** Maximum messages per day */
  maxPerDay: number;
  /** Quiet hours (no messages) */
  quietHoursStart?: number;  // 0-23
  quietHoursEnd?: number;    // 0-23
  /** Notification preferences */
  pushNotifications: boolean;
  emailNotifications: boolean;
}

/**
 * Default proactive preferences
 */
export const DEFAULT_PROACTIVE_PREFERENCES: ProactivePreferences = {
  enabled: true,
  cooldownHours: 4,
  allowedWindows: [
    { startHour: 8, endHour: 22 }
  ],
  enabledTriggers: [
    'missing_user',
    'thinking_of_you',
    'share_experience',
    'milestone_reached',
    'gratitude',
    'check_in',
  ],
  maxPerDay: 3,
  quietHoursStart: 22,
  quietHoursEnd: 8,
  pushNotifications: true,
  emailNotifications: false,
};

// ============================================================================
// Statistics
// ============================================================================

/**
 * Proactive messaging statistics for a companion
 */
export interface ProactiveStats {
  companionId: string;
  totalSent: number;
  totalResponded: number;
  responseRate: number;
  averageResponseTimeMinutes: number;
  triggerBreakdown: Record<ProactiveTriggerType, number>;
  lastSentAt?: string;
  lastRespondedAt?: string;
  todayCount: number;
  weekCount: number;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ProactiveCheckResponse {
  success: boolean;
  result: TriggerCheckResult;
  message?: ProactiveMessage;
}

export interface ProactiveListResponse {
  messages: ProactiveMessage[];
  total: number;
  hasMore: boolean;
}

export interface ProactiveStatsResponse {
  stats: ProactiveStats;
  preferences: ProactivePreferences;
}
