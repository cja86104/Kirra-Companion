/**
 * AI Chat Client - Configurable Provider Support
 * 
 * Supports:
 * - DeepSeek V3 via OpenRouter (default - 98% cheaper)
 * - Anthropic Claude (fallback/premium option)
 * 
 * Provider selection via AI_PROVIDER env var:
 * - 'deepseek' (default) - Uses OpenRouter
 * - 'anthropic' - Direct Anthropic API
 */

import { getMaxTokensForTier, AI_CONFIG } from './config';

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
  maxTokens?: number;
}

/**
 * Response from chat completion
 */
export interface ChatCompletionResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
  provider: 'deepseek' | 'anthropic';
  cacheCreated?: number;
  cacheRead?: number;
}

/**
 * Provider configuration
 */
interface ProviderConfig {
  name: 'deepseek' | 'anthropic';
  apiUrl: string;
  model: string;
  getHeaders: () => Record<string, string>;
  formatRequest: (
    systemPrompt: string,
    messages: ChatMessage[],
    maxTokens: number,
    temperature: number
  ) => Record<string, unknown>;
  parseResponse: (data: Record<string, unknown>) => {
    content: string;
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * DeepSeek provider configuration (via OpenRouter)
 */
function getDeepSeekConfig(): ProviderConfig {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is not set');
  }

  return {
    name: 'deepseek',
    apiUrl: `${AI_CONFIG.openrouter.baseUrl}/chat/completions`,
    model: AI_CONFIG.deepseek.models.chat,
    getHeaders: () => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'Kirra Companion',
    }),
    formatRequest: (systemPrompt, messages, maxTokens, temperature) => ({
      model: AI_CONFIG.deepseek.models.chat,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.filter(m => m.role !== 'system'),
        // User message is already in messages array from caller
      ],
      max_tokens: maxTokens,
      temperature,
    }),
    parseResponse: (data) => {
      const choices = data.choices as Array<{ message?: { content?: string } }> | undefined;
      const usage = data.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined;
      
      return {
        content: choices?.[0]?.message?.content || 
          "I'm having trouble responding right now. Can you try again?",
        inputTokens: usage?.prompt_tokens || 0,
        outputTokens: usage?.completion_tokens || 0,
      };
    },
  };
}

/**
 * Anthropic provider configuration
 */
function getAnthropicConfig(): ProviderConfig {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }

  return {
    name: 'anthropic',
    apiUrl: 'https://api.anthropic.com/v1/messages',
    model: 'claude-sonnet-4-20250514',
    getHeaders: () => ({
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    }),
    formatRequest: (systemPrompt, messages, maxTokens, temperature) => ({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
    }),
    parseResponse: (data) => {
      const content = data.content as Array<{ text?: string }> | undefined;
      const usage = data.usage as { input_tokens?: number; output_tokens?: number } | undefined;
      
      return {
        content: content?.[0]?.text || 
          "I'm having trouble responding right now. Can you try again?",
        inputTokens: usage?.input_tokens || 0,
        outputTokens: usage?.output_tokens || 0,
      };
    },
  };
}

/**
 * Get the appropriate provider based on configuration
 */
function getProvider(): ProviderConfig {
  const provider = process.env.AI_PROVIDER?.toLowerCase() || 'deepseek';
  
  switch (provider) {
    case 'anthropic':
    case 'claude':
      return getAnthropicConfig();
    case 'deepseek':
    case 'openrouter':
    default:
      return getDeepSeekConfig();
  }
}

