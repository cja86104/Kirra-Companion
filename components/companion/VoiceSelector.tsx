'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Volume2, VolumeX, Play, Pause, Loader2, Check, Crown } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { VoiceConfig } from '@/types/database';

/**
 * Voice option interface
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

/**
 * OpenAI TTS voices
 * Provider: OpenAI TTS with sentence-level optimization
 */
const OPENAI_VOICES: VoiceOption[] = [
  {
    voice_id: 'nova',
    name: 'Nova',
    description: 'Friendly and upbeat',
    gender: 'female',
    personality: 'Bright, cheerful, energetic',
    available: true,
    preview_text: "Hi! I'm Nova! I'm super excited to chat with you - I've got lots of energy!",
  },
  {
    voice_id: 'shimmer',
    name: 'Shimmer',
    description: 'Soft and soothing',
    gender: 'female',
    personality: 'Gentle, calming, soothing',
    available: true,
    preview_text: "Hello there. I'm Shimmer. I have a soft, gentle voice that's perfect for relaxing conversations.",
  },
  {
    voice_id: 'alloy',
    name: 'Alloy',
    description: 'Neutral and balanced',
    gender: 'neutral',
    personality: 'Professional, clear, versatile',
    available: true,
    preview_text: "Hi there! I'm Alloy. I have a balanced, neutral voice that works well for any situation.",
  },
  {
    voice_id: 'onyx',
    name: 'Onyx',
    description: 'Deep and authoritative',
    gender: 'male',
    personality: 'Deep, confident, authoritative',
    available: true,
    preview_text: "Greetings. I'm Onyx. I have a deep, resonant voice that conveys confidence and calm.",
  },
  {
    voice_id: 'echo',
    name: 'Echo',
    description: 'Warm and engaging',
    gender: 'male',
    personality: 'Warm, friendly, conversational',
    available: true,
    preview_text: "Hey! I'm Echo. I've got a warm, friendly tone that's great for casual conversations.",
  },
  {
    voice_id: 'fable',
    name: 'Fable',
    description: 'Expressive and dynamic',
    gender: 'neutral',
    personality: 'Expressive, storytelling, dynamic',
    available: true,
    preview_text: "Hello! I'm Fable. I love bringing stories to life with my expressive voice!",
  },
];

interface VoiceSelectorProps {
  selectedVoice: VoiceConfig | null;
  onVoiceSelect: (config: VoiceConfig | null) => void;
  subscriptionTier: string;
  className?: string;
}

