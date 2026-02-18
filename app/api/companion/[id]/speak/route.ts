import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  generateSpeech,
  prepareSentenceQueue,
  hasVoiceAccess,
  getVoiceLimitForTier,
  isValidVoiceConfig,
  migrateVoiceConfig,
  OPENAI_VOICES,
  type OpenAIVoiceId,
  type VoiceConfig,
} from '@/lib/tts/openai-tts';
import type { Json } from '@/types/database';

interface TTSRequest {
  text: string;
  companionId: string;
  messageId?: string;
  // Sentence-level options for queued playback
  sentenceIndex?: number;
  mode?: 'full' | 'first' | 'sentence';
}

interface ProfileRow {
  subscription_tier: 'free' | 'basic' | 'pro' | 'ultimate';
}

interface CompanionVoiceRow {
  voice_config: Json | null;
  name: string;
  total_voice_minutes: number;
}

/**
 * POST /api/companion/[id]/speak
 * 
 * Generate TTS audio for a companion's message.
 * 
 * Modes:
 * - 'full' (default): Generate audio for entire text
 * - 'first': Generate audio for first sentence only (fast response)
 * - 'sentence': Generate audio for specific sentence by index
 * 
 * Provider: OpenAI TTS
 * Optimization: Sentence-level generation for perceived lower latency
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companionId } = await params;
    const body: TTSRequest = await request.json();
    const { text, sentenceIndex, mode = 'full' } = body;

    if (!text?.trim()) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile for tier check
    const { data: profileData } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    const profile = profileData as ProfileRow | null;
    const tier = profile?.subscription_tier || 'free';

    if (!hasVoiceAccess(tier)) {
      return NextResponse.json(
        { error: 'Voice feature requires a paid subscription' },
        { status: 403 }
      );
    }

    const characterLimit = getVoiceLimitForTier(tier);

    // Get companion's voice config
    const { data: companionData } = await supabase
      .from('companions')
      .select('voice_config, name, total_voice_minutes')
      .eq('id', companionId)
      .eq('user_id', user.id)
      .single();

    const companion = companionData as CompanionVoiceRow | null;

    if (!companion) {
      return NextResponse.json(
        { error: 'Companion not found' },
        { status: 404 }
      );
    }

    let voiceConfig = companion.voice_config as VoiceConfig | null;

    if (!voiceConfig || !isValidVoiceConfig(voiceConfig)) {
      return NextResponse.json(
        { error: 'This companion does not have a valid voice configured' },
        { status: 400 }
      );
    }

    // Check API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not configured');
      return NextResponse.json(
        { error: 'Voice service not configured' },
        { status: 503 }
      );
    }

    // Migrate non-OpenAI configs (from Cartesia or ElevenLabs)
    if (voiceConfig.provider !== 'openai') {
      console.log(`Migrating ${voiceConfig.provider} voice to OpenAI for companion ${companionId}`);
      voiceConfig = migrateVoiceConfig(voiceConfig);
      
      // Update companion's voice config
      await supabase
        .from('companions')
        .update({ voice_config: voiceConfig as unknown as Json })
        .eq('id', companionId);
    }

    // Validate voice ID
    const voiceId = OPENAI_VOICES[voiceConfig.voiceId as OpenAIVoiceId]
      ? voiceConfig.voiceId as OpenAIVoiceId
      : 'nova';

    const speed = voiceConfig.speed || 1.0;

    // Determine text to speak based on mode
    let textToSpeak: string;
    let totalSentences = 0;
    let currentIndex = 0;
    let isLastSentence = true;

    if (mode === 'first' || mode === 'sentence') {
      // Sentence-level mode for queued playback
      const queue = prepareSentenceQueue(text);
      totalSentences = queue.length;

      if (mode === 'first') {
        textToSpeak = queue[0]?.text || text;
        currentIndex = 0;
        isLastSentence = queue.length <= 1;
      } else {
        const idx = sentenceIndex ?? 0;
        if (idx < 0 || idx >= queue.length) {
          return NextResponse.json(
            { error: 'Invalid sentence index' },
            { status: 400 }
          );
        }
        textToSpeak = queue[idx].text;
        currentIndex = idx;
        isLastSentence = queue[idx].isLast;
      }
    } else {
      // Full mode - generate for entire text
      textToSpeak = text.slice(0, 4096);
    }

    // Generate speech
    const speechResult = await generateSpeech({
      text: textToSpeak,
      voiceId,
      model: 'tts-1',
      speed,
      format: 'mp3',
    });

    // Update companion voice minutes (non-blocking)
    const newVoiceMinutes = (companion.total_voice_minutes || 0) + (speechResult.estimatedDuration / 60);

    // Fire and forget - don't await
    (async () => {
      try {
        await supabase
          .from('companions')
          .update({ total_voice_minutes: newVoiceMinutes })
          .eq('id', companionId);
      } catch (err) {
        console.error('Voice minutes update error:', err);
      }
    })();

    // Build response headers
    const headers: Record<string, string> = {
      'Content-Type': speechResult.contentType,
      'X-Audio-Duration': String(Math.round(speechResult.estimatedDuration * 1000)),
      'X-Characters-Used': String(speechResult.characterCount),
      'X-Characters-Limit': String(characterLimit),
      'X-TTS-Provider': 'openai',
      'Cache-Control': 'private, max-age=3600',
    };

    // Add sentence metadata for queued playback
    if (mode === 'first' || mode === 'sentence') {
      headers['X-Sentence-Index'] = String(currentIndex);
      headers['X-Sentence-Total'] = String(totalSentences);
      headers['X-Sentence-Last'] = isLastSentence ? '1' : '0';
    }

    return new NextResponse(speechResult.audioBuffer, { headers });

  } catch (error) {
    console.error('TTS API error:', error);
    
    const message = error instanceof Error ? error.message : 'Failed to generate speech';
    
    if (message.includes('Rate limit')) {
      return NextResponse.json({ error: message }, { status: 429 });
    }
    
    if (message.includes('Invalid') || message.includes('API key')) {
      return NextResponse.json({ error: 'Voice service configuration error' }, { status: 503 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/companion/[id]/speak
 * 
 * Get voice configuration and usage stats
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companionId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    const profile = profileData as ProfileRow | null;
    const tier = profile?.subscription_tier || 'free';

    const { data: companionData } = await supabase
      .from('companions')
      .select('voice_config, name, total_voice_minutes')
      .eq('id', companionId)
      .eq('user_id', user.id)
      .single();

    const companion = companionData as CompanionVoiceRow | null;

    if (!companion) {
      return NextResponse.json({ error: 'Companion not found' }, { status: 404 });
    }

    return NextResponse.json({
      hasVoice: !!companion.voice_config,
      voiceConfig: companion.voice_config,
      hasAccess: hasVoiceAccess(tier),
      tier,
      provider: 'openai',
      usage: {
        characterLimit: getVoiceLimitForTier(tier),
      },
      companionStats: {
        totalVoiceMinutes: companion.total_voice_minutes || 0,
      },
    });

  } catch (error) {
    console.error('Voice config error:', error);
    return NextResponse.json({ error: 'Failed to get voice configuration' }, { status: 500 });
  }
}
