/**
 * REAL-TIME DNA EVOLUTION TRIGGERS
 * 
 * Instead of only evolving DNA every 12 hours via cron,
 * this triggers evolution after significant conversation milestones.
 * 
 * Triggers:
 * - After every 20 messages exchanged
 * - After long conversations (10+ messages in one session)
 * - After emotional conversations (detected via keywords)
 * - After humor exchanges (laughter detected)
 * - After deep conversations (questions and long responses)
 * 
 * The evolution runs in the background (non-blocking) so it doesn't
 * slow down chat responses.
 */

import { evolveCompanionDNA, isEvolutionDue } from './dna-evolution';

// ============================================================================
// TYPES
// ============================================================================

export interface ConversationContext {
  companionId: string;
  totalMessages: number;
  sessionMessages: number;
  userMessage: string;
  companionResponse: string;
  lastEvolutionAt?: string | null;
}

export interface TriggerResult {
  shouldTrigger: boolean;
  reason: string;
  priority: 'low' | 'medium' | 'high';
}

// ============================================================================
// TRIGGER DETECTION
// ============================================================================

/**
 * Check if this conversation context should trigger evolution
 */
export function shouldTriggerEvolution(context: ConversationContext): TriggerResult {
  const {
    totalMessages,
    sessionMessages,
    userMessage,
    companionResponse,
  } = context;

  // Message milestone trigger (every 20 messages)
  if (totalMessages > 0 && totalMessages % 20 === 0) {
    return {
      shouldTrigger: true,
      reason: `Message milestone reached: ${totalMessages} total messages`,
      priority: 'medium',
    };
  }

  // Long session trigger (10+ messages in current session)
  if (sessionMessages >= 10 && sessionMessages % 10 === 0) {
    return {
      shouldTrigger: true,
      reason: `Long session: ${sessionMessages} messages in this conversation`,
      priority: 'medium',
    };
  }

  // Emotional conversation trigger
  const emotionalKeywords = [
    /i (love|miss|need|appreciate) you/i,
    /you mean (so much|a lot|everything)/i,
    /thank you (so much|for everything)/i,
    /i('m| am) (so )?(happy|grateful|thankful)/i,
    /you('re| are) (amazing|wonderful|the best)/i,
    /i (really )?(care about|like|adore) you/i,
    /❤️|💕|🥰|😍|💗/,
  ];

  const userIsEmotional = emotionalKeywords.some(p => p.test(userMessage));
  const companionIsEmotional = emotionalKeywords.some(p => p.test(companionResponse));

  if (userIsEmotional && companionIsEmotional) {
    return {
      shouldTrigger: true,
      reason: 'Emotional exchange detected',
      priority: 'high',
    };
  }

  // Humor success trigger
  const humorIndicators = [
    /haha/i, /lol/i, /lmao/i, /😂/, /🤣/, /😆/,
    /that('s| is) (so )?funny/i,
    /you('re| are) hilarious/i,
    /made me laugh/i,
    /good one/i,
  ];

  if (humorIndicators.some(p => p.test(userMessage))) {
    return {
      shouldTrigger: true,
      reason: 'Successful humor exchange',
      priority: 'low',
    };
  }

  // Deep conversation trigger (long responses + questions)
  const isDeepConversation = 
    companionResponse.length > 500 &&
    (userMessage.includes('?') || /why|how|what do you think/i.test(userMessage));

  if (isDeepConversation) {
    return {
      shouldTrigger: true,
      reason: 'Deep conversation detected',
      priority: 'medium',
    };
  }

  // First conversation milestone
  if (totalMessages === 10) {
    return {
      shouldTrigger: true,
      reason: 'First 10 messages milestone',
      priority: 'high',
    };
  }

  // Default: no trigger
  return {
    shouldTrigger: false,
    reason: 'No trigger conditions met',
    priority: 'low',
  };
}

// ============================================================================
// EVOLUTION EXECUTION
// ============================================================================

/**
 * Process evolution trigger after chat
 * This should be called as a non-blocking background task
 */
export async function processEvolutionTrigger(
  context: ConversationContext
): Promise<{
  triggered: boolean;
  evolved: boolean;
  reason: string;
}> {
  try {
    // Check if evolution should trigger
    const triggerResult = shouldTriggerEvolution(context);

    if (!triggerResult.shouldTrigger) {
      return {
        triggered: false,
        evolved: false,
        reason: triggerResult.reason,
      };
    }

    // Check cooldown (minimum 1 hour between real-time evolutions)
    const isDue = await isEvolutionDue(context.companionId, 1);

    if (!isDue) {
      return {
        triggered: true,
        evolved: false,
        reason: 'Evolution triggered but cooldown active (< 1 hour since last)',
      };
    }

    console.log(`[DNA Evolution] Triggering for companion ${context.companionId}: ${triggerResult.reason}`);

    // Run evolution with shorter lookback for real-time (last 4 hours)
    const result = await evolveCompanionDNA(context.companionId, {
      hoursBack: 4,
      minMessages: 5, // Lower threshold for real-time
      forceEvolution: false,
      useAI: triggerResult.priority === 'high', // Only use AI for high-priority triggers
    });

    if (result) {
      console.log(`[DNA Evolution] Success for ${context.companionId}: version ${result.messagesAnalyzed} messages analyzed`);
      return {
        triggered: true,
        evolved: true,
        reason: triggerResult.reason,
      };
    } else {
      return {
        triggered: true,
        evolved: false,
        reason: 'Evolution triggered but not enough data',
      };
    }
  } catch (error) {
    console.error('[DNA Evolution] Error:', error);
    return {
      triggered: true,
      evolved: false,
      reason: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
    };
  }
}

/**
 * Quick check to see if we should even bother checking triggers
 * Used to short-circuit expensive checks
 */
export function quickShouldCheck(totalMessages: number, sessionMessages: number): boolean {
  // Check at milestones
  if (totalMessages > 0 && totalMessages % 20 === 0) return true;
  if (totalMessages === 10) return true;
  
  // Check during long sessions
  if (sessionMessages >= 10 && sessionMessages % 10 === 0) return true;
  
  // Check occasionally (every 5 messages in session)
  if (sessionMessages >= 5 && sessionMessages % 5 === 0) return true;
  
  return false;
}

// ============================================================================
// BATCH EVOLUTION HELPER
// ============================================================================

/**
 * Force evolution for a companion (used for testing or manual triggers)
 */
export async function forceEvolution(
  companionId: string,
  useAI: boolean = true
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const result = await evolveCompanionDNA(companionId, {
      hoursBack: 48, // Look back further for forced evolution
      minMessages: 3,
      forceEvolution: true,
      useAI,
    });

    if (result) {
      return {
        success: true,
        message: `Evolution complete: analyzed ${result.messagesAnalyzed} messages, AI used: ${result.aiAnalysisUsed}`,
      };
    } else {
      return {
        success: false,
        message: 'Evolution returned no result - possibly no DNA record exists',
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
    };
  }
}
