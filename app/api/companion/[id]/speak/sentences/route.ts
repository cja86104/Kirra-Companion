import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { prepareSentenceQueue, hasVoiceAccess } from '@/lib/tts/openai-tts';

const SentencesSchema = z.object({
  text: z.string().min(1).max(50000),
});

/**
 * POST /api/companion/[id]/speak/sentences
 * 
 * Get the sentence queue for a text block.
 * Returns metadata about sentences for client-side queued playback.
 * 
 * Use this to:
 * 1. Know how many sentences to fetch
 * 2. Get sentence text for display synchronization
 * 3. Plan pre-fetching strategy
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companionId } = await params;
    const rawBody: unknown = await request.json();
    const parseResult = SentencesSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { text } = parseResult.data;

    const supabase = await createClient();

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check subscription for voice access
    const { data: profileData } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    const tier = (profileData?.subscription_tier as string) || 'free';

    if (!hasVoiceAccess(tier)) {
      return NextResponse.json(
        { error: 'Voice feature requires a paid subscription' },
        { status: 403 }
      );
    }

    // Verify companion exists and belongs to user
    const { data: companion } = await supabase
      .from('companions')
      .select('id, voice_config')
      .eq('id', companionId)
      .eq('user_id', user.id)
      .single();

    if (!companion) {
      return NextResponse.json(
        { error: 'Companion not found' },
        { status: 404 }
      );
    }

    if (!companion.voice_config) {
      return NextResponse.json(
        { error: 'Companion does not have voice configured' },
        { status: 400 }
      );
    }

    // Prepare sentence queue
    const queue = prepareSentenceQueue(text);

    // Estimate total duration (rough: 12.5 chars/sec at normal speed)
    const totalChars = queue.reduce((sum, s) => sum + s.text.length, 0);
    const estimatedTotalDuration = totalChars / 12.5;

    return NextResponse.json({
      sentences: queue.map(s => ({
        index: s.index,
        text: s.text,
        charCount: s.text.length,
        isLast: s.isLast,
        // Rough estimate for this sentence
        estimatedDuration: Math.round((s.text.length / 12.5) * 1000), // ms
      })),
      totalCount: queue.length,
      totalCharacters: totalChars,
      estimatedTotalDuration: Math.round(estimatedTotalDuration * 1000), // ms
    });

  } catch (error) {
    console.error('Sentences API error:', error);
    return NextResponse.json(
      { error: 'Failed to prepare sentences' },
      { status: 500 }
    );
  }
}
