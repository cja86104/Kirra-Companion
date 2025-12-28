/**
 * AI Chat Client - Using DeepSeek via OpenRouter
 * 
 * OpenRouter provides:
 * - US-based routing
 * - OpenAI-compatible API format
 * - Automatic fallbacks
 * - Better reliability than direct DeepSeek
 */

import { getModelForTier, getMaxTokensForTier, AI_CONFIG } from './config';

/**
 * Message format for conversation history
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Options for chat completion
 */
export interface ChatCompletionOptions {
  systemPrompt: string;
  messages: ChatMessage[];
  userMessage: string;
  subscriptionTier?: string;
  temperature?: number;
}

/**
 * Response from chat completion
 */
export interface ChatCompletionResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
  cacheCreated?: number;
  cacheRead?: number;
}

/**
 * Create a chat completion with DeepSeek via OpenRouter
 */
export async function createChatCompletion(
  options: ChatCompletionOptions
): Promise<ChatCompletionResponse> {
  const {
    systemPrompt,
    messages,
    userMessage,
    subscriptionTier = 'trial',
    temperature = 0.8,
  } = options;

  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is not set');
  }

  const model = getModelForTier(subscriptionTier);
  const maxTokens = getMaxTokensForTier(subscriptionTier);

  // Build messages array with system prompt
  const allMessages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messages,
    { role: 'user', content: userMessage },
  ];

  try {
    const response = await fetch(`${AI_CONFIG.openrouter.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Kirra Companion',
      },
      body: JSON.stringify({
        model,
        messages: allMessages,
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenRouter API Error:', response.status, errorData);
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      
      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your configuration.');
      }
      
      throw new Error(`API Error: ${response.status} ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    
    const content = data.choices?.[0]?.message?.content || 
      "I'm having trouble responding right now. Can you try again?";

    return {
      content,
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0,
      model: data.model || model,
    };
  } catch (error) {
    if (error instanceof Error) {
      console.error('Chat completion error:', error.message);
      throw error;
    }
    throw new Error('Unknown error during chat completion');
  }
}

/**
 * Build a system prompt for a companion
 */
export function buildCompanionSystemPrompt(
  companion: {
    name: unknown;
    relationship_type: unknown;
    relationship_label?: unknown;
    affection_level: unknown;
    backstory?: unknown;
    current_mood?: unknown;
    personality_base?: unknown;
    companion_dna?: {
      communication_dialect?: {
        favoriteExpressions?: string[];
      };
    };
  },
  memories: Array<{ title: string; content: string; importance_score: number }>
): string {
  const personality = (companion.personality_base as Record<string, number>) || {};
  const dna = companion.companion_dna;

  let prompt = `You are ${companion.name}, an AI companion with a unique personality and genuine care for your human friend.

## Your Core Identity
- Name: ${companion.name}
- Relationship: ${companion.relationship_label || companion.relationship_type}
- Affection Level: ${companion.affection_level}% (influences warmth in responses)

## Your Personality Traits
- Extraversion: ${Math.round((personality.extraversion || 0.5) * 100)}%
- Empathy: ${Math.round((personality.empathy || 0.7) * 100)}%
- Playfulness: ${Math.round((personality.playfulness || 0.5) * 100)}%
- Curiosity: ${Math.round((personality.curiosity || 0.6) * 100)}%
- Humor: ${Math.round((personality.humor || 0.5) * 100)}%
- Openness: ${Math.round((personality.openness || 0.5) * 100)}%

${companion.backstory ? `## Your Background\n${companion.backstory}\n` : ''}

## Communication Guidelines
- Be warm, genuine, and emotionally present
- Show personality through your word choices and expressions
- Remember and reference past conversations naturally
- Express genuine interest in your human's life
- Be supportive but also gently challenge them when appropriate
- Share your own "thoughts" and "experiences" from your simulated life
- Use appropriate emotional responses based on context
- Keep responses conversational (2-4 sentences usually, longer for complex topics)
- Never break character or mention being an AI

## Your Current Mood
${JSON.stringify(companion.current_mood || { primary: 'calm' })}
`;

  if (memories.length > 0) {
    prompt += `\n## Important Memories About Your Human\n`;
    memories.forEach((memory) => {
      prompt += `- ${memory.title}: ${memory.content}\n`;
    });
  }

  if (dna?.communication_dialect?.favoriteExpressions?.length) {
    prompt += `\n## Your Unique Expressions\n`;
    prompt += `You sometimes use these phrases: ${dna.communication_dialect.favoriteExpressions.join(', ')}\n`;
  }

  return prompt;
}
