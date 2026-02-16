/**
 * OpenAI Text-to-Speech Client (Optimized for Perceived Latency)
 * 
 * Optimization Strategy:
 * - Split text into sentences at natural boundaries
 * - Generate TTS for first sentence immediately
 * - Queue remaining sentences for seamless playback
 * - User hears audio ~500ms after first sentence ready vs 3+ sec for full text
 * 
 * OpenAI TTS:
 * - Latency: ~500-800ms per request (batch, no streaming)
 * - Cost: $15 per 1M characters (~$0.015 per 1K chars)
 * - Models: tts-1 (fast), tts-1-hd (quality)
 * - Voices: alloy, echo, fable, onyx, nova, shimmer
 */

const OPENAI_TTS_URL = 'https://api.openai.com/v1/audio/speech';

/**
 * Available OpenAI TTS voices
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

export type TTSModel = 'tts-1' | 'tts-1-hd';
export type AudioFormat = 'mp3' | 'opus' | 'aac' | 'flac';

/**
 * Voice configuration stored in database
 */
export interface VoiceConfig {
  provider: 'openai' | 'elevenlabs' | 'cartesia';
  voiceId: string;
  model?: TTSModel;
  speed?: number;
}

export interface GenerateSpeechOptions {
  text: string;
  voiceId: OpenAIVoiceId;
  model?: TTSModel;
  speed?: number;
  format?: AudioFormat;
}

export interface SpeechResponse {
  audioBuffer: ArrayBuffer;
  contentType: string;
  characterCount: number;
  estimatedDuration: number;
}

/**
 * Sentence chunk for queued playback
 */
export interface SentenceChunk {
  index: number;
  text: string;
  isLast: boolean;
}

// ============================================================================
// SENTENCE SPLITTING - Core optimization
// ============================================================================

/**
 * Split text into sentences for progressive TTS.
 * 
 * Design goals:
 * - Natural pause points (sentence boundaries)
 * - Minimum ~30 chars per chunk to avoid choppy audio
 * - Maximum ~200 chars per chunk for responsive playback
 * - Handle edge cases: ellipsis, quotes, abbreviations
 */
export function splitIntoSentences(text: string): string[] {
  if (!text?.trim()) return [];
  
  const trimmed = text.trim();
  
  // Very short text - return as single chunk
  if (trimmed.length <= 60) {
    return [trimmed];
  }
  
  // Split on sentence-ending punctuation followed by space or end
  // Handles: . ! ? and combinations like "..." "?!" 
  const sentencePattern = /[^.!?]*[.!?]+(?:\s+|$)/g;
  const matches = trimmed.match(sentencePattern);
  
  if (!matches || matches.length === 0) {
    // No sentence boundaries - split on commas or return whole
    const commaSplit = trimmed.split(/,\s+/);
    if (commaSplit.length > 1 && commaSplit.every(s => s.length >= 20)) {
      return commaSplit.map((s, i) => 
        i < commaSplit.length - 1 ? s + ',' : s
      );
    }
    return [trimmed];
  }
  
  const sentences: string[] = [];
  let buffer = '';
  
  for (const match of matches) {
    const sentence = match.trim();
    if (!sentence) continue;
    
    // If buffer + sentence is still short, combine them
    if (buffer && (buffer.length + sentence.length) < 80) {
      buffer += ' ' + sentence;
    } else if (buffer) {
      sentences.push(buffer);
      buffer = sentence.length < 30 ? sentence : '';
      if (sentence.length >= 30) {
        sentences.push(sentence);
      }
    } else if (sentence.length < 30) {
      // Start a buffer for short sentences
      buffer = sentence;
    } else {
      sentences.push(sentence);
    }
  }
  
  // Handle remaining buffer
  if (buffer) {
    if (sentences.length > 0 && sentences[sentences.length - 1].length < 60) {
      sentences[sentences.length - 1] += ' ' + buffer;
    } else {
      sentences.push(buffer);
    }
  }
  
  // Handle any text after the last sentence boundary
  const matchedLength = matches.join('').length;
  if (matchedLength < trimmed.length) {
    const remainder = trimmed.slice(matchedLength).trim();
    if (remainder) {
      if (sentences.length > 0 && sentences[sentences.length - 1].length < 80) {
        sentences[sentences.length - 1] += ' ' + remainder;
      } else {
        sentences.push(remainder);
      }
    }
  }
  
  return sentences.filter(s => s.trim().length > 0);
}

