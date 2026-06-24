import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  transcribeAudio,
  isSttConfigured,
  MAX_AUDIO_BYTES,
} from '@/lib/stt/openrouter-stt';

/**
 * POST /api/chat/transcribe
 *
 * Mobile voice-input transcription. The mobile client
 * (components/chat/VoiceMessageRecorder.tsx) records the user's spoken
 * message with getUserMedia + MediaRecorder and POSTs the audio here as
 * multipart/form-data (field name `audio`). We transcribe it via Groq
 * Whisper (routed through OpenRouter) and return the text, which the
 * client feeds into the normal send-message flow.
 *
 * This route exists because iOS Safari's webkitSpeechRecognition never
 * opens the real microphone - it uses Apple Dictation under the hood,
 * which is unreliable and the documented "audio-capture" error in
 * production logs. Desktop browsers keep using webkitSpeechRecognition
 * directly and never call this route.
 *
 * Security/quotas mirror the existing /api/companion/[id]/speak route:
 * auth -> STT config check -> per-user rate limit -> request validation.
 */

// Container formats MediaRecorder emits across browsers (codecs suffix
// is stripped before the check): iOS Safari -> audio/mp4, Android Chrome
// -> audio/webm, plus common fallbacks Whisper accepts.
const ALLOWED_AUDIO_TYPES = new Set([
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/mpga',
  'audio/m4a',
  'audio/x-m4a',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/aac',
  'audio/flac',
]);

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to continue' },
        { status: 401 },
      );
    }

    if (!isSttConfigured()) {
      console.error('[STT] OPENROUTER_API_KEY not configured');
      return NextResponse.json(
        { error: 'Configuration error', message: 'Speech-to-text service not configured' },
        { status: 503 },
      );
    }

    // Rate-limit per user. A stuck/looping recorder is bounded before
    // the upstream STT call. 200 requests / 24h is generous for normal
    // chat use but caps runaway clients.
    const rl = await checkRateLimit(user.id, 'transcribe', 200, 86400);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', remaining: rl.remaining, resetsAt: rl.resetsAt },
        { status: 429 },
      );
    }

    // Parse the multipart upload.
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: 'Validation error', message: 'Expected multipart/form-data with an audio file' },
        { status: 400 },
      );
    }

    const audio = formData.get('audio');
    if (!(audio instanceof File)) {
      return NextResponse.json(
        { error: 'Validation error', message: 'audio file is required' },
        { status: 400 },
      );
    }

    if (audio.size === 0) {
      return NextResponse.json(
        { error: 'Validation error', message: 'audio file is empty' },
        { status: 400 },
      );
    }

    if (audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { error: 'Payload too large', message: 'Audio exceeds the size limit. Record a shorter message.' },
        { status: 413 },
      );
    }

    // Normalise the MIME type - browsers append codecs, e.g.
    // "audio/webm;codecs=opus". Validate the base container type.
    const baseType = (audio.type || '').split(';')[0].trim().toLowerCase();
    if (baseType && !ALLOWED_AUDIO_TYPES.has(baseType)) {
      return NextResponse.json(
        { error: 'Unsupported media type', message: `Unsupported audio format: ${baseType}` },
        { status: 415 },
      );
    }

    const { text } = await transcribeAudio({ file: audio, language: 'en' });

    return NextResponse.json({ transcript: text }, { status: 200 });

  } catch (error) {
    console.error('[STT] Error:', error);

    if (error instanceof Error) {
      if (error.message.includes('Invalid OPENROUTER_API_KEY')) {
        return NextResponse.json(
          { error: 'Configuration error', message: 'Speech-to-text authentication failed' },
          { status: 503 },
        );
      }
      if (error.message.toLowerCase().includes('rate limit')) {
        return NextResponse.json(
          { error: 'Rate limit', message: 'Too many requests. Please try again later.' },
          { status: 429 },
        );
      }
      return NextResponse.json(
        { error: 'Transcription error', message: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: 'Server error', message: 'Failed to transcribe audio' },
      { status: 500 },
    );
  }
}
