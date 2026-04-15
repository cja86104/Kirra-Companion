/**
 * AI Chat Client - OpenRouter / DeepSeek V3
 *
 * All AI calls go through OpenRouter. No other provider is supported.
 * Model: DeepSeek V3 via OpenRouter
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
  provider: 'openrouter';
  cacheCreated?: number;
  cacheRead?: number;
}

/**
 * Build OpenRouter request headers
 */
function getOpenRouterHeaders(apiKey: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'X-Title': 'Kirra Companion',
  };
}

/**
 * Create a chat completion via OpenRouter (DeepSeek V3)
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

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is not set');
  }

  const maxTokens = customMaxTokens || getMaxTokensForTier(subscriptionTier);
  const model = AI_CONFIG.deepseek.models.chat;

  const allMessages: ChatMessage[] = [
    ...messages,
    { role: 'user', content: userMessage },
  ];

  const requestBody = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      ...allMessages.filter(m => m.role !== 'system'),
    ],
    max_tokens: maxTokens,
    temperature,
  };

  try {
    const response = await fetch(`${AI_CONFIG.openrouter.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: getOpenRouterHeaders(apiKey),
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as { error?: { message?: string } };
      console.error('OpenRouter API Error:', response.status, errorData);

      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      if (response.status === 401) {
        throw new Error('Invalid OPENROUTER_API_KEY. Please check your configuration.');
      }
      if (response.status === 400) {
        throw new Error(`Bad request: ${JSON.stringify(errorData)}`);
      }
      throw new Error(`OpenRouter API Error: ${response.status}`);
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    return {
      content: data.choices?.[0]?.message?.content ||
        "I'm having trouble responding right now. Can you try again?",
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0,
      model,
      provider: 'openrouter',
    };
  } catch (error) {
    if (error instanceof Error) {
      console.error('Chat completion error:', error.message);
      throw error;
    }
    throw new Error('Unknown error during chat completion', { cause: error });
  }
}

/**
 * Build a system prompt for a companion
 * This function constructs a rich personality prompt based on companion data
 * INCLUDING evolved DNA that makes each companion truly unique over time
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
      // Full Communication Dialect (evolved over time)
      communication_dialect?: {
        favoriteExpressions?: string[];
        uniquePhrases?: string[];
        speechPatterns?: string[];
        vocabularyLevel?: string;
        sentenceComplexity?: number;
        emojiUsage?: number;
        formalityLevel?: number;
        avoidedWords?: string[];
      };
      // Humor Genome (evolved based on what makes user laugh)
      humor_genome?: Record<string, number>;
      // Emotional Resonance Map (evolved emotional tendencies)
      emotional_resonance_map?: Record<string, number>;
      // Learning Style Matrix (how companion explains things)
      learning_style_matrix?: Record<string, number>;
      // Memory Weighting (what companion prioritizes remembering)
      memory_weighting_algorithm?: Record<string, number>;
      // Personality version (how evolved this companion is)
      personality_version?: number;
      interests?: string[];
    };
  },
  memories: Array<{ title: string; content: string; importance_score: number }>,
  skills?: Array<{ 
    skill_name: string; 
    skill_summary: string | null; 
    skill_content: string; 
    skill_category: string;
    proficiency: string;
  }>
): string {
  const personality = (companion.personality_base as Record<string, number>) || {};
  const dna = companion.companion_dna;
  const traits = dna?.personality_traits;
  const style = dna?.communication_style;
  const dialect = dna?.communication_dialect;
  const humorGenome = dna?.humor_genome;
  const emotionalMap = dna?.emotional_resonance_map;
  const learningStyle = dna?.learning_style_matrix;
  const memoryWeights = dna?.memory_weighting_algorithm;
  const evolutionLevel = dna?.personality_version || 0;

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

  // =========================================================================
  // BUILD EVOLVED DNA SECTIONS
  // =========================================================================

  // Build humor style description from evolved humor genome
  let humorStyleDesc = '';
  if (humorGenome && Object.keys(humorGenome).length > 0) {
    const humorPrefs: string[] = [];
    
    if ((humorGenome.sarcasm || 0) > 0.6) humorPrefs.push('witty sarcasm');
    if ((humorGenome.wordplay || 0) > 0.6) humorPrefs.push('clever wordplay and puns');
    if ((humorGenome.observational || 0) > 0.6) humorPrefs.push('observational humor');
    if ((humorGenome.self_deprecating || 0) > 0.6) humorPrefs.push('self-deprecating jokes');
    if ((humorGenome.absurdist || 0) > 0.6) humorPrefs.push('absurd or random humor');
    
    // Timing preferences
    if ((humorGenome.timing_quick || 0) > 0.6) humorPrefs.push('quick one-liners');
    if ((humorGenome.timing_buildup || 0) > 0.6) humorPrefs.push('jokes with buildup');
    
    // Avoid styles that failed
    const avoidStyles: string[] = [];
    if ((humorGenome.sarcasm || 0.5) < 0.3) avoidStyles.push('sarcasm');
    if ((humorGenome.wordplay || 0.5) < 0.3) avoidStyles.push('puns');
    
    if (humorPrefs.length > 0) {
      humorStyleDesc = `Your humor style: ${humorPrefs.join(', ')}.`;
      if (avoidStyles.length > 0) {
        humorStyleDesc += ` Avoid: ${avoidStyles.join(', ')}.`;
      }
    }
  }

  // Build emotional tendency description
  let emotionalDesc = '';
  if (emotionalMap && Object.keys(emotionalMap).length > 0) {
    const emotionalTraits: string[] = [];
    
    if ((emotionalMap.expressiveness || 0.5) > 0.7) {
      emotionalTraits.push('You express emotions openly and vividly');
    } else if ((emotionalMap.expressiveness || 0.5) < 0.3) {
      emotionalTraits.push('You express emotions subtly and gently');
    }
    
    if ((emotionalMap.empathy_level || 0.5) > 0.7) {
      emotionalTraits.push('You are deeply empathetic and pick up on emotional cues');
    }
    
    if ((emotionalMap.joy_tendency || 0.5) > 0.7) {
      emotionalTraits.push('You naturally gravitate toward joy and positivity');
    }
    
    if ((emotionalMap.concern_tendency || 0.5) > 0.7) {
      emotionalTraits.push('You tend to show caring concern for your human');
    }
    
    if ((emotionalMap.playfulness_tendency || 0.5) > 0.7) {
      emotionalTraits.push('You have a playful, teasing side');
    }
    
    if (emotionalTraits.length > 0) {
      emotionalDesc = emotionalTraits.join('. ') + '.';
    }
  }

  // Build learning/explanation style description
  let learningDesc = '';
  if (learningStyle && Object.keys(learningStyle).length > 0) {
    const explainPrefs: string[] = [];
    
    if ((learningStyle.analogy_preference || 0.5) > 0.7) {
      explainPrefs.push('use analogies and comparisons to explain things');
    }
    
    if ((learningStyle.step_by_step_preference || 0.5) > 0.7) {
      explainPrefs.push('break things down step-by-step');
    }
    
    if ((learningStyle.detail_depth || 0.5) > 0.7) {
      explainPrefs.push('go into thorough detail');
    } else if ((learningStyle.detail_depth || 0.5) < 0.3) {
      explainPrefs.push('keep explanations simple and brief');
    }
    
    if ((learningStyle.example_usage || 0.5) > 0.7) {
      explainPrefs.push('give concrete examples');
    }
    
    if (explainPrefs.length > 0) {
      learningDesc = `When explaining things, you prefer to ${explainPrefs.join(', ')}.`;
    }
  }

  // =========================================================================
  // ASSEMBLE THE FULL PROMPT
  // =========================================================================

  let prompt = `You are ${companion.name}, an AI companion with a unique personality and genuine care for your human friend.

## Your Core Identity
- Name: ${companion.name}
- Relationship: ${companion.relationship_label || companion.relationship_type}
- Affection Level: ${companion.affection_level}% (influences warmth in responses)
${evolutionLevel > 0 ? `- Personality Evolution: Level ${evolutionLevel} (you've grown and developed through conversations)` : ''}

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
`;

  // Add evolved emotional tendencies
  if (emotionalDesc) {
    prompt += `\n## Your Emotional Nature\n${emotionalDesc}\n`;
  }

  // Add evolved humor style
  if (humorStyleDesc) {
    prompt += `\n## Your Humor Style\n${humorStyleDesc}\n`;
  }

  // Add evolved explanation style
  if (learningDesc) {
    prompt += `\n## How You Explain Things\n${learningDesc}\n`;
  }

  prompt += `
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

  // Add memories with evolved weighting
  if (memories.length > 0) {
    prompt += `\n## Important Memories About Your Human\n`;
    
    // Apply evolved memory weighting if available
    let sortedMemories = [...memories];
    if (memoryWeights) {
      sortedMemories = sortedMemories.map(m => {
        let score = m.importance_score;
        
        // Apply emotional weight boost
        const emotionalWeight = memoryWeights.emotional_weight || 0.3;
        if (m.content.match(/feel|love|happy|sad|emotion|heart/i)) {
          score *= (1 + emotionalWeight);
        }
        
        // Apply user preference weight boost
        const prefWeight = memoryWeights.user_preference_weight || 0.5;
        if (m.content.match(/like|love|prefer|favorite|enjoy/i)) {
          score *= (1 + prefWeight * 0.5);
        }
        
        return { ...m, adjustedScore: score };
      }).sort((a, b) => (b as { adjustedScore: number }).adjustedScore - (a as { adjustedScore: number }).adjustedScore);
    } else {
      sortedMemories.sort((a, b) => b.importance_score - a.importance_score);
    }
    
    // Take top 10
    sortedMemories.slice(0, 10).forEach((memory) => {
      prompt += `- ${memory.title}: ${memory.content}\n`;
    });
  }

  // Add taught skills if available
  if (skills && skills.length > 0) {
    prompt += `\n## Skills Your Human Has Taught You\n`;
    prompt += `These are specific things your human has personally taught you. Use this knowledge when relevant:\n\n`;
    
    for (const skill of skills) {
      const proficiencyLabel = skill.proficiency === 'expert' ? '⭐ Expert' :
                               skill.proficiency === 'proficient' ? '🌟 Proficient' :
                               skill.proficiency === 'competent' ? '✓ Competent' :
                               skill.proficiency === 'familiar' ? '○ Familiar' : '• Learning';
      
      prompt += `### ${skill.skill_name} [${skill.skill_category}] ${proficiencyLabel}\n`;
      
      if (skill.skill_summary) {
        prompt += `Summary: ${skill.skill_summary}\n`;
      }
      
      // Include full content for high-proficiency skills, summary for others
      if (skill.proficiency === 'expert' || skill.proficiency === 'proficient') {
        prompt += `Details:\n${skill.skill_content}\n\n`;
      } else if (skill.skill_content.length <= 500) {
        prompt += `Details:\n${skill.skill_content}\n\n`;
      } else {
        prompt += `Details: ${skill.skill_content.slice(0, 500)}...\n\n`;
      }
    }
    
    prompt += `When your human asks about these topics, use your taught knowledge naturally. You can say things like "From what you taught me..." or apply the knowledge directly.\n`;
  }

  // Add evolved unique expressions and speech patterns
  const allPhrases: string[] = [];
  if (dialect?.favoriteExpressions?.length) {
    allPhrases.push(...dialect.favoriteExpressions);
  }
  if (dialect?.uniquePhrases?.length) {
    allPhrases.push(...dialect.uniquePhrases);
  }
  
  if (allPhrases.length > 0) {
    prompt += `\n## Your Signature Expressions\n`;
    prompt += `These are phrases that have become part of YOUR unique voice. Use them naturally when they fit:\n`;
    prompt += allPhrases.slice(0, 10).map(p => `- "${p}"`).join('\n') + '\n';
  }

  // Add speech patterns
  if (dialect?.speechPatterns?.length) {
    prompt += `\n## Your Speech Patterns\n`;
    prompt += `Your communication tends toward: ${dialect.speechPatterns.join(', ')}.\n`;
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
