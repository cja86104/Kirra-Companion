'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { 
  GeneratedScene, 
  SceneState, 
  UseSceneUpdaterOptions,
  SceneGenerationResponse 
} from '@/types/scene';

// ============================================================================
// CONSTANTS
// ============================================================================

const LOCAL_STORAGE_KEY_PREFIX = 'kirra_scene_';
const DEFAULT_COOLDOWN_MINUTES = 20; // Match server-side cooldown
const DEFAULT_CHECK_INTERVAL_SECONDS = 60; // Check every minute
const MIN_MESSAGES_FOR_GENERATION = 4; // Need at least 4 messages to analyze

// ============================================================================
// FALLBACK SCENE URL GENERATOR
// ============================================================================

function getTimeSlot(): string {
  const hour = new Date().getHours();
  const slot = Math.floor(hour / 2) * 2;
  return slot.toString().padStart(2, '0');
}

function getFallbackSceneUrl(relationshipType: string): string {
  const validTypes = ['romantic', 'friend', 'mentor', 'family', 'custom'];
  const type = validTypes.includes(relationshipType) ? relationshipType : 'custom';
  
  // Check if we have 12-slot images (romantic) or 4-slot images (others)
  if (type === 'romantic') {
    const timeSlot = getTimeSlot();
    return `/scenes/${type}-${timeSlot}.jpg`;
  }
  
  // Fallback to 4-slot system for other types
  const hour = new Date().getHours();
  let timeOfDay: string;
  if (hour >= 5 && hour < 11) timeOfDay = 'morning';
  else if (hour >= 11 && hour < 17) timeOfDay = 'day';
  else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
  else timeOfDay = 'night';
  
  return `/scenes/${type}-${timeOfDay}.jpg`;
}

// ============================================================================
// HOOK
// ============================================================================

