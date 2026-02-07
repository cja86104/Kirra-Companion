import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  CARTESIA_VOICES,
  hasVoiceAccess,
  getVoiceLimitForTier,
  type CartesiaVoiceId,
} from '@/lib/tts/cartesia-tts';

/**
 * Voice option returned to client
 */
interface VoiceOption {
  voice_id: string;
  name: string;
  description: string;
  gender: 'male' | 'female' | 'neutral';
  personality: string;
  available: boolean;
  preview_text: string;
}

interface ProfileTier {
  subscription_tier: 'free' | 'basic' | 'pro' | 'ultimate';
}

/**
 * GET /api/voices
 * 
 * Returns list of available Cartesia TTS voices for the user's tier.
 * All voices are available to all paid tiers.
 * 
 * Provider: Cartesia Sonic 3 - 40ms time-to-first-audio
 */
export async function GET(request: NextRequest) {
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

    // Get user profile for tier
    const { data: profileData } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    const profile = profileData as ProfileTier | null;
    const tier = profile?.subscription_tier || 'free';
    const hasAccess = hasVoiceAccess(tier);

    // Build voice options list
    const voiceOptions: VoiceOption[] = Object.entries(CARTESIA_VOICES).map(([id, voice]) => ({
      voice_id: id,
      name: voice.name,
      description: voice.description,
      gender: voice.gender,
      personality: voice.personality,
      available: hasAccess, // All voices available if user has access
      preview_text: voice.previewText,
    }));

    // Calculate usage stats from actual companion voice minutes
    const characterLimit = getVoiceLimitForTier(tier);
    
    // Get total voice minutes across all user's companions
    const { data: companionsData } = await supabase
      .from('companions')
      .select('total_voice_minutes')
      .eq('user_id', user.id);

    // Sum total voice minutes and estimate characters
    // Average speech rate is ~150 words/min, ~750 characters/min
    const CHARS_PER_MINUTE = 750;
    const totalVoiceMinutes = (companionsData || []).reduce(
      (sum, c) => sum + (c.total_voice_minutes || 0),
      0
    );
    const charactersUsed = Math.round(totalVoiceMinutes * CHARS_PER_MINUTE);

    return NextResponse.json({
      voices: voiceOptions,
      tier,
      has_voice_access: hasAccess,
      available_count: hasAccess ? voiceOptions.length : 0,
      total_count: voiceOptions.length,
      provider: 'cartesia',
      usage: {
        characters_used: charactersUsed,
        characters_limit: characterLimit,
        characters_remaining: Math.max(0, characterLimit - charactersUsed),
        percent_used: characterLimit > 0 ? Math.round((charactersUsed / characterLimit) * 100) : 0,
      },
      upgrade_message: !hasAccess 
        ? 'Upgrade to a paid plan to unlock voice features for your companions.'
        : null,
    });

  } catch (error) {
    console.error('Voices API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch voices' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/voices
 * 
 * Validate a voice configuration before saving.
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

    const body = await request.json();
    const { voiceId, speed } = body;

    // Validate voice ID
    if (!voiceId || !CARTESIA_VOICES[voiceId as CartesiaVoiceId]) {
      return NextResponse.json(
        { 
          error: 'Invalid voice ID',
          valid_ids: Object.keys(CARTESIA_VOICES),
        },
        { status: 400 }
      );
    }

    // Validate speed if provided (Cartesia uses 0.5 to 2.0 range or string values)
    if (speed !== undefined) {
      if (typeof speed === 'number' && (speed < 0.5 || speed > 2.0)) {
        return NextResponse.json(
          { 
            error: 'Speed must be a number between 0.5 and 2.0, or a string: slowest, slow, normal, fast, fastest',
            received: speed,
          },
          { status: 400 }
        );
      }
      if (typeof speed === 'string' && !['slowest', 'slow', 'normal', 'fast', 'fastest'].includes(speed)) {
        return NextResponse.json(
          { 
            error: 'Speed must be one of: slowest, slow, normal, fast, fastest',
            received: speed,
          },
          { status: 400 }
        );
      }
    }

    // Get user tier
    const { data: profileData } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    const profile = profileData as ProfileTier | null;
    const tier = profile?.subscription_tier || 'free';

    if (!hasVoiceAccess(tier)) {
      return NextResponse.json(
        { 
          error: 'Voice features require a paid subscription',
          current_tier: tier,
        },
        { status: 403 }
      );
    }

    // Return validated configuration
    const voiceConfig = {
      provider: 'cartesia' as const,
      voiceId,
      model: 'sonic-3' as const,
      speed: speed ?? 'normal',
    };

    const voice = CARTESIA_VOICES[voiceId as CartesiaVoiceId];

    return NextResponse.json({
      valid: true,
      voice_config: voiceConfig,
      voice_details: {
        name: voice.name,
        description: voice.description,
        gender: voice.gender,
        personality: voice.personality,
      },
    });

  } catch (error) {
    console.error('Voice validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate voice configuration' },
      { status: 500 }
    );
  }
}
