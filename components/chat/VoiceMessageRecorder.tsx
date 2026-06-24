'use client';

/**
 * VOICE MESSAGE RECORDER v3.0
 * ===========================
 * Two transcription paths:
 *
 *   Desktop (Chrome/Edge): browser's webkitSpeechRecognition - free, runs
 *     locally, streams interim results to the on-screen transcript.
 *
 *   Mobile (iPhone, iPad, Android, viewport < 768): records the message
 *     with MediaRecorder + getUserMedia, uploads the blob to
 *     /api/chat/transcribe, which calls Groq Whisper via OpenRouter.
 *     iOS Safari's webkitSpeechRecognition is documented to never open the
 *     real mic (it uses Apple Dictation which is unreliable); the
 *     MediaRecorder path is the only one that actually works on iPhone.
 *
 * Same UI for both paths - recording indicator, audio-level bars (mobile
 * still shows live levels via getUserMedia, just not the interim transcript
 * since Whisper is batch-only), and a Send button. Mobile shows a brief
 * "Transcribing..." state between Stop and Send because the upload is
 * synchronous from the user's perspective.
 *
 * Cancellation: mobile uses a `cancelledRef` flag so a stop() racing the
 * upload won't fire onTranscriptionComplete after the user cancelled.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Loader2, Square, X, Send } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';

// ── Web Speech API typings ─────────────────────────────────────────────────
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

// ── Mobile capture helpers ─────────────────────────────────────────────────

/**
 * Mobile gate. UA OR narrow viewport. Mobile uses the MediaRecorder ->
 * /api/chat/transcribe path; desktop uses webkitSpeechRecognition.
 */
function isMobileEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof navigator === 'undefined') return false;
  return (
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
    window.innerWidth < 768
  );
}

/**
 * Pick a MediaRecorder mimeType the current browser supports. iOS Safari
 * -> audio/mp4; Chromium -> audio/webm. Returns '' to let MediaRecorder
 * pick its own when none of our preferred types are supported.
 */
function pickRecorderMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = [
    'audio/mp4',
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mpeg',
  ];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

/** Map a recorded blob's mimeType to a filename extension Whisper recognises. */
function extForMime(mime: string): string {
  const base = (mime || '').split(';')[0].trim().toLowerCase();
  if (base === 'audio/mp4' || base === 'audio/m4a' || base === 'audio/x-m4a') return 'mp4';
  if (base === 'audio/mpeg') return 'mp3';
  if (base === 'audio/wav' || base === 'audio/x-wav') return 'wav';
  if (base === 'audio/ogg') return 'ogg';
  return 'webm';
}

interface VoiceMessageRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  onCancel: () => void;
  maxDuration?: number; // in seconds
  disabled?: boolean;
  autoStart?: boolean;  // immediately request permission and begin recording on mount
}