/**
 * Prepare sentences for TTS queue with metadata
 */
export function prepareSentenceQueue(text: string): SentenceChunk[] {
  const sentences = splitIntoSentences(text);
  return sentences.map((text, index) => ({
    index,
    text,
    isLast: index === sentences.length - 1,
  }));
}

// ============================================================================
// TTS GENERATION
// ============================================================================

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

  // Validate voice
  if (!OPENAI_VOICES[voiceId]) {
    throw new Error(`Invalid voice ID: ${voiceId}`);
  }

  // Clamp speed to valid range
  const clampedSpeed = Math.max(0.25, Math.min(4.0, speed));

  // OpenAI limit is 4096 characters
  const MAX_CHARS = 4096;
  const truncatedText = text.slice(0, MAX_CHARS);

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
    throw new Error(`TTS generation failed: ${response.status}`);
  }

  const audioBuffer = await response.arrayBuffer();
  
  // Estimate duration: ~150 words/min, ~5 chars/word = 750 chars/min = 12.5 chars/sec
  const estimatedDuration = (truncatedText.length / 12.5) / clampedSpeed;

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
}

/**
 * Generate TTS for a single sentence (optimized for queue)
 */
export async function generateSentenceSpeech(
  sentence: string,
  voiceId: OpenAIVoiceId,
  speed: number = 1.0
): Promise<SpeechResponse> {
  return generateSpeech({
    text: sentence,
    voiceId,
    model: 'tts-1', // Use faster model for sentences
    speed,
    format: 'mp3',
  });
}

/**
 * Generate a voice preview using the voice's preview text
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
    model: 'tts-1',
    speed: 1.0,
    format: 'mp3',
  });
}

// ============================================================================
// VOICE UTILITIES
// ============================================================================

export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export function hasVoiceAccess(tier: string): boolean {
  return ['trial', 'basic', 'pro', 'ultimate'].includes(tier);
}

export function getVoiceLimitForTier(tier: string): number {
  switch (tier) {
    case 'ultimate': return 500000;
    case 'pro': return 200000;
    case 'basic': return 50000;
    case 'trial': return 10000;
    default: return 0;
  }
}

export function isValidVoiceConfig(config: unknown): config is VoiceConfig {
  if (typeof config !== 'object' || config === null) return false;
  
  const c = config as Record<string, unknown>;
  
  if (!['openai', 'elevenlabs', 'cartesia'].includes(c.provider as string)) {
    return false;
  }
  
  if (typeof c.voiceId !== 'string' || c.voiceId.length === 0) {
    return false;
  }
  
  if (c.speed !== undefined && (typeof c.speed !== 'number' || c.speed < 0.25 || c.speed > 4.0)) {
    return false;
  }
  
  return true;
}

/**
 * Map Cartesia voice IDs to OpenAI equivalents
 */
export function mapCartesiaToOpenAI(cartesiaVoiceId: string): OpenAIVoiceId {
  const mapping: Record<string, OpenAIVoiceId> = {
    'tessa': 'nova',
    'maya': 'shimmer',
    'katie': 'alloy',
    'leo': 'onyx',
    'kyle': 'echo',
    'kiefer': 'fable',
  };
  return mapping[cartesiaVoiceId] || 'nova';
}

/**
 * Migrate voice config from Cartesia/ElevenLabs to OpenAI
 */
export function migrateVoiceConfig(config: VoiceConfig): VoiceConfig {
  if (config.provider === 'openai') {
    // Already OpenAI - validate voice exists
    if (!OPENAI_VOICES[config.voiceId as OpenAIVoiceId]) {
      return { ...config, voiceId: 'nova' };
    }
    return config;
  }
  
  // Map from Cartesia
  if (config.provider === 'cartesia') {
    return {
      provider: 'openai',
      voiceId: mapCartesiaToOpenAI(config.voiceId),
      model: 'tts-1',
      speed: typeof config.speed === 'number' ? Math.min(4.0, Math.max(0.25, config.speed)) : 1.0,
    };
  }
  
  // Default for unknown providers
  return {
    provider: 'openai',
    voiceId: 'nova',
    model: 'tts-1',
    speed: 1.0,
  };
}

export function createDefaultVoiceConfig(voiceId: OpenAIVoiceId = 'nova'): VoiceConfig {
  return {
    provider: 'openai',
    voiceId,
    model: 'tts-1',
    speed: 1.0,
  };
}
