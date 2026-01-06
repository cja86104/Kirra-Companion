import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  generateVoicePreview,
  hasVoiceAccess,
  OPENAI_VOICES,
  type OpenAIVoiceId,
} from '@/lib/tts/openai-tts';
import type { Profile } from '@/types/database';

/**
 * In-memory cache for voice previews
 * Previews are the same for everyone, so we can cache them globally
 */
interface CachedPreview {
  audioBuffer: ArrayBuffer;
  contentType: string;
  timestamp: number;
}

const previewCache = new Map<string, CachedPreview>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_SIZE = 10; // Cache all 6 voices + buffer

/**
 * Clean expired cache entries
 */
function cleanCache(): void {
  const now = Date.now();
  for (const [key, value] of previewCache.entries()) {
    if (now - value.timestamp > CACHE_TTL_MS) {
      previewCache.delete(key);
    }
  }
}

/**
 * GET /api/voices/preview
 * 
 * Generate and return a voice preview for the specified voice.
 * Caches previews to avoid regenerating the same audio.
 * 
 * Query params:
 * - voiceId: The voice ID to preview (required)
 * - speed: Speaking speed 0.25-4.0 (optional, default 1.0)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const voiceId = searchParams.get('voiceId');
    const speed = searchParams.get('speed');

    // Validate voice ID
    if (!voiceId) {
      return NextResponse.json(
        { error: 'voiceId parameter is required' },
        { status: 400 }
      );
    }

    if (!OPENAI_VOICES[voiceId as OpenAIVoiceId]) {
      return NextResponse.json(
        { 
          error: 'Invalid voice ID',
          valid_ids: Object.keys(OPENAI_VOICES),
        },
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

    // Get user tier for access check
    const { data: profileData } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    const profile = profileData as Pick<Profile, 'subscription_tier'> | null;
    const tier = profile?.subscription_tier || 'free';

    // Check if user has voice access
    if (!hasVoiceAccess(tier)) {
      return NextResponse.json(
        { 
          error: 'Voice previews require a paid subscription',
          current_tier: tier,
          upgrade_message: 'Upgrade to hear voice previews',
        },
        { status: 403 }
      );
    }

    // Parse speed if provided
    let speedValue = 1.0;
    if (speed) {
      const parsed = parseFloat(speed);
      if (!isNaN(parsed) && parsed >= 0.25 && parsed <= 4.0) {
        speedValue = parsed;
      }
    }

    // Create cache key
    const cacheKey = `${voiceId}:${speedValue.toFixed(2)}`;

    // Clean expired entries periodically
    cleanCache();

    // Check cache
    const cached = previewCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return new NextResponse(cached.audioBuffer, {
        headers: {
          'Content-Type': cached.contentType,
          'Cache-Control': 'public, max-age=86400', // 24 hours
          'X-Cache': 'HIT',
        },
      });
    }

    // Check API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not configured');
      return NextResponse.json(
        { error: 'Voice service not configured' },
        { status: 503 }
      );
    }

    // Generate preview
    const result = await generateVoicePreview(voiceId as OpenAIVoiceId);

    // Add to cache (evict oldest if full)
    if (previewCache.size >= MAX_CACHE_SIZE) {
      const oldestKey = previewCache.keys().next().value;
      if (oldestKey) {
        previewCache.delete(oldestKey);
      }
    }

    previewCache.set(cacheKey, {
      audioBuffer: result.audioBuffer,
      contentType: result.contentType,
      timestamp: Date.now(),
    });

    return new NextResponse(result.audioBuffer, {
      headers: {
        'Content-Type': result.contentType,
        'Cache-Control': 'public, max-age=86400', // 24 hours
        'X-Cache': 'MISS',
        'X-Audio-Duration': String(Math.round(result.estimatedDuration)),
      },
    });

  } catch (error) {
    console.error('Voice preview error:', error);
    
    const message = error instanceof Error ? error.message : 'Failed to generate preview';
    
    if (message.includes('Rate limit')) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again in a moment.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/voices/preview
 * 
 * Generate a custom preview with user-provided text.
 * Limited to prevent abuse.
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

    // Get user tier
    const { data: profileData } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    const profile = profileData as Pick<Profile, 'subscription_tier'> | null;
    const tier = profile?.subscription_tier || 'free';

    if (!hasVoiceAccess(tier)) {
      return NextResponse.json(
        { error: 'Voice features require a paid subscription' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { voiceId, text, speed } = body;

    // Validate inputs
    if (!voiceId || !OPENAI_VOICES[voiceId as OpenAIVoiceId]) {
      return NextResponse.json(
        { error: 'Invalid voice ID' },
        { status: 400 }
      );
    }

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Limit custom text to 200 characters for previews
    const MAX_PREVIEW_CHARS = 200;
    const truncatedText = text.slice(0, MAX_PREVIEW_CHARS);

    // Validate speed
    let speedValue = 1.0;
    if (typeof speed === 'number' && speed >= 0.25 && speed <= 4.0) {
      speedValue = speed;
    }

    // Check API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'Voice service not configured' },
        { status: 503 }
      );
    }

    // Import generateSpeech here to avoid circular dependencies
    const { generateSpeech } = await import('@/lib/tts/openai-tts');

    const result = await generateSpeech({
      text: truncatedText,
      voiceId: voiceId as OpenAIVoiceId,
      model: 'tts-1',
      speed: speedValue,
      format: 'mp3',
    });

    return new NextResponse(result.audioBuffer, {
      headers: {
        'Content-Type': result.contentType,
        'Cache-Control': 'private, max-age=300', // 5 minutes for custom previews
        'X-Audio-Duration': String(Math.round(result.estimatedDuration)),
        'X-Characters-Used': String(result.characterCount),
      },
    });

  } catch (error) {
    console.error('Custom preview error:', error);
    return NextResponse.json(
      { error: 'Failed to generate custom preview' },
      { status: 500 }
    );
  }
}
