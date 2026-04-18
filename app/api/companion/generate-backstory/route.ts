import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { generateSimpleCompletion } from '@/lib/ai/chat-client';
import { checkRateLimit } from '@/lib/rate-limit';

const BackstorySchema = z.object({
  name: z.string().min(1).max(50),
  relationshipType: z.string().min(1),
  traits: z.object({
    openness: z.number().min(0).max(100),
    conscientiousness: z.number().min(0).max(100),
    extraversion: z.number().min(0).max(100),
    agreeableness: z.number().min(0).max(100),
    neuroticism: z.number().min(0).max(100),
  }),
  interests: z.array(z.string().min(1)).min(1).max(50),
  previousBackstory: z.string().max(5000).optional(),
});

/**
 * Generate a unique backstory for a companion using AI
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const rateLimitResult = await checkRateLimit(user.id, 'generate-backstory', 20, 86400);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', remaining: rateLimitResult.remaining, resetsAt: rateLimitResult.resetsAt },
        { status: 429 }
      );
    }

    const rawBody: unknown = await request.json();
    const parseResult = BackstorySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { name, relationshipType, traits, interests, previousBackstory } = parseResult.data;

    // Build personality description from traits
    const personalityDescription = buildPersonalityDescription(traits);
    
    // Build the prompt
    const systemPrompt = `You are a creative writer helping to create backstories for AI companions. 
Your goal is to create engaging, warm, and believable backstories that feel personal and authentic.
The backstory should be 2-3 paragraphs, written in third person, and should:
- Feel genuine and relatable, not cliché
- Include specific details that bring the character to life
- Reference their interests naturally
- Reflect their personality traits
- Create a foundation for meaningful conversations
- Never mention AI, technology, or being artificial`;

    const userPrompt = `Create a unique backstory for an AI companion with these characteristics:

Name: ${name}
Relationship Type: ${relationshipType}
Personality: ${personalityDescription}
Interests: ${interests.join(', ')}

${previousBackstory ? `The previous backstory was: "${previousBackstory}"
Please create something DIFFERENT from this previous version - new details, new angle, fresh story.` : ''}

Write a warm, engaging backstory that makes ${name} feel like a real person with their own life experiences, dreams, and quirks. Include specific memories or life events that shaped who they are.`;

    // Generate backstory using configured AI provider
    const result = await generateSimpleCompletion(systemPrompt, userPrompt, {
      temperature: 0.9,
      maxTokens: 500,
    });

    const backstory = result.content?.trim();

    if (!backstory) {
      throw new Error('No backstory generated');
    }

    // Log usage for analytics
    console.log(`Backstory generated for user ${user.id}, tokens: ${result.tokens}`);

    return NextResponse.json({
      backstory,
      tokens: result.tokens,
    });

  } catch (error) {
    console.error('Backstory generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate backstory' },
      { status: 500 }
    );
  }
}

/**
 * Build a natural language personality description from Big Five traits
 */
function buildPersonalityDescription(traits: z.infer<typeof BackstorySchema>['traits']): string {
  const descriptions: string[] = [];

  // Extraversion
  if (traits.extraversion >= 70) {
    descriptions.push('naturally outgoing and energized by social interaction');
  } else if (traits.extraversion >= 40) {
    descriptions.push('balanced between social time and solitude');
  } else {
    descriptions.push('thoughtful and introspective, preferring deeper one-on-one connections');
  }

  // Agreeableness
  if (traits.agreeableness >= 70) {
    descriptions.push('warm-hearted and always ready to help others');
  } else if (traits.agreeableness >= 40) {
    descriptions.push('fair-minded with a good balance of empathy and independence');
  } else {
    descriptions.push('direct and independent in their approach');
  }

  // Conscientiousness
  if (traits.conscientiousness >= 70) {
    descriptions.push('dedicated and organized with a strong sense of responsibility');
  } else if (traits.conscientiousness >= 40) {
    descriptions.push('flexible and adaptable in their approach to life');
  } else {
    descriptions.push('spontaneous and free-spirited');
  }

  // Openness
  if (traits.openness >= 70) {
    descriptions.push('creative and curious with a love for new ideas');
  } else if (traits.openness >= 40) {
    descriptions.push('open to experiences while appreciating tradition');
  } else {
    descriptions.push('practical and grounded in their worldview');
  }

  // Neuroticism (framed positively)
  if (traits.neuroticism >= 70) {
    descriptions.push('emotionally deep and sensitive to the world around them');
  } else if (traits.neuroticism >= 40) {
    descriptions.push('emotionally aware with good resilience');
  } else {
    descriptions.push('calm and steady even in challenging situations');
  }

  // Join with varied connectors for natural flow
  if (descriptions.length === 0) {
    return 'well-rounded and balanced';
  }

  if (descriptions.length === 1) {
    return descriptions[0];
  }

  if (descriptions.length === 2) {
    return `${descriptions[0]} and ${descriptions[1]}`;
  }

  // For 3+ descriptions, pick the most distinctive ones
  const selected = descriptions.slice(0, 3);
  return `${selected[0]}, ${selected[1]}, and ${selected[2]}`;
}
