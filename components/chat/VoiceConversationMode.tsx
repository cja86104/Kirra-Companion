'use client';

/**
 * VOICE CONVERSATION MODE
 * =======================
 * Hands-free conversation like talking to a real person.
 * 
 * Flow:
 * 1. User clicks phone icon to start voice mode
 * 2. System listens continuously
 * 3. When user stops speaking, auto-sends message
 * 4. Companion responds with voice
 * 5. After TTS finishes, goes back to listening
 * 6. Repeat until user clicks to end
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Loader2, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

interface ISpeechRecognition extends EventTarget {
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
  onspeechend: (() => void) | null;
}

// Type for accessing browser speech recognition
type SpeechRecognitionConstructor = new () => ISpeechRecognition;

// Helper to get speech recognition constructor
function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

interface VoiceConversationModeProps {
  isActive: boolean;
  onStart: () => void;
  onEnd: () => void;
  onSendMessage: (text: string) => Promise<void>;
  companionName: string;
  companionId: string;
  hasVoiceEnabled: boolean;
}

export function VoiceConversationMode({
  isActive,
  onStart,
  onEnd,
  onSendMessage,
  companionName,
  companionId,
  hasVoiceEnabled,
}: VoiceConversationModeProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);

  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isActiveRef = useRef(isActive);
  const finalTranscriptRef = useRef('');
  const handleSendRef = useRef<(text: string) => void>(() => {});

  // Keep refs in sync
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  const cleanup = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
    setTranscript('');
    setInterimTranscript('');
    finalTranscriptRef.current = '';
  }, []);

  // Start listening
  const startListening = useCallback(async () => {
    const SpeechRecognitionCtor = getSpeechRecognition();
    if (!SpeechRecognitionCtor) {
      toast.error('Voice not supported in this browser');
      return;
    }

    try {
      // Get microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Audio visualization
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const updateAudioLevel = () => {
        if (!analyserRef.current || !isActiveRef.current) return;
        
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioLevel(average / 255);
        
        animationRef.current = requestAnimationFrame(updateAudioLevel);
      };
      updateAudioLevel();

      // Speech recognition
      const recognition = new SpeechRecognitionCtor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognitionRef.current = recognition;

      finalTranscriptRef.current = '';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscriptRef.current += result[0].transcript + ' ';
          } else {
            interim += result[0].transcript;
          }
        }
        
        setTranscript(finalTranscriptRef.current.trim());
        setInterimTranscript(interim);

        // Reset silence timeout on any speech
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        
        // Auto-send after 2 seconds of silence (when we have content)
        if (finalTranscriptRef.current.trim() || interim) {
          silenceTimeoutRef.current = setTimeout(() => {
            const textToSend = (finalTranscriptRef.current + ' ' + interim).trim();
            if (textToSend && isActiveRef.current) {
              handleSendRef.current(textToSend);
            }
          }, 2000);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error !== 'aborted' && event.error !== 'no-speech') {
          console.error('Speech error:', event.error);
        }
      };

      recognition.onend = () => {
        // Restart if still active and in listening state
        if (isActiveRef.current) {
          setTimeout(() => {
            if (isActiveRef.current && recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch (e) {
                // Already started or other error
              }
            }
          }, 100);
        }
      };

      recognition.start();
      setVoiceState('listening');
      setTranscript('');
      setInterimTranscript('');

    } catch (error) {
      console.error('Error starting voice:', error);
      toast.error('Could not access microphone');
      onEnd();
    }
  }, [onEnd]);

  // Send message and play response, then listen again
  const handleSendAndListen = useCallback(async (text: string) => {
    if (!text.trim()) return;

    // Stop listening while processing
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }

    setVoiceState('processing');
    setTranscript('');
    setInterimTranscript('');
    finalTranscriptRef.current = '';

    try {
      // Send message - this will trigger TTS playback via ChatWindow
      await onSendMessage(text);
      
      // Estimate TTS duration based on word count
      // Average speaking rate: ~150 words/minute = 2.5 words/second
      // Average response: 20-50 words = 8-20 seconds
      // We'll use a base of 3 seconds + 0.4 seconds per word in the response
      // Since we don't know response length, use 6 seconds as default
      const estimatedTTSDuration = 6000;
      
      setVoiceState('speaking');
      
      // Wait for TTS to finish (estimated), then go back to listening
      setTimeout(() => {
        if (isActiveRef.current) {
          startListening();
        }
      }, estimatedTTSDuration);

    } catch (error) {
      console.error('Error sending message:', error);
      // Go back to listening on error
      if (isActiveRef.current) {
        setTimeout(() => startListening(), 1000);
      }
    }
  }, [onSendMessage, startListening]);

  // Keep handleSendRef in sync with handleSendAndListen
  useEffect(() => {
    handleSendRef.current = handleSendAndListen;
  }, [handleSendAndListen]);

  // Handle start/stop of voice mode
  useEffect(() => {
    if (isActive && voiceState === 'idle') {
      startListening();
    } else if (!isActive && voiceState !== 'idle') {
      cleanup();
      setVoiceState('idle');
    }
  }, [isActive, voiceState, startListening, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const displayText = (transcript + ' ' + interimTranscript).trim();

  // Voice mode button (when not active)
  if (!isActive) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={onStart}
        className="text-muted-foreground hover:text-primary hover:bg-primary/10"
        title="Start voice conversation"
        disabled={!hasVoiceEnabled}
      >
        <Phone className="h-5 w-5" />
      </Button>
    );
  }

  // Active voice conversation UI
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm"
      >
        <div className="flex flex-col items-center gap-8 p-8 max-w-md text-center">
          {/* Animated circle */}
          <div className="relative">
            {/* Outer pulse */}
            <motion.div
              className={cn(
                'absolute inset-0 rounded-full',
                voiceState === 'listening' && 'bg-primary/20',
                voiceState === 'processing' && 'bg-amber-500/20',
                voiceState === 'speaking' && 'bg-green-500/20',
              )}
              animate={{
                scale: voiceState === 'listening' ? [1, 1.2 + audioLevel * 0.5, 1] : [1, 1.1, 1],
              }}
              transition={{
                duration: voiceState === 'listening' ? 0.3 : 1.5,
                repeat: Infinity,
              }}
              style={{ width: 200, height: 200 }}
            />
            
            {/* Inner circle */}
            <motion.div
              className={cn(
                'relative flex items-center justify-center rounded-full',
                voiceState === 'listening' && 'bg-primary',
                voiceState === 'processing' && 'bg-amber-500',
                voiceState === 'speaking' && 'bg-green-500',
              )}
              style={{ width: 200, height: 200 }}
              animate={{
                scale: voiceState === 'listening' ? 1 + audioLevel * 0.1 : 1,
              }}
            >
              {voiceState === 'listening' && <Mic className="w-16 h-16 text-white" />}
              {voiceState === 'processing' && <Loader2 className="w-16 h-16 text-white animate-spin" />}
              {voiceState === 'speaking' && <Volume2 className="w-16 h-16 text-white" />}
            </motion.div>
          </div>

          {/* Status text */}
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">
              {voiceState === 'listening' && `Listening...`}
              {voiceState === 'processing' && `Sending to ${companionName}...`}
              {voiceState === 'speaking' && `${companionName} is speaking...`}
            </h2>
            
            {displayText && voiceState === 'listening' && (
              <p className="text-lg text-muted-foreground max-w-sm">
                "{displayText}"
              </p>
            )}
            
            {!displayText && voiceState === 'listening' && (
              <p className="text-muted-foreground">
                Speak naturally, I'll send when you pause
              </p>
            )}
          </div>

          {/* End call button */}
          <Button
            variant="destructive"
            size="lg"
            onClick={onEnd}
            className="rounded-full w-16 h-16"
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
          
          <p className="text-sm text-muted-foreground">
            Click to end conversation
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Hook to check if voice conversation is supported
 */
export function useVoiceConversationSupported(): boolean {
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const checkSupport = () => {
      try {
        const hasSpeechRecognition = getSpeechRecognition() !== null;
        const hasMediaDevices = typeof navigator !== 'undefined' && 
          navigator.mediaDevices !== undefined;
        setIsSupported(hasSpeechRecognition && hasMediaDevices);
      } catch {
        setIsSupported(false);
      }
    };
    checkSupport();
  }, []);

  return isSupported;
}