export function useSceneUpdater(
  options: UseSceneUpdaterOptions,
  messages: Array<{ role: string; content: string }>
): SceneState & {
  triggerGeneration: () => Promise<void>;
  toggleAudio: () => void;
  toggleAnimation: () => void;
  setAudioVolume: (volume: number) => void;
} {
  const {
    companionId,
    conversationId,
    relationshipType,
    enabled = true,
    cooldownMinutes = DEFAULT_COOLDOWN_MINUTES,
    checkIntervalSeconds = DEFAULT_CHECK_INTERVAL_SECONDS,
  } = options;

  // State
  const [currentScene, setCurrentScene] = useState<GeneratedScene | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [audioVolume, setAudioVolumeState] = useState(0.3);
  const [animationEnabled, setAnimationEnabled] = useState(true);
  const [lastGeneratedAt, setLastGeneratedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messageCountRef = useRef(messages.length);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Derived state
  const fallbackSceneUrl = getFallbackSceneUrl(relationshipType);
  const cooldownMs = cooldownMinutes * 60 * 1000;
  
  const nextGenerationAllowedAt = lastGeneratedAt 
    ? new Date(lastGeneratedAt.getTime() + cooldownMs)
    : null;

  // ============================================================================
  // LOCAL STORAGE
  // ============================================================================

  const storageKey = `${LOCAL_STORAGE_KEY_PREFIX}${companionId}`;

  // Load last generation time from storage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.lastGeneratedAt) {
          setLastGeneratedAt(new Date(data.lastGeneratedAt));
        }
        if (data.currentScene) {
          setCurrentScene(data.currentScene);
        }
      } catch {
        // Invalid stored data, ignore
      }
    }
  }, [storageKey]);

  // Save to storage when scene changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    localStorage.setItem(storageKey, JSON.stringify({
      lastGeneratedAt: lastGeneratedAt?.toISOString(),
      currentScene,
    }));
  }, [storageKey, lastGeneratedAt, currentScene]);

  // ============================================================================
  // COOLDOWN CHECK
  // ============================================================================

  const canGenerate = useCallback((): boolean => {
    if (!lastGeneratedAt) return true;
    
    const elapsed = Date.now() - lastGeneratedAt.getTime();
    return elapsed >= cooldownMs;
  }, [lastGeneratedAt, cooldownMs]);

  // ============================================================================
  // GENERATION TRIGGER
  // ============================================================================

  const triggerGeneration = useCallback(async (force = false) => {
    // Checks
    if (!enabled) return;
    if (!force && !canGenerate()) return;
    if (isGenerating) return;
    if (messages.length < MIN_MESSAGES_FOR_GENERATION) return;

    setIsGenerating(true);
    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch(`/api/companion/${companionId}/generate-scene`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companionId,
          conversationId,
          relationshipType, // Pass relationship type for appropriate scene generation
          messages: messages.slice(-20), // Last 20 messages
          forceRegenerate: force,
        }),
      });

      const data: SceneGenerationResponse = await response.json();

      if (data.success && data.scene) {
        setCurrentScene(data.scene);
        setLastGeneratedAt(new Date());
        console.log('[Scene] New scene generated:', data.scene.theme);
      } else if (data.skipped) {
        console.log('[Scene] Generation skipped:', data.reason);
      } else {
        throw new Error(data.reason || 'Generation failed');
      }

    } catch (err) {
      console.error('[Scene] Generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate scene');
    } finally {
      setIsGenerating(false);
      setIsAnalyzing(false);
    }
  }, [enabled, canGenerate, isGenerating, messages, companionId, conversationId, relationshipType]);

  // ============================================================================
  // PERIODIC CHECK
  // ============================================================================

  useEffect(() => {
    if (!enabled) return;

    // Check function
    const checkAndGenerate = () => {
      // Only generate if:
      // 1. Cooldown has passed
      // 2. There are new messages since last check
      // 3. We have enough messages
      const hasNewMessages = messages.length > messageCountRef.current;
      messageCountRef.current = messages.length;

      if (canGenerate() && hasNewMessages && messages.length >= MIN_MESSAGES_FOR_GENERATION) {
        triggerGeneration();
      }
    };

    // Set up interval
    checkIntervalRef.current = setInterval(checkAndGenerate, checkIntervalSeconds * 1000);

    // Initial check
    checkAndGenerate();

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [enabled, canGenerate, messages.length, checkIntervalSeconds, triggerGeneration]);

  // ============================================================================
  // AUDIO CONTROL
  // ============================================================================

  useEffect(() => {
    if (!currentScene?.audio_track || !audioEnabled) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      return;
    }

    // Create audio element
    const audioUrl = `/sounds/${currentScene.audio_track}`;
    const audio = new Audio(audioUrl);
    audio.loop = true;
    audio.volume = audioVolume;
    
    audioRef.current = audio;
    audio.play().catch(err => {
      console.warn('[Scene] Audio autoplay blocked:', err);
    });

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [currentScene?.audio_track, audioEnabled, audioVolume]);

  // ============================================================================
  // TOGGLE FUNCTIONS
  // ============================================================================

  const toggleAudio = useCallback(() => {
    setAudioEnabled(prev => !prev);
  }, []);

  const toggleAnimation = useCallback(() => {
    setAnimationEnabled(prev => !prev);
  }, []);

  const setVolume = useCallback((volume: number) => {
    setAudioVolumeState(Math.max(0, Math.min(1, volume)));
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, []);

  // ============================================================================
  // RETURN STATE
  // ============================================================================

  return {
    // Scene state
    currentScene,
    fallbackSceneUrl,
    isGenerating,
    isAnalyzing,
    
    // Audio state
    audioEnabled,
    audioTrack: currentScene?.audio_track ? {
      id: currentScene.audio_track,
      name: currentScene.audio_track.replace('.mp3', '').replace(/-/g, ' '),
      url: `/sounds/${currentScene.audio_track}`,
      themes: [],
      loop: true,
      volume: audioVolume,
    } : null,
    audioVolume,
    
    // Animation state
    animationEnabled,
    animationOverlay: currentScene?.animation_type ? {
      id: currentScene.animation_type,
      name: currentScene.animation_type.replace(/-/g, ' '),
      cssClass: `animation-${currentScene.animation_type}`,
      themes: [],
      intensity: 'subtle',
    } : null,
    
    // Timing
    lastGeneratedAt,
    nextGenerationAllowedAt,
    
    // Error
    error,
    
    // Actions
    triggerGeneration: () => triggerGeneration(true),
    toggleAudio,
    toggleAnimation,
    setAudioVolume: setVolume,
  };
}

// ============================================================================
// EXPORT HELPERS
// ============================================================================

export { getTimeSlot, getFallbackSceneUrl };