export function VoiceSelector({
  selectedVoice,
  onVoiceSelect,
  subscriptionTier,
  className,
}: VoiceSelectorProps) {
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [loadingVoiceId, setLoadingVoiceId] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [speed, setSpeed] = useState(selectedVoice?.speed ?? 1.0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Check if user has voice access
  const hasVoiceAccess = ['trial', 'basic', 'pro', 'ultimate'].includes(subscriptionTier);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Stop any playing audio
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingVoiceId(null);
  }, []);

  // Play voice preview
  const playPreview = useCallback(async (voiceId: string) => {
    stopAudio();
    setLoadingVoiceId(voiceId);

    try {
      const response = await fetch(`/api/voices/preview?voiceId=${voiceId}`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to load preview' }));
        throw new Error(error.error || 'Failed to load preview');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(url);
        setPlayingVoiceId(null);
        audioRef.current = null;
      };

      audio.onerror = () => {
        URL.revokeObjectURL(url);
        setPlayingVoiceId(null);
        audioRef.current = null;
        toast.error('Failed to play audio');
      };

      await audio.play();
      setPlayingVoiceId(voiceId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to play preview';
      toast.error(message);
    } finally {
      setLoadingVoiceId(null);
    }
  }, [stopAudio]);

  // Toggle play/pause
  const togglePlay = useCallback((voiceId: string) => {
    if (playingVoiceId === voiceId) {
      stopAudio();
    } else {
      playPreview(voiceId);
    }
  }, [playingVoiceId, stopAudio, playPreview]);

  // Select a voice
  const selectVoice = useCallback((voiceId: string) => {
    if (!hasVoiceAccess) {
      toast.error('Upgrade to a paid plan to select a voice');
      return;
    }

    const config: VoiceConfig = {
      provider: 'openai',
      voiceId,
      model: 'tts-1',
      speed,
    };

    onVoiceSelect(config);
    toast.success(`Selected ${OPENAI_VOICES.find(v => v.voice_id === voiceId)?.name} voice`);
  }, [hasVoiceAccess, speed, onVoiceSelect]);

  // Clear voice selection
  const clearVoice = useCallback(() => {
    onVoiceSelect(null);
    stopAudio();
  }, [onVoiceSelect, stopAudio]);

  // Update speed in config
  const handleSpeedChange = useCallback((value: number[]) => {
    const newSpeed = value[0];
    setSpeed(newSpeed);

    if (selectedVoice) {
      onVoiceSelect({
        ...selectedVoice,
        speed: newSpeed,
      });
    }
  }, [selectedVoice, onVoiceSelect]);

  // Get gender styles
  const getGenderStyles = (gender: string) => {
    switch (gender) {
      case 'female':
        return 'border-pink-500/50 hover:border-pink-500';
      case 'male':
        return 'border-blue-500/50 hover:border-blue-500';
      default:
        return 'border-purple-500/50 hover:border-purple-500';
    }
  };

  // If user doesn't have voice access, show upgrade prompt
  if (!hasVoiceAccess) {
    return (
      <div className={cn('space-y-4', className)}>
        <Label className="text-base font-medium">Voice (Optional)</Label>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Crown className="h-6 w-6 text-amber-500" />
            </div>
            <h4 className="font-semibold">Unlock Voice Features</h4>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Give your companion a unique voice! Upgrade to any paid plan 
              to unlock text-to-speech capabilities.
            </p>
            <Button variant="outline" asChild className="mt-4">
              <a href="/settings/billing">
                <Crown className="w-4 h-4 mr-2" />
                Upgrade Plan
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedVoiceData = OPENAI_VOICES.find(v => v.voice_id === selectedVoice?.voiceId);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Voice (Optional)</Label>
        {selectedVoice && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearVoice}
            className="text-muted-foreground hover:text-foreground"
          >
            <VolumeX className="w-4 h-4 mr-1" />
            Remove Voice
          </Button>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Choose a voice for your companion. You can preview each voice before selecting.
      </p>

      {/* Voice Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {OPENAI_VOICES.map((voice) => {
          const isSelected = selectedVoice?.voiceId === voice.voice_id;
          const isPlaying = playingVoiceId === voice.voice_id;
          const isLoading = loadingVoiceId === voice.voice_id;

          return (
            <Card
              key={voice.voice_id}
              className={cn(
                'relative cursor-pointer transition-all duration-200 border-2',
                getGenderStyles(voice.gender),
                isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background border-primary'
              )}
              onClick={() => selectVoice(voice.voice_id)}
            >
              <CardContent className="p-4">
                {/* Selected indicator */}
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  </div>
                )}

                {/* Voice info */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{voice.name}</h4>
                    <Badge variant="outline" className="text-2xs capitalize">
                      {voice.gender}
                    </Badge>
                  </div>
                  
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {voice.description}
                  </p>
                  
                  <p className="text-2xs text-muted-foreground italic">
                    {voice.personality}
                  </p>
                </div>

                {/* Play button */}
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlay(voice.voice_id);
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : isPlaying ? (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Preview
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Selected voice info */}
      {selectedVoiceData && (
        <Card className="bg-muted/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              Selected: {selectedVoiceData.name}
            </CardTitle>
            <CardDescription className="text-xs">
              {selectedVoiceData.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {/* Advanced settings toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="mb-2 -ml-2"
            >
              {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
            </Button>

            {showAdvanced && (
              <div className="space-y-4 pt-2 border-t">
                {/* Speed control */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Speaking Speed</Label>
                    <span className="text-sm text-muted-foreground">
                      {speed.toFixed(1)}x
                    </span>
                  </div>
                  <Slider
                    value={[speed]}
                    onValueChange={handleSpeedChange}
                    min={0.5}
                    max={2.0}
                    step={0.1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Slower (0.5x)</span>
                    <span>Normal (1.0x)</span>
                    <span>Faster (2.0x)</span>
                  </div>
                </div>

                {/* Speed presets */}
                <div className="flex gap-2">
                  {[0.75, 1.0, 1.25, 1.5].map((preset) => (
                    <Button
                      key={preset}
                      variant={speed === preset ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSpeedChange([preset])}
                    >
                      {preset}x
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Usage info */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Volume2 className="w-3 h-3" />
        <span>
          Voice uses OpenAI TTS with sentence-level playback for faster responses.
        </span>
      </div>
    </div>
  );
}

/**
 * Get voice name by ID
 */
export function getVoiceName(voiceId: string): string {
  const voice = OPENAI_VOICES.find(v => v.voice_id === voiceId);
  return voice?.name || 'Unknown';
}

/**
 * Get voice description by ID
 */
export function getVoiceDescription(voiceId: string): string {
  const voice = OPENAI_VOICES.find(v => v.voice_id === voiceId);
  return voice?.description || '';
}

/**
 * Validate voice config
 */
export function isValidVoiceConfig(config: unknown): config is VoiceConfig {
  if (typeof config !== 'object' || config === null) return false;
  
  const c = config as Record<string, unknown>;
  
  // Must have a valid provider
  if (c.provider !== 'openai' && c.provider !== 'cartesia' && c.provider !== 'elevenlabs') return false;
  
  // Must have a voice ID
  if (typeof c.voiceId !== 'string' || c.voiceId.length === 0) return false;
  
  // For OpenAI, validate voice ID exists
  if (c.provider === 'openai') {
    if (!OPENAI_VOICES.find(v => v.voice_id === c.voiceId)) return false;
  }
  
  // Validate speed if present (OpenAI uses 0.25-4.0)
  if (c.speed !== undefined) {
    if (typeof c.speed !== 'number' || c.speed < 0.25 || c.speed > 4.0) return false;
  }
  
  return true;
}
