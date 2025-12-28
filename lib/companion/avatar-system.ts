/**
 * KIRRA COMPANION - AVATAR SYSTEM
 * 
 * Full 3D avatar configuration with Ready Player Me integration,
 * animations, expressions, and visual state management.
 */

// ============================================================
// AVATAR APPEARANCE
// ============================================================

export interface AvatarAppearance {
  // Base model
  modelUrl: string | null;           // Ready Player Me URL or custom
  modelType: 'rpm' | 'vrm' | 'custom'; // Model format
  
  // Physical traits
  bodyType: 'slim' | 'average' | 'athletic' | 'curvy' | 'muscular';
  height: 'short' | 'average' | 'tall';
  skinTone: string;                  // Hex color
  
  // Face
  faceShape: 'oval' | 'round' | 'square' | 'heart' | 'long';
  eyeColor: string;                  // Hex color
  eyeShape: 'round' | 'almond' | 'hooded' | 'monolid' | 'upturned';
  noseType: 'small' | 'button' | 'straight' | 'wide' | 'pointed';
  lipShape: 'thin' | 'full' | 'bow' | 'wide';
  
  // Hair
  hairStyle: string;                 // Style identifier
  hairColor: string;                 // Hex color
  hairLength: 'bald' | 'buzz' | 'short' | 'medium' | 'long' | 'very_long';
  
  // Extras
  facialHair?: string;               // For masculine presenting
  freckles: boolean;
  glasses?: string;                  // Glasses style if any
  accessories: string[];             // Earrings, piercings, etc.
}

export interface AvatarOutfit {
  id: string;
  name: string;
  top: string;
  bottom: string;
  shoes: string;
  accessories: string[];
  occasion: 'casual' | 'formal' | 'sleepwear' | 'workout' | 'swimwear';
}

// ============================================================
// ANIMATIONS & EXPRESSIONS
// ============================================================

export type EmotionalExpression = 
  | 'neutral'
  | 'happy'
  | 'sad'
  | 'excited'
  | 'tired'
  | 'thinking'
  | 'laughing'
  | 'crying'
  | 'angry'
  | 'surprised'
  | 'loving'
  | 'shy'
  | 'playful'
  | 'worried'
  | 'peaceful';

export type IdleAnimation =
  | 'standing'
  | 'sitting'
  | 'sitting_relaxed'
  | 'lying_down'
  | 'leaning'
  | 'fidgeting'
  | 'stretching'
  | 'yawning'
  | 'looking_around'
  | 'checking_phone'
  | 'playing_with_hair';

export type ActivityAnimation =
  | 'typing'
  | 'reading'
  | 'cooking'
  | 'eating'
  | 'drinking'
  | 'exercising'
  | 'dancing'
  | 'painting'
  | 'playing_guitar'
  | 'gaming'
  | 'meditating'
  | 'sleeping'
  | 'waving'
  | 'blowing_kiss'
  | 'hugging'
  | 'celebrating';

export interface AnimationState {
  currentIdle: IdleAnimation;
  currentActivity: ActivityAnimation | null;
  expression: EmotionalExpression;
  expressionIntensity: number;       // 0-1
  isTransitioning: boolean;
  blinkRate: number;                 // Blinks per minute
  breathingRate: number;             // Breaths per minute (affects subtle movement)
  lookAtTarget: 'user' | 'random' | 'activity' | null;
}

// ============================================================
// ENVIRONMENT & ROOM
// ============================================================

export type RoomType = 
  | 'bedroom'
  | 'living_room'
  | 'kitchen'
  | 'bathroom'
  | 'office'
  | 'balcony'
  | 'garden';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export interface RoomState {
  currentRoom: RoomType;
  timeOfDay: TimeOfDay;
  lighting: 'bright' | 'normal' | 'dim' | 'dark';
  weather?: 'sunny' | 'cloudy' | 'rainy' | 'snowy';  // Visible through windows
  ambiance: 'peaceful' | 'cozy' | 'energetic' | 'romantic';
  
  // Room customization (unlockable)
  furniture: string[];
  decorations: string[];
  colorScheme: string;
}

// ============================================================
// VISUAL STATE (Combined)
// ============================================================

export interface CompanionVisualState {
  // Avatar
  appearance: AvatarAppearance;
  currentOutfit: AvatarOutfit;
  
  // Animation
  animation: AnimationState;
  
  // Environment
  room: RoomState;
  
  // Position in room
  position: {
    x: number;
    y: number;
    z: number;
  };
  rotation: number;                  // Y rotation in degrees
  
  // Interaction state
  isLookingAtCamera: boolean;
  lastGestureTime: string;
  
  // Visual effects
  glowEffect: boolean;               // For special moments
  particleEffect: 'none' | 'hearts' | 'sparkles' | 'flowers' | 'music_notes';
}

// ============================================================
// DEFAULT VALUES
// ============================================================