export function VoiceMessageRecorder({
  onTranscriptionComplete,
  onCancel,
  maxDuration = 120,
  disabled = false,
  autoStart = false,
}: VoiceMessageRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Mobile detection initialised in an effect so SSR doesn't see window.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(isMobileEnvironment());
  }, []);

  // Common refs (both paths)
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Desktop (SpeechRecognition) refs
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isRecordingRef = useRef(false);
  const interimRef = useRef('');

  // Mobile (MediaRecorder) refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const cancelledRef = useRef(false);

  const cleanup = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* ignore */ }
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      void audioContextRef.current.close();
    }
    streamRef.current = null;
    analyserRef.current = null;
    recognitionRef.current = null;
    audioContextRef.current = null;
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    isRecordingRef.current = false;
    interimRef.current = '';
    setDuration(0);
    setAudioLevel(0);
    setTranscript('');
    setInterimTranscript('');
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const autoStarted = useRef(false);

  // ── Stop (desktop path) ──────────────────────────────────────────────────
  const stopRecordingDesktop = useCallback(() => {
    isRecordingRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    setIsRecording(false);
  }, []);

  // ── Stop (mobile path) ───────────────────────────────────────────────────
  // MediaRecorder.onstop will fire, uploading the blob and emitting
  // onTranscriptionComplete (unless cancelledRef is true).
  const stopRecordingMobile = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try { recorder.stop(); } catch { /* ignore */ }
    }
    setIsRecording(false);
  }, []);

  // Unified stop for the visible Stop / Send buttons.
  const stopRecording = useCallback(() => {
    if (isMobile) stopRecordingMobile();
    else stopRecordingDesktop();
  }, [isMobile, stopRecordingDesktop, stopRecordingMobile]);

  // ── Upload + transcribe (mobile only) ────────────────────────────────────
  const uploadAndTranscribe = useCallback(async (
    blob: Blob,
    recordedMime: string,
  ): Promise<void> => {
    if (cancelledRef.current) {
      cancelledRef.current = false;
      return;
    }
    if (blob.size === 0) {
      toast.error('No audio was captured. Please try again.');
      return;
    }

    setIsProcessing(true);
    try {
      const form = new FormData();
      form.append('audio', blob, `voice.${extForMime(recordedMime)}`);

      const response = await fetch('/api/chat/transcribe', {
        method: 'POST',
        body: form,
      });

      const bodyText = await response.text().catch(() => '');
      let parsed: { transcript?: string; message?: string } | null = null;
      try {
        parsed = bodyText ? (JSON.parse(bodyText) as { transcript?: string; message?: string }) : null;
      } catch {
        parsed = null;
      }

      if (!response.ok) {
        toast.error(parsed?.message ?? `Transcription failed (${response.status})`);
        return;
      }

      const transcript = (parsed?.transcript ?? '').trim();
      if (transcript) {
        onTranscriptionComplete(transcript);
        cleanup();
      } else {
        toast.error("Couldn't catch that. Please try again.");
      }
    } catch (err) {
      console.error('[STT] transcription upload failed:', err);
      toast.error(
        err instanceof Error ? err.message : 'Transcription failed. Please try again.',
      );
    } finally {
      setIsProcessing(false);
    }
  }, [onTranscriptionComplete, cleanup]);

  // ── Start (desktop path) ─────────────────────────────────────────────────
  const startRecordingDesktop = useCallback(async () => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      toast.error('Voice input not supported in this browser. Try Chrome or Edge.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const updateAudioLevel = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioLevel(average / 255);
        animationRef.current = requestAnimationFrame(updateAudioLevel);
      };
      updateAudioLevel();

      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognitionRef.current = recognition;

      let finalTranscript = '';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript + ' ';
          } else {
            interim += result[0].transcript;
          }
        }
        interimRef.current = interim;
        setTranscript(finalTranscript.trim());
        setInterimTranscript(interim);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          toast.error('Microphone access denied. Please allow microphone access in your browser.');
        } else if (event.error !== 'aborted' && event.error !== 'no-speech') {
          toast.error('Voice recognition error. Please try again.');
        }
      };

      recognition.onend = () => {
        if (isRecordingRef.current && recognitionRef.current) {
          if (interimRef.current.trim()) {
            finalTranscript += interimRef.current.trim() + ' ';
            interimRef.current = '';
            setTranscript(finalTranscript.trim());
            setInterimTranscript('');
          }
          try { recognition.start(); } catch (err) {
            console.error('Failed to restart speech recognition:', err);
          }
        }
      };

      recognition.start();
      isRecordingRef.current = true;
      setIsRecording(true);
      setDuration(0);
      setTranscript('');
      setInterimTranscript('');

      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          const newDuration = prev + 1;
          if (newDuration >= maxDuration) {
            stopRecordingDesktop();
            toast.info(`Recording stopped - maximum ${maxDuration} seconds reached`);
          }
          return newDuration;
        });
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        toast.error('Microphone access denied. Please allow microphone access.');
      } else {
        toast.error('Failed to start recording. Please check your microphone.');
      }
    }
  }, [maxDuration, stopRecordingDesktop]);

  // ── Start (mobile path) ──────────────────────────────────────────────────
  const startRecordingMobile = useCallback(async () => {
    if (typeof MediaRecorder === 'undefined' ||
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== 'function') {
      toast.error('Voice recording is not supported on this browser.');
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const isPermission = err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');
      toast.error(
        isPermission
          ? 'Microphone access denied. Allow microphone for this site, then try again.'
          : 'Could not start the microphone. Please try again.',
      );
      return;
    }
    streamRef.current = stream;

    // Audio level visualizer (best-effort - some mobile browsers throttle
    // AudioContext when the page is backgrounded but it's fine while active).
    try {
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const updateAudioLevel = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioLevel(average / 255);
        animationRef.current = requestAnimationFrame(updateAudioLevel);
      };
      updateAudioLevel();
    } catch (err) {
      console.warn('Audio level visualizer setup failed (non-fatal):', err);
    }

    let recorder: MediaRecorder;
    try {
      const preferred = pickRecorderMimeType();
      recorder = preferred
        ? new MediaRecorder(stream, { mimeType: preferred })
        : new MediaRecorder(stream);
    } catch (err) {
      console.error('Failed to create MediaRecorder:', err);
      stream.getTracks().forEach((t) => t.stop());
      toast.error('Voice recording is not supported on this browser.');
      return;
    }

    mediaRecorderRef.current = recorder;
    audioChunksRef.current = [];
    cancelledRef.current = false;

    recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const recordedMime = recorder.mimeType || 'audio/webm';
      const blob = new Blob(audioChunksRef.current, { type: recordedMime });
      audioChunksRef.current = [];
      // Release the mic immediately so the OS indicator goes away.
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      void uploadAndTranscribe(blob, recordedMime);
    };

    try {
      // Timeslice (ms): forces periodic ondataavailable. Without it, some
      // iOS Safari builds hand back an empty blob at stop().
      recorder.start(1000);
    } catch (err) {
      console.error('Failed to start MediaRecorder:', err);
      stream.getTracks().forEach((t) => t.stop());
      toast.error('Could not start recording. Please try again.');
      return;
    }

    setIsRecording(true);
    setDuration(0);
    setTranscript('');
    setInterimTranscript('');

    timerRef.current = setInterval(() => {
      setDuration((prev) => {
        const newDuration = prev + 1;
        if (newDuration >= maxDuration) {
          stopRecordingMobile();
          toast.info(`Recording stopped - maximum ${maxDuration} seconds reached`);
        }
        return newDuration;
      });
    }, 1000);
  }, [maxDuration, stopRecordingMobile, uploadAndTranscribe]);

  const startRecording = useCallback(async () => {
    if (isMobile) {
      await startRecordingMobile();
    } else {
      await startRecordingDesktop();
    }
  }, [isMobile, startRecordingDesktop, startRecordingMobile]);

  useEffect(() => {
    if (autoStart && !autoStarted.current) {
      autoStarted.current = true;
      void startRecording();
    }
  }, [autoStart, startRecording]);

  const sendTranscription = useCallback(() => {
    // Desktop path: we already have the transcript locally - emit and cleanup.
    if (!isMobile) {
      const finalText = (transcript + ' ' + interimTranscript).trim();
      if (finalText) {
        setIsProcessing(true);
        onTranscriptionComplete(finalText);
        cleanup();
        setIsProcessing(false);
      } else {
        toast.error('No speech detected. Please try again.');
      }
      return;
    }
    // Mobile path: stop the recorder; onstop -> upload -> onTranscriptionComplete.
    // Re-using stopRecordingMobile keeps the flow identical to tapping Stop.
    stopRecordingMobile();
  }, [
    isMobile,
    transcript,
    interimTranscript,
    onTranscriptionComplete,
    cleanup,
    stopRecordingMobile,
  ]);

  const cancelRecording = useCallback(() => {
    // Mobile: mark cancelled so onstop's upload short-circuits.
    cancelledRef.current = true;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
    }
    cleanup();
    setIsRecording(false);
    onCancel();
  }, [cleanup, onCancel]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const displayText = (transcript + ' ' + interimTranscript).trim();

  if (isProcessing) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">
          {isMobile ? 'Transcribing...' : 'Sending...'}
        </span>
      </div>
    );
  }

  if (isRecording) {
    return (
      <div className="flex flex-col gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <div
              className="absolute w-10 h-10 rounded-full bg-primary/30 animate-pulse"
              style={{ transform: `scale(${1 + audioLevel * 0.5})` }}
            />
            <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-medium text-primary">
                {formatDuration(duration)}
              </span>
              <span className="text-xs text-muted-foreground">
                / {formatDuration(maxDuration)}
              </span>
            </div>

            <div className="flex gap-0.5 mt-1">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-1 rounded-full transition-all duration-75',
                    audioLevel * 20 > i ? 'bg-primary' : 'bg-muted',
                  )}
                  style={{ height: `${4 + Math.random() * audioLevel * 12}px` }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={cancelRecording}
              className="text-muted-foreground hover:text-destructive"
              title="Cancel"
            >
              <X className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={stopRecording}
              className="text-muted-foreground hover:text-primary"
              title="Stop recording"
            >
              <Square className="w-4 h-4" />
            </Button>
            <Button
              variant="default"
              size="icon"
              onClick={sendTranscription}
              disabled={!isMobile && !displayText}
              className="bg-primary hover:bg-primary/90"
              title="Send"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Transcript preview - desktop only (mobile has no interim text). */}
        {!isMobile && displayText && (
          <div className="text-sm text-foreground bg-background/50 rounded-md px-3 py-2 max-h-24 overflow-y-auto">
            <span>{transcript}</span>
            <span className="text-muted-foreground italic">{interimTranscript}</span>
          </div>
        )}

        {!isMobile && !displayText && (
          <div className="text-sm text-muted-foreground italic px-3">
            Listening... speak now
          </div>
        )}

        {isMobile && (
          <div className="text-sm text-muted-foreground italic px-3">
            Recording... tap Send when done
          </div>
        )}
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => { void startRecording(); }}
      disabled={disabled}
      className="shrink-0 text-muted-foreground hover:text-foreground"
      title="Record voice message"
    >
      <Mic className="h-5 w-5" />
    </Button>
  );
}

/**
 * Hook to check if voice recording is supported.
 * Desktop: needs SpeechRecognition + MediaDevices.
 * Mobile:  needs MediaRecorder + MediaDevices (uploads to /api/chat/transcribe).
 */
export function useVoiceRecordingSupported(): boolean {
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    try {
      const hasMediaDevices = typeof navigator !== 'undefined' &&
        navigator.mediaDevices !== undefined &&
        typeof navigator.mediaDevices.getUserMedia === 'function';
      if (!hasMediaDevices) {
        setIsSupported(false);
        return;
      }
      if (isMobileEnvironment()) {
        setIsSupported(typeof MediaRecorder !== 'undefined');
      } else {
        const hasSpeechRecognition = typeof window !== 'undefined' &&
          (window.SpeechRecognition || window.webkitSpeechRecognition);
        setIsSupported(!!hasSpeechRecognition);
      }
    } catch {
      setIsSupported(false);
    }
  }, []);

  return isSupported;
}
