'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Loader2, Square, X } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';

interface VoiceMessageRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  onCancel: () => void;
  maxDuration?: number; // in seconds
  disabled?: boolean;
}

export function VoiceMessageRecorder({
  onRecordingComplete,
  onCancel,
  maxDuration = 60,
  disabled = false,
}: VoiceMessageRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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
    mediaRecorderRef.current = null;
    streamRef.current = null;
    analyserRef.current = null;
    audioChunksRef.current = [];
    setDuration(0);
    setAudioLevel(0);
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const startRecording = async () => {
    try {
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

      // Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        setIsProcessing(true);
        
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const finalDuration = duration;
        
        // Convert to mp3 would happen server-side in production
        // For now, we'll use webm directly
        onRecordingComplete(audioBlob, finalDuration);
        
        cleanup();
        setIsRecording(false);
        setIsProcessing(false);
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setDuration(0);

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
        toast.error('Microphone access denied. Please allow microphone access to record voice messages.');
      } else {
        toast.error('Failed to start recording. Please check your microphone.');
      }
    }
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, [isRecording]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    cleanup();
    setIsRecording(false);
    onCancel();
  }, [isRecording, cleanup, onCancel]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isProcessing) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Processing audio...</span>
      </div>
    );
  }

  if (isRecording) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
        {/* Recording indicator */}
        <div className="relative flex items-center justify-center">
          <div 
            className="absolute w-10 h-10 rounded-full bg-red-500/30 animate-pulse"
            style={{ transform: `scale(${1 + audioLevel * 0.5})` }}
          />
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
        </div>

        {/* Duration */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-lg font-medium text-red-600 dark:text-red-400">
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
                  audioLevel * 20 > i ? 'bg-red-500' : 'bg-muted'
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
          >
            <X className="w-5 h-5" />
          </Button>
          <Button
            variant="default"
            size="icon"
            onClick={stopRecording}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            <Square className="w-4 h-4" />
          </Button>
        </div>
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
        const hasMediaDevices = typeof navigator !== 'undefined' && 
          navigator.mediaDevices !== undefined &&
          typeof navigator.mediaDevices.getUserMedia === 'function';
        const hasMediaRecorder = typeof window !== 'undefined' && 
          typeof window.MediaRecorder !== 'undefined';
        setIsSupported(hasMediaDevices && hasMediaRecorder);
      } catch {
        setIsSupported(false);
      }
    };
    checkSupport();
  }, []);

  return isSupported;
}
