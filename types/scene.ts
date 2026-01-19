// ============================================================================
// DYNAMIC SCENE GENERATION TYPES
// ============================================================================

/**
 * Scene analysis result from DeepSeek
 */
export interface SceneAnalysis {
  theme: string;
  entities: string[];
  scene_description: string;
  mood?: string;
  time_of_day?: 'morning' | 'day' | 'evening' | 'night';
  weather?: string;
}

/**
 * Generated scene record from database
 */
export interface GeneratedScene {
  id: string;
  companion_id: string;
  conversation_id: string | null;
  user_id: string;
  prompt: string;
  image_url: string;
  theme: string | null;
  entities: string[];
  scene_description: string | null;
  audio_track: string | null;
  animation_type: string | null;
  generation_time_ms: number | null;
  model_used: string;
  created_at: string;
  expires_at: string;
}

/**
 * Scene generation request
 */
export interface SceneGenerationRequest {
  companionId: string;
  conversationId: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  forceRegenerate?: boolean;
}

/**
 * Scene generation response
 */
export interface SceneGenerationResponse {
  success: boolean;
  scene?: GeneratedScene;
  skipped?: boolean;
  reason?: string;
  cooldownRemaining?: number; // seconds until next generation allowed
}

/**
 * Audio track mapping
 */
export interface AudioTrack {
  id: string;
  name: string;
  url: string;
  themes: string[]; // themes this track matches
  loop: boolean;
  volume: number; // 0-1
}

/**
 * Animation overlay config
 */
export interface AnimationOverlay {
  id: string;
  name: string;
  cssClass: string;
  themes: string[];
  intensity: 'subtle' | 'medium' | 'strong';
}

/**
 * Theme to audio/animation mapping
 */
export interface ThemeMapping {
  theme: string;
  keywords: string[];
  audioTrack: string;
  animation: string;
  fallbackColor?: string; // gradient overlay color
}

/**
 * Scene state for UI
 */
export interface SceneState {
  // Current scene
  currentScene: GeneratedScene | null;
  
  // Fallback (time-based) scene
  fallbackSceneUrl: string;
  
  // Loading states
  isGenerating: boolean;
  isAnalyzing: boolean;
  
  // Audio
  audioEnabled: boolean;
  audioTrack: AudioTrack | null;
  audioVolume: number;
  
  // Animation
  animationEnabled: boolean;
  animationOverlay: AnimationOverlay | null;
  
  // Timing
  lastGeneratedAt: Date | null;
  nextGenerationAllowedAt: Date | null;
  
  // Error handling
  error: string | null;
}

/**
 * Scene updater hook options
 */
export interface UseSceneUpdaterOptions {
  companionId: string;
  conversationId: string;
  relationshipType: string;
  enabled?: boolean;
  cooldownMinutes?: number; // default 5
  checkIntervalSeconds?: number; // default 30
}

// ============================================================================
// THEME MAPPINGS
// ============================================================================

export const THEME_AUDIO_MAP: Record<string, string> = {
  // Nature - Water
  'beach': 'ocean-waves.mp3',
  'ocean': 'ocean-waves.mp3',
  'sea': 'ocean-waves.mp3',
  'lake': 'lake-ambience.mp3',
  'river': 'river-stream.mp3',
  'waterfall': 'waterfall.mp3',
  'rain': 'rain-gentle.mp3',
  'storm': 'thunderstorm.mp3',
  
  // Nature - Land
  'forest': 'forest-ambience.mp3',
  'woods': 'forest-ambience.mp3',
  'mountain': 'mountain-wind.mp3',
  'meadow': 'meadow-birds.mp3',
  'garden': 'garden-birds.mp3',
  
  // Weather
  'winter': 'winter-wind.mp3',
  'snow': 'winter-wind.mp3',
  'wind': 'gentle-wind.mp3',
  
  // Indoor - Cozy
  'fireplace': 'crackling-fire.mp3',
  'fire': 'crackling-fire.mp3',
  'cabin': 'crackling-fire.mp3',
  'campfire': 'crackling-fire.mp3',
  
  // Indoor - Social
  'kitchen': 'kitchen-ambience.mp3',
  'cooking': 'kitchen-ambience.mp3',
  'cafe': 'cafe-ambience.mp3',
  'coffee': 'cafe-ambience.mp3',
  'restaurant': 'restaurant-ambience.mp3',
  
  // Urban
  'city': 'city-ambience.mp3',
  'traffic': 'city-traffic.mp3',
  'street': 'city-ambience.mp3',
  
  // Time of Day
  'night': 'night-crickets.mp3',
  'evening': 'evening-ambience.mp3',
  'morning': 'morning-birds.mp3',
  
  // Mood
  'spa': 'spa-music.mp3',
  'meditation': 'meditation-bells.mp3',
  'peaceful': 'peaceful-piano.mp3',
  'romantic': 'romantic-ambience.mp3',
  'intimate': 'romantic-ambience.mp3',
  'cozy': 'cozy-ambience.mp3',
  
  // Default
  'default': 'soft-ambience.mp3',
};