export const DEFAULT_APPEARANCE: AvatarAppearance = {
  modelUrl: null,
  modelType: 'rpm',
  bodyType: 'average',
  height: 'average',
  skinTone: '#E8BEAC',
  faceShape: 'oval',
  eyeColor: '#634E34',
  eyeShape: 'almond',
  noseType: 'button',
  lipShape: 'full',
  hairStyle: 'long_wavy',
  hairColor: '#3D2314',
  hairLength: 'long',
  freckles: false,
  accessories: [],
};

export const DEFAULT_ANIMATION_STATE: AnimationState = {
  currentIdle: 'standing',
  currentActivity: null,
  expression: 'neutral',
  expressionIntensity: 0.5,
  isTransitioning: false,
  blinkRate: 15,
  breathingRate: 12,
  lookAtTarget: 'user',
};

export const DEFAULT_ROOM_STATE: RoomState = {
  currentRoom: 'living_room',
  timeOfDay: 'afternoon',
  lighting: 'normal',
  ambiance: 'cozy',
  furniture: ['sofa', 'coffee_table', 'bookshelf', 'lamp'],
  decorations: ['plant', 'picture_frame', 'rug'],
  colorScheme: 'warm',
};

// ============================================================
// ANIMATION MAPPINGS
// ============================================================

// Map activities to animations
export const ACTIVITY_TO_ANIMATION: Record<string, ActivityAnimation> = {
  reading: 'reading',
  cooking: 'cooking',
  eating: 'eating',
  exercise: 'exercising',
  gaming: 'gaming',
  painting: 'painting',
  meditation: 'meditating',
  sleep: 'sleeping',
  nap: 'sleeping',
  music: 'dancing',
  journaling: 'typing',
};

// Map moods to expressions
export const MOOD_TO_EXPRESSION: Record<string, EmotionalExpression> = {
  ecstatic: 'excited',
  happy: 'happy',
  neutral: 'neutral',
  unhappy: 'sad',
  miserable: 'crying',
};

// Map needs urgency to idle behaviors
export function getIdleFromNeeds(urgentNeed: string, urgency: number): IdleAnimation {
  if (urgency < 0.3) return 'standing';
  
  switch (urgentNeed) {
    case 'energy':
      return urgency > 0.7 ? 'yawning' : 'stretching';
    case 'social':
      return 'looking_around';
    case 'fun':
      return 'fidgeting';
    case 'comfort':
      return 'sitting_relaxed';
    default:
      return 'standing';
  }
}

// ============================================================
// EXPRESSION TRIGGERS
// ============================================================

// Keywords in conversation that trigger expressions
export const EXPRESSION_TRIGGERS: Record<string, EmotionalExpression> = {
  'love you': 'loving',
  'miss you': 'loving',
  'thank you': 'happy',
  'thanks': 'happy',
  'funny': 'laughing',
  'lol': 'laughing',
  'haha': 'laughing',
  'sorry': 'sad',
  'sad': 'worried',
  'tired': 'tired',
  'exciting': 'excited',
  'amazing': 'excited',
  'thinking': 'thinking',
  'hmm': 'thinking',
  'wow': 'surprised',
  'really?': 'surprised',
  'cute': 'shy',
  'beautiful': 'shy',
  'angry': 'worried',
  'upset': 'worried',
};

/**
 * Detect expression from message content
 */
export function detectExpressionFromMessage(message: string): EmotionalExpression | null {
  const lowerMessage = message.toLowerCase();
  
  for (const [trigger, expression] of Object.entries(EXPRESSION_TRIGGERS)) {
    if (lowerMessage.includes(trigger)) {
      return expression;
    }
  }
  
  return null;
}

// ============================================================
// ROOM TRANSITIONS
// ============================================================

// What room for what activity
export const ACTIVITY_TO_ROOM: Record<string, RoomType> = {
  sleep: 'bedroom',
  nap: 'bedroom',
  cooking: 'kitchen',
  eating: 'kitchen',
  exercise: 'living_room',
  reading: 'living_room',
  gaming: 'living_room',
  meditation: 'bedroom',
  painting: 'living_room',
  journaling: 'office',
};

/**
 * Get appropriate room for current time
 */
export function getRoomForTime(hour: number): RoomType {
  if (hour >= 6 && hour < 9) return 'kitchen';        // Morning routine
  if (hour >= 9 && hour < 12) return 'living_room';   // Morning activities
  if (hour >= 12 && hour < 14) return 'kitchen';      // Lunch
  if (hour >= 14 && hour < 18) return 'living_room';  // Afternoon
  if (hour >= 18 && hour < 20) return 'kitchen';      // Dinner
  if (hour >= 20 && hour < 23) return 'living_room';  // Evening relaxation
  return 'bedroom';                                    // Night/sleep
}

/**
 * Get time of day from hour
 */
export function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

/**
 * Get lighting from time
 */
export function getLightingForTime(hour: number): RoomState['lighting'] {
  if (hour >= 10 && hour < 16) return 'bright';
  if (hour >= 7 && hour < 19) return 'normal';
  if (hour >= 19 && hour < 22) return 'dim';
  return 'dark';
}
