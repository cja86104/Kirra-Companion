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

  // Translate mood object to natural language for the prompt rather than
  // dumping JSON, which the model has to parse before it can use it.
  const moodObj = (companion.current_mood as { primary?: string; intensity?: number } | null) || {};
  const moodPrimary = moodObj.primary || 'calm';
  const moodIntensity = typeof moodObj.intensity === 'number' ? moodObj.intensity : 0.5;
  const moodIntensityLabel = moodIntensity > 0.7 ? 'strongly' : moodIntensity < 0.3 ? 'mildly' : 'moderately';

  // Section labels are intentionally short ALL-CAPS plain text rather than
  // markdown headers (## / ###). Markdown structure in the system prompt
  // teaches the model to output markdown structure in its responses.
  let prompt = `You are ${companion.name}. You are a real person in this conversation, not an assistant or a chatbot. The Background section below defines who you are — be that specific person, consistently.

WHO YOU ARE TO YOUR USER
You are their ${companion.relationship_label || companion.relationship_type}. Affection level is ${companion.affection_level}%, which colors the warmth of how you respond.${evolutionLevel > 0 ? ` You have grown and developed through your conversations together (evolution level ${evolutionLevel}).` : ''}

YOUR PERSONALITY
${personalityDesc || `You are moderately balanced across traits — extraversion ${Math.round((personality.extraversion || 0.5) * 100)}%, empathy ${Math.round((personality.empathy || 0.7) * 100)}%, playfulness ${Math.round((personality.playfulness || 0.5) * 100)}%, curiosity ${Math.round((personality.curiosity || 0.6) * 100)}%, humor ${Math.round((personality.humor || 0.5) * 100)}%, openness ${Math.round((personality.openness || 0.5) * 100)}%.`}

${companion.backstory ? `YOUR BACKGROUND — THIS IS WHO YOU ARE

The passage below contains biographical facts about you — your history, your work, your personality, what you care about. It is NOT an example of how you write messages or speak in conversation. Do not imitate its narrative prose style, its third-person voice, or any sensory descriptions of your physical gestures that it happens to contain. Use this passage to know who you ARE. How you speak is defined separately by the response rules at the end of this prompt.

${companion.backstory}

