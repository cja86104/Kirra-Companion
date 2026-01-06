import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  generateSpeech,
  hasVoiceAccess,
  getVoiceLimitForTier,
  isValidVoiceConfig,
  OPENAI_VOICES,
  type OpenAIVoiceId,
  type VoiceConfig,
} from '@/lib/tts/openai-tts';
import type { Profile, Companion } from '@/types/database';

interface TTSRequest {
  text: string;
  companionId: string;
  messageId?: string;
}

/**
 * POST /api/companion/[id]/speak
 * 
 * Generate TTS audio for a companion's message using OpenAI TTS.
 * Uses the companion's voice_config if available.
 * 
 * Cost: $15 per 1M characters (92% cheaper than ElevenLabs)
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

    // Limit text length to prevent abuse (OpenAI limit is 4096)
    const MAX_CHARS = 4000;
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
      .select('subscription_tier, voice_characters_used, voice_characters_reset_at')
      .eq('id', user.id)
      .single();

    const profile = profileData as Pick<Profile, 'subscription_tier' | 'voice_characters_used' | 'voice_characters_reset_at'> | null;
    const tier = profile?.subscription_tier || 'free';

    // Check if user has voice access
    if (!hasVoiceAccess(tier)) {
      return NextResponse.json(
        { error: 'Voice feature requires a paid subscription' },
        { status: 403 }
      );
    }

    // Check voice character limits
    const characterLimit = getVoiceLimitForTier(tier);
    let charactersUsed = profile?.voice_characters_used || 0;
    const resetAt = profile?.voice_characters_reset_at ? new Date(profile.voice_characters_reset_at) : null;
    const now = new Date();

    // Reset counter if it's a new month
    if (resetAt && resetAt.getMonth() !== now.getMonth()) {
      charactersUsed = 0;
      await supabase
        .from('profiles')
        .update({
          voice_characters_used: 0,
          voice_characters_reset_at: now.toISOString(),
        } as never)
        .eq('id', user.id);
    }

    // Check if user has exceeded their limit
    if (charactersUsed + truncatedText.length > characterLimit) {
      const remaining = Math.max(0, characterLimit - charactersUsed);
      return NextResponse.json(
        { 
          error: 'Monthly voice limit exceeded',
          limit: characterLimit,
          used: charactersUsed,
          remaining,
          upgradeMessage: tier !== 'ultimate' 
            ? 'Upgrade your plan for more voice time.' 
            : 'You have reached your monthly limit. It will reset next month.',
        },
        { status: 429 }
      );
    }

    // Get companion's voice config
    const { data: companionData } = await supabase
      .from('companions')
      .select('voice_config, name, total_voice_minutes')
      .eq('id', companionId)
      .eq('user_id', user.id)
      .single();

    const companion = companionData as Pick<Companion, 'voice_config' | 'name' | 'total_voice_minutes'> | null;

    if (!companion) {
      return NextResponse.json(
        { error: 'Companion not found' },
        { status: 404 }
      );
    }

    // Validate voice configuration
    const voiceConfig = companion.voice_config as VoiceConfig | null;

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

    // Handle different providers
    if (voiceConfig.provider === 'elevenlabs') {
      // Legacy ElevenLabs support - could redirect to ElevenLabs handler
      // For now, fall back to default OpenAI voice
      console.warn('ElevenLabs voice detected, falling back to OpenAI');
    }

    // Validate voice ID exists in OpenAI
    const voiceId = (voiceConfig.provider === 'openai' && OPENAI_VOICES[voiceConfig.voiceId as OpenAIVoiceId])
      ? voiceConfig.voiceId as OpenAIVoiceId
      : 'nova'; // Default to Nova if voice not found

    // Generate speech
    const speechResult = await generateSpeech({
      text: truncatedText,
      voiceId,
      model: voiceConfig.model || 'tts-1',
      speed: voiceConfig.speed || 1.0,
      format: 'mp3',
    });

    // Update usage tracking
    const newCharactersUsed = charactersUsed + speechResult.characterCount;
    const newVoiceMinutes = (companion.total_voice_minutes || 0) + (speechResult.estimatedDuration / 60);

    // Update profile character usage
    await supabase
      .from('profiles')
      .update({
        voice_characters_used: newCharactersUsed,
        voice_characters_reset_at: profile?.voice_characters_reset_at || now.toISOString(),
      } as never)
      .eq('id', user.id);

    // Update companion voice minutes
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
        'X-Characters-Remaining': String(Math.max(0, characterLimit - newCharactersUsed)),
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
      .select('subscription_tier, voice_characters_used')
      .eq('id', user.id)
      .single();

    const profile = profileData as Pick<Profile, 'subscription_tier' | 'voice_characters_used'> | null;
    const tier = profile?.subscription_tier || 'free';

    // Get companion
    const { data: companionData } = await supabase
      .from('companions')
      .select('voice_config, name, total_voice_minutes')
      .eq('id', companionId)
      .eq('user_id', user.id)
      .single();

    const companion = companionData as Pick<Companion, 'voice_config' | 'name' | 'total_voice_minutes'> | null;

    if (!companion) {
      return NextResponse.json(
        { error: 'Companion not found' },
        { status: 404 }
      );
    }

    const characterLimit = getVoiceLimitForTier(tier);
    const charactersUsed = profile?.voice_characters_used || 0;

    return NextResponse.json({
      hasVoice: !!companion.voice_config,
      voiceConfig: companion.voice_config,
      hasAccess: hasVoiceAccess(tier),
      tier,
      usage: {
        charactersUsed,
        characterLimit,
        charactersRemaining: Math.max(0, characterLimit - charactersUsed),
        percentUsed: characterLimit > 0 ? Math.round((charactersUsed / characterLimit) * 100) : 0,
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