export const THEME_ANIMATION_MAP: Record<string, string> = {
  // Fire effects
  'fireplace': 'flicker',
  'fire': 'flicker',
  'candle': 'flicker',
  'campfire': 'flicker',
  'cabin': 'flicker',
  
  // Water effects
  'rain': 'rain-drops',
  'ocean': 'wave-shimmer',
  'beach': 'wave-shimmer',
  'water': 'wave-shimmer',
  'lake': 'wave-shimmer',
  'pond': 'ripple',
  'river': 'wave-shimmer',
  'pool': 'ripple',
  'sea': 'wave-shimmer',
  
  // Weather
  'snow': 'snow-fall',
  'winter': 'snow-fall',
  'storm': 'lightning-flash',
  'cloudy': 'sway',
  
  // Nature
  'forest': 'leaf-sway',
  'garden': 'leaf-sway',
  'wind': 'sway',
  'mountain': 'soft-glow',
  'meadow': 'leaf-sway',
  'park': 'leaf-sway',
  'trees': 'leaf-sway',
  
  // Ambient
  'night': 'twinkle',
  'stars': 'twinkle',
  'sunset': 'soft-glow',
  'sunrise': 'soft-glow',
  'romantic': 'soft-glow',
  'cozy': 'warm-pulse',
  'intimate': 'warm-pulse',
  
  // Indoor
  'bedroom': 'warm-pulse',
  'living': 'warm-pulse',
  'kitchen': 'flicker',
  'restaurant': 'flicker',
  'cafe': 'warm-pulse',
  
  // Default
  'default': 'subtle-breathe',
};

/**
 * Get audio track for theme
 */
export function getAudioForTheme(theme: string, entities: string[] = []): string {
  // Check theme first
  const lowerTheme = theme.toLowerCase();
  for (const [key, audio] of Object.entries(THEME_AUDIO_MAP)) {
    if (lowerTheme.includes(key)) {
      return audio;
    }
  }
  
  // Check entities
  for (const entity of entities) {
    const lowerEntity = entity.toLowerCase();
    for (const [key, audio] of Object.entries(THEME_AUDIO_MAP)) {
      if (lowerEntity.includes(key)) {
        return audio;
      }
    }
  }
  
  return THEME_AUDIO_MAP.default;
}

/**
 * Get animation for theme
 */
export function getAnimationForTheme(theme: string, entities: string[] = []): string {
  // Check theme first
  const lowerTheme = theme.toLowerCase();
  for (const [key, anim] of Object.entries(THEME_ANIMATION_MAP)) {
    if (lowerTheme.includes(key)) {
      return anim;
    }
  }
  
  // Check entities
  for (const entity of entities) {
    const lowerEntity = entity.toLowerCase();
    for (const [key, anim] of Object.entries(THEME_ANIMATION_MAP)) {
      if (lowerEntity.includes(key)) {
        return anim;
      }
    }
  }
  
  return THEME_ANIMATION_MAP.default;
}
