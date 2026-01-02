/**
 * OpenAI Text-to-Speech Client
 * 
 * OpenAI TTS Features:
 * - 6 high-quality voices (alloy, echo, fable, onyx, nova, shimmer)
 * - Two models: tts-1 (fast) and tts-1-hd (high quality)
 * - Multiple output formats: mp3, opus, aac, flac
 * - Speed control: 0.25 to 4.0
 * 
 * Pricing: $15 per 1M characters (~$0.015 per 1K chars)
 * vs ElevenLabs: $180 per 1M characters
 * 
 * 92% cheaper than ElevenLabs!
 */

const OPENAI_TTS_URL = 'https://api.openai.com/v1/audio/speech';

/**
 * Available OpenAI TTS voices with descriptions
 */
export const OPENAI_VOICES = {
  alloy: {
    id: 'alloy',
    name: 'Alloy',
    description: 'Neutral and balanced',
    gender: 'neutral' as const,
    personality: 'Professional, clear, versatile',
    previewText: "Hi there! I'm Alloy. I have a balanced, neutral voice that works well for any situation.",
  },
  echo: {
    id: 'echo',
    name: 'Echo',
    description: 'Warm and engaging',
    gender: 'male' as const,
    personality: 'Warm, friendly, conversational',
    previewText: "Hey! I'm Echo. I've got a warm, friendly tone that's great for casual conversations.",
  },
  fable: {
    id: 'fable',
    name: 'Fable',
    description: 'Expressive and dynamic',
    gender: 'neutral' as const,
    personality: 'Expressive, storytelling, dynamic',
    previewText: "Hello! I'm Fable. I love bringing stories to life with my expressive voice!",
  },
  onyx: {
    id: 'onyx',
    name: 'Onyx',
    description: 'Deep and authoritative',
    gender: 'male' as const,
    personality: 'Deep, confident, authoritative',
    previewText: "Greetings. I'm Onyx. I have a deep, resonant voice that conveys confidence and calm.",
  },
  nova: {
    id: 'nova',
    name: 'Nova',
    description: 'Friendly and upbeat',
    gender: 'female' as const,
    personality: 'Bright, cheerful, energetic',
    previewText: "Hi! I'm Nova! I'm super excited to chat with you - I've got lots of energy!",
  },
  shimmer: {
    id: 'shimmer',
    name: 'Shimmer',
    description: 'Soft and soothing',
    gender: 'female' as const,
    personality: 'Gentle, calming, soothing',
    previewText: "Hello there. I'm Shimmer. I have a soft, gentle voice that's perfect for relaxing conversations.",
  },
} as const;

export type OpenAIVoiceId = keyof typeof OPENAI_VOICES;

/**
 * TTS model options
 */
export type TTSModel = 'tts-1' | 'tts-1-hd';

/**
 * Audio format options
 */
export type AudioFormat = 'mp3' | 'opus' | 'aac' | 'flac';

/**
 * Voice configuration stored in database
 */
export interface VoiceConfig {
  provider: 'openai' | 'elevenlabs';
  voiceId: string;
  model?: TTSModel;
  speed?: number; // 0.25 to 4.0, default 1.0
}

/**
 * Options for generating speech
 */
export interface GenerateSpeechOptions {
  text: string;
  voiceId: OpenAIVoiceId;
  model?: TTSModel;
  speed?: number;
  format?: AudioFormat;
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
 * Check if OpenAI API is configured
 */
export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Generate speech audio from text using OpenAI TTS
 */
export async function generateSpeech(
  options: GenerateSpeechOptions
): Promise<SpeechResponse> {
  const {
    text,
    voiceId,
    model = 'tts-1',
    speed = 1.0,
    format = 'mp3',
  } = options;

  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  // Validate voice ID
  if (!OPENAI_VOICES[voiceId]) {
    throw new Error(`Invalid voice ID: ${voiceId}`);
  }

  // Validate speed
  const clampedSpeed = Math.max(0.25, Math.min(4.0, speed));

  // OpenAI TTS has a 4096 character limit per request
  const MAX_CHARS = 4096;
  const truncatedText = text.slice(0, MAX_CHARS);

  try {
    const response = await fetch(OPENAI_TTS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: truncatedText,
        voice: voiceId,
        speed: clampedSpeed,
        response_format: format,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI TTS Error:', response.status, errorData);

      if (response.status === 401) {
        throw new Error('Invalid OpenAI API key');
      }

      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }

      if (response.status === 400) {
        const errorMessage = typeof errorData === 'object' && errorData !== null
          ? JSON.stringify(errorData)
          : 'Invalid request';
        throw new Error(`Bad request: ${errorMessage}`);
      }

      throw new Error(`TTS generation failed: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    
    // Estimate duration based on character count and speed
    // Average speaking rate is ~150 words per minute, ~5 chars per word
    // So roughly 750 chars per minute = 12.5 chars per second at normal speed
    const estimatedDuration = (truncatedText.length / 12.5) / clampedSpeed;

    // Determine content type based on format
    const contentTypes: Record<AudioFormat, string> = {
      mp3: 'audio/mpeg',
      opus: 'audio/opus',
      aac: 'audio/aac',
      flac: 'audio/flac',
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
  voiceId: OpenAIVoiceId
): Promise<SpeechResponse> {
  const voice = OPENAI_VOICES[voiceId];
  
  if (!voice) {
    throw new Error(`Invalid voice ID: ${voiceId}`);
  }

  return generateSpeech({
    text: voice.previewText,
    voiceId,
    model: 'tts-1', // Use faster model for previews
    speed: 1.0,
    format: 'mp3',
  });
}

/**
 * Get voices available for a subscription tier
 * All tiers get all voices with OpenAI (it's cheap enough)
 */
export function getVoicesForTier(tier: string): typeof OPENAI_VOICES {
  // With OpenAI's pricing, we can offer all voices to all paid tiers
  // Only restrict for free/trial if needed
  if (tier === 'free') {
    // Free users get no voice access
    return {} as typeof OPENAI_VOICES;
  }
  
  // All paid tiers (including trial) get all voices
  return OPENAI_VOICES;
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
  // OpenAI pricing: $15 per 1M characters
  return (characterCount / 1000000) * 15;
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
  
  if (c.provider !== 'openai' && c.provider !== 'elevenlabs') {
    return false;
  }

  if (typeof c.voiceId !== 'string' || c.voiceId.length === 0) {
    return false;
  }

  if (c.provider === 'openai' && !OPENAI_VOICES[c.voiceId as OpenAIVoiceId]) {
    return false;
  }

  if (c.speed !== undefined) {
    if (typeof c.speed !== 'number' || c.speed < 0.25 || c.speed > 4.0) {
      return false;
    }
  }

  return true;
}

/**
 * Create a default voice configuration
 */
export function createDefaultVoiceConfig(voiceId: OpenAIVoiceId = 'nova'): VoiceConfig {
  return {
    provider: 'openai',
    voiceId,
    model: 'tts-1',
    speed: 1.0,
  };
}
