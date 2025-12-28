/**
 * AI Provider Configuration
 * 
 * Using DeepSeek V3 via OpenRouter for:
 * - US-based routing (privacy/reliability)
 * - Consistent API format
 * - Fallback options if needed
 * 
 * OpenAI for embeddings (DeepSeek doesn't offer embeddings)
 */

export const AI_CONFIG = {
  // DeepSeek models via OpenRouter
  deepseek: {
    models: {
      chat: 'deepseek/deepseek-chat',        // DeepSeek V3 - excellent quality, cheap
      reasoner: 'deepseek/deepseek-reasoner', // R1 - for complex reasoning if needed
    },
    // Cost per 1M tokens via OpenRouter (slight markup over direct)
    pricing: {
      chat: { input: 0.30, output: 0.50 },
      reasoner: { input: 0.60, output: 2.20 },
    },
  },
  
  // OpenAI models for embeddings only
  openai: {
    models: {
      embedding: 'text-embedding-3-small',
      embeddingLarge: 'text-embedding-3-large',
    },
    pricing: {
      embedding: 0.02, // per 1M tokens
      embeddingLarge: 0.13,
    },
  },
  
  // OpenRouter base URL
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
  },
} as const;

/**
 * Get the appropriate model based on subscription tier
 * Using DeepSeek for all tiers - differentiate by limits, not model quality
 */
export function getModelForTier(tier: string): string {
  // All tiers get the same great model
  // Differentiation is in message limits and features, not AI quality
  return AI_CONFIG.deepseek.models.chat;
}

/**
 * Get max tokens for response based on tier
 */
export function getMaxTokensForTier(tier: string): number {
  switch (tier) {
    case 'ultimate':
      return 2000;  // Longer responses
    case 'pro':
      return 1500;
    case 'basic':
      return 1000;
    default:
      return 800;   // Trial users
  }
}

/**
 * Message limits per tier per day
 * No free tier - all users are on trial or paid
 */
export function getMessageLimitForTier(tier: string): number {
  switch (tier) {
    case 'ultimate':
      return 999999; // Unlimited
    case 'pro':
      return 2000;
    case 'basic':
      return 500;
    case 'trial':
      return 100;    // 14-day trial
    default:
      return 0;      // No free tier - must be on trial or paid
  }
}

/**
 * Companion limits per tier
 */
export function getCompanionLimitForTier(tier: string): number {
  switch (tier) {
    case 'ultimate':
      return 10;
    case 'pro':
      return 5;
    case 'basic':
      return 2;
    case 'trial':
      return 1;      // One companion during trial
    default:
      return 0;
  }
}

/**
 * Check if user is in trial period
 */
export function isTrialActive(trialEndsAt: string | null): boolean {
  if (!trialEndsAt) return false;
  return new Date(trialEndsAt) > new Date();
}

/**
 * Calculate trial days remaining
 */
export function getTrialDaysRemaining(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0;
  const end = new Date(trialEndsAt);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
