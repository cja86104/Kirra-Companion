/**
 * Cartesia Sonic 3 Text-to-Speech Client
 * 
 * Cartesia TTS Features:
 * - Ultra-low latency: 40-90ms time-to-first-audio
 * - Native streaming support for conversational AI
 * - 6 high-quality voices selected for AI companions
 * - Emotional expression and natural prosody
 * - 42 language support
 * 
 * Pricing: ~$0.038 per 1K characters
 * vs OpenAI: $0.015 per 1K chars (but 500-800ms+ latency, no streaming)
 * 
 * Trade-off: Slightly higher cost for dramatically better UX
 */

const CARTESIA_TTS_URL = 'https://api.cartesia.ai/tts/bytes';
const CARTESIA_API_VERSION = '2025-04-16';

/**
 * Cartesia voice IDs - selected for AI companion personalities
 */
export const CARTESIA_VOICES = {
  tessa: {
    id: 'tessa',
    cartesiaId: '6ccbfb76-1fc6-48f7-b71d-91ac6298247b',
    name: 'Tessa',
    description: 'Warm and engaging',
    gender: 'female' as const,
    personality: 'Friendly, supportive, conversational',
    previewText: "Hi there! I'm Tessa. I love having warm, meaningful conversations and being here for you.",
  },
  maya: {
    id: 'maya',
    cartesiaId: 'c58c5a0c-4ed8-4c67-aec3-bb6fef4b4c02',
    name: 'Maya',
    description: 'Soft and soothing',
    gender: 'female' as const,
    personality: 'Gentle, calming, empathetic',
    previewText: "Hello. I'm Maya. I have a gentle presence and I'm here to listen whenever you need me.",
  },
  katie: {
    id: 'katie',
    cartesiaId: 'f786b574-daa5-4673-aa0c-cbe3e8534c02',
    name: 'Katie',
    description: 'Clear and balanced',
    gender: 'female' as const,
    personality: 'Professional, articulate, versatile',
    previewText: "Hello! I'm Katie. I have a clear, balanced voice that works well for any conversation.",
  },
  leo: {
    id: 'leo',
    cartesiaId: '040132fe-5f8f-4e9f-a315-18a5c8b8c445',
    name: 'Leo',
    description: 'Deep and reassuring',
    gender: 'male' as const,
    personality: 'Calm, confident, grounding',
    previewText: "Greetings. I'm Leo. I bring a calm, steady presence to our conversations.",
  },
  kyle: {
    id: 'kyle',
    cartesiaId: 'c961b81c-a935-4c17-bfb3-ba2239de8c2f',
    name: 'Kyle',
    description: 'Friendly and energetic',
    gender: 'male' as const,
    personality: 'Upbeat, enthusiastic, engaging',
    previewText: "Hey! I'm Kyle! I'm always excited to chat and bring some positive energy to your day!",
  },
  kiefer: {
    id: 'kiefer',
    cartesiaId: '228fca29-3a0a-435c-8728-5cb483251068',
    name: 'Kiefer',
    description: 'Expressive and thoughtful',
    gender: 'male' as const,
    personality: 'Articulate, dynamic, storytelling',
    previewText: "Hello! I'm Kiefer. I love expressing ideas with nuance and bringing depth to our talks.",
  },
} as const;

export type CartesiaVoiceId = keyof typeof CARTESIA_VOICES;

/**
 * Speed options for TTS
 * Cartesia uses descriptive speeds internally mapped to multipliers
 */
export type TTSSpeed = 'slowest' | 'slow' | 'normal' | 'fast' | 'fastest';

/**
 * Map speed descriptions to Cartesia speed values
 */
const SPEED_MAP: Record<TTSSpeed, number> = {
  slowest: -1,
  slow: -0.5,
  normal: 0,
  fast: 0.5,
  fastest: 1,
};

/**
 * Audio format options
 */
export type AudioFormat = 'mp3' | 'wav' | 'raw';

/**
 * Voice configuration stored in database
 * Maintains compatibility with existing provider field
 */
export interface VoiceConfig {
  provider: 'cartesia' | 'openai' | 'elevenlabs';
  voiceId: string;
  model?: string;
  speed?: number | TTSSpeed;
}

/**
 * Options for generating speech
 */
export interface GenerateSpeechOptions {
  text: string;
  voiceId: CartesiaVoiceId;
  speed?: TTSSpeed | number;
  format?: AudioFormat;
  language?: string;
}

/**
 * Response from speech generation
 */