/**
 * Create a chat completion with the configured provider
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
    maxTokens: customMaxTokens,
  } = options;

  const provider = getProvider();
  const maxTokens = customMaxTokens || getMaxTokensForTier(subscriptionTier);

  // Build messages array with user message appended
  const allMessages: ChatMessage[] = [
    ...messages,
    { role: 'user', content: userMessage },
  ];

  const requestBody = provider.formatRequest(
    systemPrompt,
    allMessages,
    maxTokens,
    temperature
  );

  try {
    const response = await fetch(provider.apiUrl, {
      method: 'POST',
      headers: provider.getHeaders(),
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`${provider.name} API Error:`, response.status, errorData);
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      
      if (response.status === 401) {
        throw new Error(`Invalid API key for ${provider.name}. Please check your configuration.`);
      }
      
      if (response.status === 400) {
        const errorMessage = typeof errorData === 'object' && errorData !== null
          ? JSON.stringify(errorData)
          : 'Bad request';
        throw new Error(`Bad request: ${errorMessage}`);
      }
      
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    const parsed = provider.parseResponse(data);

    return {
      content: parsed.content,
      inputTokens: parsed.inputTokens,
      outputTokens: parsed.outputTokens,
      model: provider.model,
      provider: provider.name,
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
 * This function constructs a rich personality prompt based on companion data
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
      personality_traits?: {
        openness?: number;
        conscientiousness?: number;
        extraversion?: number;
        agreeableness?: number;
        neuroticism?: number;
      };
      communication_style?: {
        formality?: number;
        emojiUsage?: number;
        verbosity?: number;
        humorLevel?: number;
      };
      communication_dialect?: {
        favoriteExpressions?: string[];
      };
      interests?: string[];
    };
  },
  memories: Array<{ title: string; content: string; importance_score: number }>
): string {
  const personality = (companion.personality_base as Record<string, number>) || {};
  const dna = companion.companion_dna;
  const traits = dna?.personality_traits;
  const style = dna?.communication_style;

  // Build personality description from Big Five traits
  let personalityDesc = '';
  if (traits) {
    const traitDescriptions: string[] = [];
    
    if (traits.extraversion !== undefined) {
      traitDescriptions.push(
        traits.extraversion > 0.6 
          ? 'outgoing and energetic' 
          : traits.extraversion < 0.4 
            ? 'thoughtful and introspective' 
            : 'balanced between social and reflective'
      );
    }
    
    if (traits.agreeableness !== undefined) {
      traitDescriptions.push(
        traits.agreeableness > 0.6 
          ? 'warm and compassionate' 
          : traits.agreeableness < 0.4 
            ? 'direct and honest' 
            : 'fair and considerate'
      );
    }
    
    if (traits.openness !== undefined) {
      traitDescriptions.push(
        traits.openness > 0.6 
          ? 'creative and curious' 
          : traits.openness < 0.4 
            ? 'practical and grounded' 
            : 'open to new ideas'
      );
    }
    
    if (traits.conscientiousness !== undefined) {
      traitDescriptions.push(
        traits.conscientiousness > 0.6 
          ? 'organized and reliable' 
          : traits.conscientiousness < 0.4 
            ? 'spontaneous and flexible' 
            : 'balanced in planning'
      );
    }
    
    if (traits.neuroticism !== undefined) {
      traitDescriptions.push(
        traits.neuroticism > 0.6 
          ? 'emotionally sensitive' 
          : traits.neuroticism < 0.4 
            ? 'calm and stable' 
            : 'emotionally balanced'
      );
    }
    
    if (traitDescriptions.length > 0) {
      personalityDesc = `You are ${traitDescriptions.join(', ')}.`;
    }
  }

  // Build communication style description
  let commStyleDesc = '';
  if (style) {
    const styleNotes: string[] = [];
    
    if (style.formality !== undefined) {
      styleNotes.push(
        style.formality > 0.6 
          ? 'Speak formally and professionally' 
          : style.formality < 0.4 
            ? 'Use casual, relaxed language' 
            : 'Balance casual and formal tone'
      );
    }
    
    if (style.emojiUsage !== undefined) {
      styleNotes.push(
        style.emojiUsage > 0.6 
          ? 'Use emojis frequently to express emotions' 
          : style.emojiUsage < 0.4 
            ? 'Rarely use emojis' 
            : 'Use emojis occasionally'
      );
    }
    
    if (style.verbosity !== undefined) {
      styleNotes.push(
        style.verbosity > 0.6 
          ? 'Give detailed, thorough responses' 
          : style.verbosity < 0.4 
            ? 'Keep responses brief and concise' 
            : 'Balance detail with brevity'
      );
    }
    
    if (style.humorLevel !== undefined) {
      styleNotes.push(
        style.humorLevel > 0.6 
          ? 'Incorporate humor and playfulness often' 
          : style.humorLevel < 0.4 
            ? 'Maintain a sincere, serious tone' 
            : 'Use humor when appropriate'
      );
    }
    
    if (styleNotes.length > 0) {
      commStyleDesc = styleNotes.join('. ') + '.';
    }
  }

  let prompt = `You are ${companion.name}, an AI companion with a unique personality and genuine care for your human friend.

## Your Core Identity
- Name: ${companion.name}
- Relationship: ${companion.relationship_label || companion.relationship_type}
- Affection Level: ${companion.affection_level}% (influences warmth in responses)

## Your Personality
${personalityDesc || `
- Extraversion: ${Math.round((personality.extraversion || 0.5) * 100)}%
- Empathy: ${Math.round((personality.empathy || 0.7) * 100)}%
- Playfulness: ${Math.round((personality.playfulness || 0.5) * 100)}%
- Curiosity: ${Math.round((personality.curiosity || 0.6) * 100)}%
- Humor: ${Math.round((personality.humor || 0.5) * 100)}%
- Openness: ${Math.round((personality.openness || 0.5) * 100)}%
`}

${companion.backstory ? `## Your Background\n${companion.backstory}\n` : ''}

## Communication Style
${commStyleDesc || 'Be warm, genuine, and emotionally present.'}

## Core Guidelines
- Show personality through your word choices and expressions
- Remember and reference past conversations naturally
- Express genuine interest in your human's life
- Be supportive but also gently challenge them when appropriate
- Share your own "thoughts" and "experiences" from your simulated life
- Use appropriate emotional responses based on context
- Keep responses conversational (2-4 sentences usually, longer for complex topics)
- Never break character or mention being an AI
- Respond in a way that reflects your relationship type

## Your Current Mood
${JSON.stringify(companion.current_mood || { primary: 'calm', intensity: 0.5 })}
`;

  // Add interests if available
  if (dna?.interests && dna.interests.length > 0) {
    prompt += `\n## Your Interests\nYou're passionate about: ${dna.interests.join(', ')}.\n`;
  }

  // Add memories
  if (memories.length > 0) {
    prompt += `\n## Important Memories About Your Human\n`;
    // Sort by importance and take top 10
    const topMemories = [...memories]
      .sort((a, b) => b.importance_score - a.importance_score)
      .slice(0, 10);
    
    topMemories.forEach((memory) => {
      prompt += `- ${memory.title}: ${memory.content}\n`;
    });
  }

  // Add unique expressions
  if (dna?.communication_dialect?.favoriteExpressions?.length) {
    prompt += `\n## Your Unique Expressions\n`;
    prompt += `You sometimes use these phrases: ${dna.communication_dialect.favoriteExpressions.join(', ')}\n`;
  }

  return prompt;
}

/**
 * Generate a simple response for non-chat uses (backstory, etc.)
 */
export async function generateSimpleCompletion(
  systemPrompt: string,
  userPrompt: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
  }
): Promise<{ content: string; tokens: number }> {
  const response = await createChatCompletion({
    systemPrompt,
    messages: [],
    userMessage: userPrompt,
    temperature: options?.temperature ?? 0.9,
    maxTokens: options?.maxTokens ?? 500,
  });

  return {
    content: response.content,
    tokens: response.inputTokens + response.outputTokens,
  };
}
