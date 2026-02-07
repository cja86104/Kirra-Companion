import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  generateSpeech,
  hasVoiceAccess,
  getVoiceLimitForTier,
  isValidVoiceConfig,
  CARTESIA_VOICES,
  migrateVoiceConfig,
  type CartesiaVoiceId,
  type VoiceConfig,
} from '@/lib/tts/cartesia-tts';
import type { Json } from '@/types/database';

interface TTSRequest {
  text: string;
  companionId: string;
  messageId?: string;
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
 * Generate TTS audio for a companion's message using Cartesia Sonic 3.
 * Uses the companion's voice_config if available.
 * 
 * Provider: Cartesia - 40ms time-to-first-audio, streaming support
 * Cost: ~$0.038 per 1K characters
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companionId } = await params;
    const body: TTSRequest = await request.json();
    const { text, messageId } = body;

    if (!text?.trim()) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Cartesia supports up to 10,000 characters per request
    const MAX_CHARS = 10000;
    const truncatedText = text.slice(0, MAX_CHARS);

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

    // Check if user has voice access
    if (!hasVoiceAccess(tier)) {
      return NextResponse.json(
        { error: 'Voice feature requires a paid subscription' },
        { status: 403 }
      );
    }

    // Get character limit for tier (for informational purposes)
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

    // Validate voice configuration
    let voiceConfig = companion.voice_config as VoiceConfig | null;

    if (!voiceConfig || !isValidVoiceConfig(voiceConfig)) {
      return NextResponse.json(
        { error: 'This companion does not have a valid voice configured' },
        { status: 400 }
      );
    }

    // Check API key
    if (!process.env.CARTESIA_API_KEY) {
      console.error('CARTESIA_API_KEY not configured');
      return NextResponse.json(
        { error: 'Voice service not configured' },
        { status: 503 }
      );
    }

    // Migrate legacy OpenAI/ElevenLabs configs to Cartesia
    if (voiceConfig.provider !== 'cartesia') {
      console.log(`Migrating ${voiceConfig.provider} voice to Cartesia for companion ${companionId}`);
      voiceConfig = migrateVoiceConfig(voiceConfig);
      
      // Update the companion's voice config in the database
      await supabase
        .from('companions')
        .update({ voice_config: voiceConfig as unknown as Json })
        .eq('id', companionId);
    }

    // Validate voice ID exists in Cartesia
    const voiceId = CARTESIA_VOICES[voiceConfig.voiceId as CartesiaVoiceId]
      ? voiceConfig.voiceId as CartesiaVoiceId
      : 'tessa'; // Default to Tessa if voice not found

    // Generate speech
    const speechResult = await generateSpeech({
      text: truncatedText,
      voiceId,
      speed: voiceConfig.speed,
      format: 'mp3',
    });

    // Update companion voice minutes
    const newVoiceMinutes = (companion.total_voice_minutes || 0) + (speechResult.estimatedDuration / 60);

    await supabase
      .from('companions')
      .update({
        total_voice_minutes: newVoiceMinutes,
      } as never)
      .eq('id', companionId);

    // If messageId provided, we could update the message with voice info
    // For now, we're streaming audio directly
    if (messageId) {
      // Future: Store audio URL in message record
    }

    // Return audio with metadata headers
    return new NextResponse(speechResult.audioBuffer, {
      headers: {
        'Content-Type': speechResult.contentType,
        'X-Audio-Duration': String(Math.round(speechResult.estimatedDuration)),
        'X-Characters-Used': String(speechResult.characterCount),
        'X-Characters-Limit': String(characterLimit),
        'X-TTS-Provider': 'cartesia',
        'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
      },
    });

  } catch (error) {
    console.error('TTS API error:', error);
    
    const message = error instanceof Error ? error.message : 'Failed to generate speech';
    
    // Handle specific error types
    if (message.includes('Rate limit')) {
      return NextResponse.json(
        { error: message },
        { status: 429 }
      );
    }
    
    if (message.includes('Invalid') || message.includes('API key')) {
      return NextResponse.json(
        { error: 'Voice service configuration error' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/companion/[id]/speak
 * 
 * Get voice configuration and usage stats for a companion
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companionId } = await params;
    const supabase = await createClient();

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    const profile = profileData as ProfileRow | null;
    const tier = profile?.subscription_tier || 'free';

    // Get companion
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

    const characterLimit = getVoiceLimitForTier(tier);

    return NextResponse.json({
      hasVoice: !!companion.voice_config,
      voiceConfig: companion.voice_config,
      hasAccess: hasVoiceAccess(tier),
      tier,
      provider: 'cartesia',
      usage: {
        characterLimit,
      },
      companionStats: {
        totalVoiceMinutes: companion.total_voice_minutes || 0,
      },
    });

  } catch (error) {
    console.error('Voice config error:', error);
    return NextResponse.json(
      { error: 'Failed to get voice configuration' },
      { status: 500 }
    );
  }
}