export interface SpeechResponse {
  audioBuffer: ArrayBuffer;
  contentType: string;
  characterCount: number;
  estimatedDuration: number; // seconds
}

/**
 * Check if Cartesia API is configured
 */
export function isCartesiaConfigured(): boolean {
  return !!process.env.CARTESIA_API_KEY;
}

/**
 * Convert numeric speed to Cartesia speed value
 * Accepts both TTSSpeed strings and numeric values (0.5-2.0 range)
 */
function normalizeSpeed(speed: TTSSpeed | number | undefined): number {
  if (speed === undefined) {
    return 0; // normal
  }

  if (typeof speed === 'string') {
    return SPEED_MAP[speed] ?? 0;
  }

  // Convert numeric speed (0.5-2.0 range) to Cartesia range (-1 to 1)
  // 0.5 -> -1, 1.0 -> 0, 2.0 -> 1
  const clamped = Math.max(0.5, Math.min(2.0, speed));
  return (clamped - 1.0) * 2;
}

/**
 * Get the Cartesia voice UUID from a voice ID
 */
export function getCartesiaVoiceUUID(voiceId: CartesiaVoiceId): string {
  const voice = CARTESIA_VOICES[voiceId];
  if (!voice) {
    throw new Error(`Invalid voice ID: ${voiceId}`);
  }
  return voice.cartesiaId;
}

/**
 * Generate speech audio from text using Cartesia Sonic 3
 */
