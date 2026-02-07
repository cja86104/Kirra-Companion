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
 * Voice option from API
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
 * Cartesia TTS voices - selected for AI companion personalities
 * Provider: Cartesia Sonic 3 - 40ms time-to-first-audio
 */
const CARTESIA_VOICES: VoiceOption[] = [
  {
    voice_id: 'tessa',
    name: 'Tessa',
    description: 'Warm and engaging',
    gender: 'female',
    personality: 'Friendly, supportive, conversational',
    available: true,
    preview_text: "Hi there! I'm Tessa. I love having warm, meaningful conversations and being here for you.",
  },
  {
    voice_id: 'maya',
    name: 'Maya',
    description: 'Soft and soothing',
    gender: 'female',
    personality: 'Gentle, calming, empathetic',
    available: true,
    preview_text: "Hello. I'm Maya. I have a gentle presence and I'm here to listen whenever you need me.",
  },
  {
    voice_id: 'katie',
    name: 'Katie',
    description: 'Clear and balanced',
    gender: 'female',
    personality: 'Professional, articulate, versatile',
    available: true,
    preview_text: "Hello! I'm Katie. I have a clear, balanced voice that works well for any conversation.",
  },
  {
    voice_id: 'leo',
    name: 'Leo',
    description: 'Deep and reassuring',
    gender: 'male',
    personality: 'Calm, confident, grounding',
    available: true,
    preview_text: "Greetings. I'm Leo. I bring a calm, steady presence to our conversations.",
  },
  {
    voice_id: 'kyle',
    name: 'Kyle',
    description: 'Friendly and energetic',
    gender: 'male',
    personality: 'Upbeat, enthusiastic, engaging',
    available: true,
    preview_text: "Hey! I'm Kyle! I'm always excited to chat and bring some positive energy to your day!",
  },
  {
    voice_id: 'kiefer',
    name: 'Kiefer',
    description: 'Expressive and thoughtful',
    gender: 'male',
    personality: 'Articulate, dynamic, storytelling',
    available: true,
    preview_text: "Hello! I'm Kiefer. I love expressing ideas with nuance and bringing depth to our talks.",
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
  const [speed, setSpeed] = useState(selectedVoice?.speakingRate ?? 1.0);
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
    // Stop any currently playing audio
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
      provider: 'cartesia',
      voiceId,
      model: 'sonic-3',
      speed,
    };

    onVoiceSelect(config);
    toast.success(`Selected ${CARTESIA_VOICES.find(v => v.voice_id === voiceId)?.name} voice`);
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

  // Get gender icon/color
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

  const selectedVoiceData = CARTESIA_VOICES.find(v => v.voice_id === selectedVoice?.voiceId);

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
        {CARTESIA_VOICES.map((voice) => {
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
          Voice uses Cartesia Sonic 3. Ultra-low latency for natural conversations.
        </span>
      </div>
    </div>
  );
}

/**
 * Get voice name by ID
 */
export function getVoiceName(voiceId: string): string {
  const voice = CARTESIA_VOICES.find(v => v.voice_id === voiceId);
  return voice?.name || 'Unknown';
}

/**
 * Get voice description by ID
 */
export function getVoiceDescription(voiceId: string): string {
  const voice = CARTESIA_VOICES.find(v => v.voice_id === voiceId);
  return voice?.description || '';
}

/**
 * Validate voice config
 */
export function isValidVoiceConfig(config: unknown): config is VoiceConfig {
  if (typeof config !== 'object' || config === null) return false;
  
  const c = config as Record<string, unknown>;
  
  // Must have a valid provider (cartesia, openai legacy, or elevenlabs legacy)
  if (c.provider !== 'cartesia' && c.provider !== 'openai' && c.provider !== 'elevenlabs') return false;
  
  // Must have a voice ID
  if (typeof c.voiceId !== 'string' || c.voiceId.length === 0) return false;
  
  // For Cartesia, validate voice ID exists
  if (c.provider === 'cartesia') {
    if (!CARTESIA_VOICES.find(v => v.voice_id === c.voiceId)) return false;
  }
  
  // Validate speed if present (Cartesia uses 0.5-2.0 or string values)
  if (c.speed !== undefined) {
    if (typeof c.speed === 'number') {
      if (c.speed < 0.5 || c.speed > 2.0) return false;
    } else if (typeof c.speed === 'string') {
      if (!['slowest', 'slow', 'normal', 'fast', 'fastest'].includes(c.speed)) return false;
    }
  }
  
  return true;
}
