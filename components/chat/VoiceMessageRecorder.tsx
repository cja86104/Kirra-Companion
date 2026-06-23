'use client';

/**
 * VOICE MESSAGE RECORDER v2.0
 * ===========================
 * Uses browser's built-in Web Speech API for FREE transcription.
 * No server costs, no API calls needed.
 * 
 * Supported browsers: Chrome, Edge, Safari (with varying quality)
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Loader2, Square, X, Send } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';

// TypeScript declarations for Web Speech API
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

interface VoiceMessageRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  onCancel: () => void;
  maxDuration?: number; // in seconds
  disabled?: boolean;
  autoStart?: boolean; // immediately request permission and begin recording on mount
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

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  // Ref mirror of isRecording — avoids stale closure in recognition.onend
  const isRecordingRef = useRef(false);
  // Tracks current interim text so onend can commit it before restarting
  const interimRef = useRef('');

  const cleanup = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
    streamRef.current = null;
    analyserRef.current = null;
    recognitionRef.current = null;
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

  // When autoStart is true (triggered by mic button click), immediately request
  // microphone permission and begin recording. The browser's permission prompt
  // fires inside startRecording via getUserMedia.
  const autoStarted = useRef(false);
  // useCallback so the autoStart useEffect can list it as a dep without
  // creating an effect-loop. Body reads only refs and stable setters.
  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    // Check for speech recognition support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Voice input not supported in this browser. Try Chrome or Edge.');
      return;
    }

    try {
      // Get microphone access for audio visualization
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up audio analysis for visual feedback
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Start audio level monitoring
      const updateAudioLevel = () => {
        if (!analyserRef.current) return;
        
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioLevel(average / 255);
        
        animationRef.current = requestAnimationFrame(updateAudioLevel);
      };
      updateAudioLevel();

      // Set up speech recognition
      const recognition = new SpeechRecognition();
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
          // no-speech = silence pause (expected), aborted = we stopped it ourselves.
          // Both are logged above but must not show a toast — that would disrupt recording
          // and falsely tell the user something went wrong during a normal pause.
          toast.error('Voice recognition error. Please try again.');
        }
      };

      recognition.onend = () => {
        // Recognition ended naturally (silence timeout or no-speech pause).
        // Use the ref — not state — to avoid the stale closure that always
        // reads the initial false value and prevents restart.
        if (isRecordingRef.current && recognitionRef.current) {
          // Commit any pending interim text as final BEFORE restarting.
          // Without this, words visible on screen are lost when recognition
          // restarts after a pause — causing the "words going away" effect.
          if (interimRef.current.trim()) {
            finalTranscript += interimRef.current.trim() + ' ';
            interimRef.current = '';
            setTranscript(finalTranscript.trim());
            setInterimTranscript('');
          }
          try {
            recognition.start();
          } catch (err) {
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

      // Start duration timer
      timerRef.current = setInterval(() => {
        setDuration(prev => {
          const newDuration = prev + 1;
          if (newDuration >= maxDuration) {
            stopRecording();
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
  }, [maxDuration, stopRecording]);

  useEffect(() => {
    // The autoStarted ref guards against repeat calls even if deps change,
    // so listing them satisfies exhaustive-deps without altering behavior.
    if (autoStart && !autoStarted.current) {
      autoStarted.current = true;
      startRecording();
    }
  }, [autoStart, startRecording]);



  const sendTranscription = useCallback(() => {
    const finalText = (transcript + ' ' + interimTranscript).trim();
    if (finalText) {
      setIsProcessing(true);
      onTranscriptionComplete(finalText);
      cleanup();
      setIsProcessing(false);
    } else {
      toast.error('No speech detected. Please try again.');
    }
  }, [transcript, interimTranscript, onTranscriptionComplete, cleanup]);

  const cancelRecording = useCallback(() => {
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
        <span className="text-sm text-muted-foreground">Sending...</span>
      </div>
    );
  }

  if (isRecording) {
    return (
      <div className="flex flex-col gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
        {/* Top row: indicator, duration, controls */}
        <div className="flex items-center gap-3">
          {/* Recording indicator */}
          <div className="relative flex items-center justify-center">
            <div 
              className="absolute w-10 h-10 rounded-full bg-primary/30 animate-pulse"
              style={{ transform: `scale(${1 + audioLevel * 0.5})` }}
            />
            <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
          </div>

          {/* Duration */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-medium text-primary">
                {formatDuration(duration)}
              </span>
              <span className="text-xs text-muted-foreground">
                / {formatDuration(maxDuration)}
              </span>
            </div>
            
            {/* Audio level visualization */}
            <div className="flex gap-0.5 mt-1">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-1 rounded-full transition-all duration-75',
                    audioLevel * 20 > i ? 'bg-primary' : 'bg-muted'
                  )}
                  style={{ height: `${4 + Math.random() * audioLevel * 12}px` }}
                />
              ))}
            </div>
          </div>

          {/* Controls */}
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
              onClick={() => {
                stopRecording();
                sendTranscription();
              }}
              disabled={!displayText}
              className="bg-primary hover:bg-primary/90"
              title="Send"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Transcription preview */}
        {displayText && (
          <div className="text-sm text-foreground bg-background/50 rounded-md px-3 py-2 max-h-24 overflow-y-auto">
            <span>{transcript}</span>
            <span className="text-muted-foreground italic">{interimTranscript}</span>
          </div>
        )}
        
        {!displayText && (
          <div className="text-sm text-muted-foreground italic px-3">
            Listening... speak now
          </div>
        )}
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={startRecording}
      disabled={disabled}
      className="shrink-0 text-muted-foreground hover:text-foreground"
      title="Record voice message"
    >
      <Mic className="h-5 w-5" />
    </Button>
  );
}

/**
 * Hook to check if voice recording is supported
 */
export function useVoiceRecordingSupported(): boolean {
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const checkSupport = () => {
      try {
        const hasSpeechRecognition = typeof window !== 'undefined' && 
          (window.SpeechRecognition || window.webkitSpeechRecognition);
        const hasMediaDevices = typeof navigator !== 'undefined' && 
          navigator.mediaDevices !== undefined &&
          typeof navigator.mediaDevices.getUserMedia === 'function';
        setIsSupported(!!hasSpeechRecognition && hasMediaDevices);
      } catch {
        setIsSupported(false);
      }
    };
    checkSupport();
  }, []);

  return isSupported;
}