export async function generateSpeech(
  options: GenerateSpeechOptions
): Promise<SpeechResponse> {
  const {
    text,
    voiceId,
    speed,
    format = 'mp3',
    language = 'en',
  } = options;

  const apiKey = process.env.CARTESIA_API_KEY;

  if (!apiKey) {
    throw new Error('CARTESIA_API_KEY environment variable is not set');
  }

  // Validate voice ID
  const voice = CARTESIA_VOICES[voiceId];
  if (!voice) {
    throw new Error(`Invalid voice ID: ${voiceId}. Valid IDs: ${Object.keys(CARTESIA_VOICES).join(', ')}`);
  }

  // Cartesia supports up to 10,000 characters per request
  const MAX_CHARS = 10000;
  const truncatedText = text.slice(0, MAX_CHARS);

  if (truncatedText.length === 0) {
    throw new Error('Text cannot be empty');
  }

  // Build output format configuration
  const outputFormat = format === 'mp3'
    ? {
        container: 'mp3' as const,
        bit_rate: 128000,
        sample_rate: 44100,
      }
    : format === 'wav'
    ? {
        container: 'wav' as const,
        encoding: 'pcm_s16le' as const,
        sample_rate: 44100,
      }
    : {
        container: 'raw' as const,
        encoding: 'pcm_s16le' as const,
        sample_rate: 24000,
      };

  // Build request body
  const requestBody = {
    model_id: 'sonic-3',
    transcript: truncatedText,
    voice: {
      mode: 'id',
      id: voice.cartesiaId,
    },
    language,
    output_format: outputFormat,
    __experimental_voice_controls: {
      speed: normalizeSpeed(speed),
    },
  };

  try {
    const response = await fetch(CARTESIA_TTS_URL, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Cartesia-Version': CARTESIA_API_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('Cartesia TTS Error:', response.status, errorText);

      if (response.status === 401) {
        throw new Error('Invalid Cartesia API key');
      }

      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }

      if (response.status === 400) {
        throw new Error(`Bad request: ${errorText}`);
      }

      throw new Error(`TTS generation failed: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();

    // Estimate duration based on character count
    // Average speaking rate is ~150 words per minute, ~5 chars per word
    // So roughly 750 chars per minute = 12.5 chars per second at normal speed
    const speedMultiplier = 1 + (normalizeSpeed(speed) * 0.5); // -1 to 1 -> 0.5 to 1.5
    const estimatedDuration = (truncatedText.length / 12.5) / speedMultiplier;

    // Determine content type based on format
    const contentTypes: Record<AudioFormat, string> = {
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      raw: 'audio/pcm',
    };

    return {
      audioBuffer,
      contentType: contentTypes[format],
      characterCount: truncatedText.length,
      estimatedDuration,
    };
  } catch (error) {
    if (error instanceof Error) {
      console.error('TTS generation error:', error.message);
      throw error;
    }
    throw new Error('Unknown error during TTS generation');
  }
}

/**
 * Generate a voice preview for the given voice ID
 */
export async function generateVoicePreview(
  voiceId: CartesiaVoiceId
): Promise<SpeechResponse> {
  const voice = CARTESIA_VOICES[voiceId];

  if (!voice) {
    throw new Error(`Invalid voice ID: ${voiceId}`);
  }

  return generateSpeech({
    text: voice.previewText,
    voiceId,
    speed: 'normal',
    format: 'mp3',
  });
}

/**
 * Get voices available for a subscription tier
 * All tiers get all voices (pricing allows this)
 */
export function getVoicesForTier(tier: string): typeof CARTESIA_VOICES {
  if (tier === 'free') {
    // Free users get no voice access
    return {} as typeof CARTESIA_VOICES;
  }

  // All paid tiers (including trial) get all voices
  return CARTESIA_VOICES;
}

/**
 * Get voice usage limits by tier (characters per month)
 */
export function getVoiceLimitForTier(tier: string): number {
  switch (tier) {
    case 'ultimate':
      return 500000;  // ~250 minutes
    case 'pro':
      return 200000;  // ~100 minutes
    case 'basic':
      return 50000;   // ~25 minutes
    case 'trial':
      return 10000;   // ~5 minutes (demo)
    default:
      return 0;       // No voice for free tier
  }
}

/**
 * Estimate cost for character count
 */
export function estimateVoiceCost(characterCount: number): number {
  // Cartesia pricing: ~$0.038 per 1K characters
  return (characterCount / 1000) * 0.038;
}

/**
 * Check if user has voice access based on tier
 */
export function hasVoiceAccess(tier: string): boolean {
  return ['trial', 'basic', 'pro', 'ultimate'].includes(tier);
}

/**
 * Validate a voice configuration object
 */
export function isValidVoiceConfig(config: unknown): config is VoiceConfig {
  if (typeof config !== 'object' || config === null) {
    return false;
  }

  const c = config as Record<string, unknown>;

  // Accept cartesia, openai (legacy), or elevenlabs (legacy)
  if (c.provider !== 'cartesia' && c.provider !== 'openai' && c.provider !== 'elevenlabs') {
    return false;
  }

  if (typeof c.voiceId !== 'string' || c.voiceId.length === 0) {
    return false;
  }

  // For Cartesia provider, validate voice ID exists
  if (c.provider === 'cartesia' && !CARTESIA_VOICES[c.voiceId as CartesiaVoiceId]) {
    return false;
  }

  // Validate speed if present
  if (c.speed !== undefined) {
    if (typeof c.speed === 'number') {
      if (c.speed < 0.5 || c.speed > 2.0) {
        return false;
      }
    } else if (typeof c.speed === 'string') {
      if (!['slowest', 'slow', 'normal', 'fast', 'fastest'].includes(c.speed)) {
        return false;
      }
    } else {
      return false;
    }
  }

  return true;
}

/**
 * Create a default voice configuration
 */
export function createDefaultVoiceConfig(voiceId: CartesiaVoiceId = 'tessa'): VoiceConfig {
  return {
    provider: 'cartesia',
    voiceId,
    model: 'sonic-3',
    speed: 'normal',
  };
}

/**
 * Map legacy OpenAI voice IDs to Cartesia equivalents
 * Used for migrating existing companions
 */
export function mapOpenAIVoiceToCartesia(openaiVoiceId: string): CartesiaVoiceId {
  const mapping: Record<string, CartesiaVoiceId> = {
    // OpenAI -> Cartesia mapping based on voice characteristics
    'nova': 'tessa',      // friendly/upbeat female -> warm/engaging female
    'shimmer': 'maya',    // soft/soothing female -> soft/soothing female
    'alloy': 'katie',     // neutral/balanced -> clear/balanced female
    'onyx': 'leo',        // deep/authoritative male -> deep/reassuring male
    'echo': 'kyle',       // warm/engaging male -> friendly/energetic male
    'fable': 'kiefer',    // expressive/dynamic -> expressive/thoughtful male
  };

  return mapping[openaiVoiceId] || 'tessa';
}

/**
 * Migrate a legacy voice config to Cartesia
 */
export function migrateVoiceConfig(config: VoiceConfig): VoiceConfig {
  if (config.provider === 'cartesia') {
    return config;
  }

  // Map OpenAI or ElevenLabs voice to Cartesia
  const cartesiaVoiceId = config.provider === 'openai'
    ? mapOpenAIVoiceToCartesia(config.voiceId)
    : 'tessa'; // Default for ElevenLabs

  return {
    provider: 'cartesia',
    voiceId: cartesiaVoiceId,
    model: 'sonic-3',
    speed: typeof config.speed === 'number'
      ? config.speed
      : 'normal',
  };
}