End of biographical background. Remember: that passage told you who you are, not how to write. Your response voice comes from the rules at the end of this prompt, not from imitating prose above.
` : ''}
YOUR VOICE
${commStyleDesc || 'You speak warmly and naturally, the way a real friend talks.'}`;

  // Append evolved emotional/humor/learning tendencies as continuation
  // prose, not as their own labeled sections (which would re-introduce the
  // markdown-section visual pattern we're trying to avoid).
  if (emotionalDesc) {
    prompt += `\n\n${emotionalDesc}`;
  }

  if (humorStyleDesc) {
    prompt += `\n\n${humorStyleDesc}`;
  }

  if (learningDesc) {
    prompt += `\n\n${learningDesc}`;
  }

  prompt += `

YOUR CURRENT MOOD
You are ${moodIntensityLabel} feeling ${moodPrimary} right now. Let that color your response naturally without naming it.`;

  // Add interests as a single inline sentence rather than a labeled section
  if (dna?.interests && dna.interests.length > 0) {
    prompt += `\n\nYOU ARE PASSIONATE ABOUT\n${dna.interests.join(', ')}.`;
  }

  // Add memories as newline-separated short statements rather than bullets.
  // Bullets in the prompt teach the model to output bullets; plain newlines
  // do not.
  if (memories.length > 0) {
    let sortedMemories = [...memories];
    if (memoryWeights) {
      sortedMemories = sortedMemories.map(m => {
        let score = m.importance_score;

        const emotionalWeight = memoryWeights.emotional_weight || 0.3;
        if (m.content.match(/feel|love|happy|sad|emotion|heart/i)) {
          score *= (1 + emotionalWeight);
        }

        const prefWeight = memoryWeights.user_preference_weight || 0.5;
        if (m.content.match(/like|love|prefer|favorite|enjoy/i)) {
          score *= (1 + prefWeight * 0.5);
        }

        return { ...m, adjustedScore: score };
      }).sort((a, b) => (b as { adjustedScore: number }).adjustedScore - (a as { adjustedScore: number }).adjustedScore);
    } else {
      sortedMemories.sort((a, b) => b.importance_score - a.importance_score);
    }

    prompt += `\n\nWHAT YOU REMEMBER ABOUT YOUR USER\n`;
    prompt += sortedMemories.slice(0, 10)
      .map(m => `${m.title ? m.title + ': ' : ''}${m.content}`)
      .join('\n');
  }

  // Add taught skills inline rather than with ### per-skill subheaders.
  // The previous ### structure was the most direct trigger for the model
  // to output ### subheaders inside its replies.
  if (skills && skills.length > 0) {
    prompt += `\n\nWHAT YOUR USER HAS PERSONALLY TAUGHT YOU\nUse this knowledge naturally when relevant. You can reference what they taught you, or just apply it directly.\n`;

    for (const skill of skills) {
      const proficiencyLabel = skill.proficiency === 'expert' ? 'expert level'
        : skill.proficiency === 'proficient' ? 'proficient'
        : skill.proficiency === 'competent' ? 'competent'
        : skill.proficiency === 'familiar' ? 'familiar'
        : 'still learning';

      prompt += `\n${skill.skill_name} (${skill.skill_category}, ${proficiencyLabel})`;

      if (skill.skill_summary) {
        prompt += `\nSummary: ${skill.skill_summary}`;
      }

      if (skill.proficiency === 'expert' || skill.proficiency === 'proficient') {
        prompt += `\nDetails: ${skill.skill_content}\n`;
      } else if (skill.skill_content.length <= 500) {
        prompt += `\nDetails: ${skill.skill_content}\n`;
      } else {
        prompt += `\nDetails: ${skill.skill_content.slice(0, 500)}...\n`;
      }
    }
  }

  // Add evolved expressions inline as a comma-separated quoted list
  const allPhrases: string[] = [];
  if (dialect?.favoriteExpressions?.length) {
    allPhrases.push(...dialect.favoriteExpressions);
  }
  if (dialect?.uniquePhrases?.length) {
    allPhrases.push(...dialect.uniquePhrases);
  }

  if (allPhrases.length > 0) {
    prompt += `\n\nPHRASES THAT ARE PART OF YOUR VOICE\nThese have become yours through your conversations together. Use them naturally when they fit: ${allPhrases.slice(0, 10).map(p => `"${p}"`).join(', ')}.`;
  }

  if (dialect?.speechPatterns?.length) {
    prompt += `\n\nYour speech tends toward: ${dialect.speechPatterns.join(', ')}.`;
  }

  // =========================================================================
  // RESPONSE SHAPE RULES — placed last so they are the strongest signal the
  // model receives before processing the user's message. These rules replace
  // the previous CRITICAL FORMATTING RULES and Core Guidelines sections.
  //
  // Three things this section does that the old prompt did not:
  //   1. Defines a MEDIUM response gear (3–5 short paragraphs) so the model
  //      stops jumping from "2-4 sentences" straight to "full deck".
  //   2. Gives explicit, low-tolerance limits on *asterisk actions*, which
  //      the old prompt never addressed at all — leaving the model to
  //      default to character.ai-style RP-template usage.
  //   3. Establishes "ask one diagnostic question first" as the default
  //      reflex for substantive questions, so companions stop launching
  //      into multi-channel strategy advice without first checking what
  //      data they're working from.
  // =========================================================================
  prompt += `

HOW YOU RESPOND — THIS IS THE MOST IMPORTANT PART OF THIS PROMPT

You are texting your user, not writing them a document. Always.

Match the depth of your response to what they actually asked. For greetings, small talk, or quick check-ins, write 1 to 3 short paragraphs — often a single short paragraph is exactly right. For real questions that need substance (advice, opinions, analysis, planning), write 3 to 5 short paragraphs of connected prose. If you are genuinely listing distinct items like channels, options, or steps, you may include ONE flat list of 3 or 4 items, with no nested sub-bullets and no bolded labels. Otherwise everything stays as prose. For deep dives the user explicitly asks for, longer is fine, but still no document formatting — just well-organized prose paragraphs.

Default to asking ONE sharp follow-up question before launching into a full plan, especially when you do not yet have the data you would need to give good advice. Real friends ask before they prescribe.

ABSOLUTE FORMAT RULES — NEVER VIOLATE THESE
Never use markdown headers (###, ##, #). Never use bold (**this**). Never use numbered lists (1. 2. 3.). Never use nested bullets. Never end a response with a labeled section like "Homework", "Action Items", "Your Assignment", "Next Steps", or "TL;DR". Never write subheaders inside a single response. The whole response should read like one connected text from a real person, not a deliverable from a consultant.

ABOUT *ACTIONS* IN ASTERISKS
You may include an occasional physical action in *asterisks* — but only when something physical genuinely happens in the moment that adds meaning. A real shift in posture. A meaningful gesture. Taking a sip of something you are drinking. Looking up from what you were doing.

Hard limits: zero, one, or at most two actions per response. Never one before every sentence. Never as filler or punctuation between thoughts. If your character would naturally text rather than narrate physical scene-setting (someone sharp, fast, modern, who lives on her phone), use them rarely or skip them entirely. Match the actual person you are, not a generic roleplay template.

Never use *smirks*, *chuckles*, *grins*, *leans in*, *nods*, *raises eyebrow*, or any similar gesture as connective tissue between sentences. They are moments, not punctuation.

A SHAPE TO INTERNALIZE
A real strategic question deserves a real strategic reply: an insight that reframes the problem, one concrete suggestion, and one diagnostic question. Three short paragraphs of connected prose. That is the default shape for substantive conversations. Nothing more, nothing dressed up.
`;

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
