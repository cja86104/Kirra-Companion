/**
 * NICE AVATAR TYPES
 * 
 * Type definitions for react-nice-avatar configuration.
 * Based on: https://github.com/dapi-labs/react-nice-avatar
 */

// ============================================================================
// AVATAR CONFIG INTERFACE
// ============================================================================

export interface NiceAvatarConfig {
  sex: 'man' | 'woman';
  faceColor: string;
  earSize: 'small' | 'big';
  hairColor: string;
  hairStyle: 'normal' | 'thick' | 'mohawk' | 'womanLong' | 'womanShort';
  hairColorRandom?: boolean;
  hatColor?: string;
  hatStyle: 'none' | 'beanie' | 'turban';
  eyeStyle: 'circle' | 'oval' | 'smile';
  glassesStyle: 'none' | 'round' | 'square';
  noseStyle: 'short' | 'long' | 'round';
  mouthStyle: 'laugh' | 'smile' | 'peace';
  shirtStyle: 'hoody' | 'short' | 'polo';
  shirtColor: string;
  bgColor: string;
  isGradient?: boolean;
}

// ============================================================================
// OPTIONS FOR UI
// ============================================================================

export const SEX_OPTIONS: { value: NiceAvatarConfig['sex']; label: string }[] = [
  { value: 'man', label: 'Masculine' },
  { value: 'woman', label: 'Feminine' },
];

export const EAR_SIZE_OPTIONS: { value: NiceAvatarConfig['earSize']; label: string }[] = [
  { value: 'small', label: 'Small' },
  { value: 'big', label: 'Big' },
];

export const HAIR_STYLE_OPTIONS: { value: NiceAvatarConfig['hairStyle']; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'thick', label: 'Thick' },
  { value: 'mohawk', label: 'Mohawk' },
  { value: 'womanLong', label: 'Long' },
  { value: 'womanShort', label: 'Short' },
];

export const HAT_STYLE_OPTIONS: { value: NiceAvatarConfig['hatStyle']; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'beanie', label: 'Beanie' },
  { value: 'turban', label: 'Turban' },
];

export const EYE_STYLE_OPTIONS: { value: NiceAvatarConfig['eyeStyle']; label: string }[] = [
  { value: 'circle', label: 'Circle' },
  { value: 'oval', label: 'Oval' },
  { value: 'smile', label: 'Smile' },
];

export const GLASSES_STYLE_OPTIONS: { value: NiceAvatarConfig['glassesStyle']; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'round', label: 'Round' },
  { value: 'square', label: 'Square' },
];

export const NOSE_STYLE_OPTIONS: { value: NiceAvatarConfig['noseStyle']; label: string }[] = [
  { value: 'short', label: 'Short' },
  { value: 'long', label: 'Long' },
  { value: 'round', label: 'Round' },
];

export const MOUTH_STYLE_OPTIONS: { value: NiceAvatarConfig['mouthStyle']; label: string }[] = [
  { value: 'laugh', label: 'Laugh' },
  { value: 'smile', label: 'Smile' },
  { value: 'peace', label: 'Peace' },
];

export const SHIRT_STYLE_OPTIONS: { value: NiceAvatarConfig['shirtStyle']; label: string }[] = [
  { value: 'hoody', label: 'Hoodie' },
  { value: 'short', label: 'T-Shirt' },
  { value: 'polo', label: 'Polo' },
];

// ============================================================================
// COLOR PRESETS
// ============================================================================

export const SKIN_COLOR_PRESETS = [
  { name: 'Fair', hex: '#FFE0BD' },
  { name: 'Light', hex: '#FFCD94' },
  { name: 'Medium Light', hex: '#EAC086' },
  { name: 'Medium', hex: '#D8A76B' },
  { name: 'Tan', hex: '#C68642' },
  { name: 'Medium Dark', hex: '#8D5524' },
  { name: 'Dark', hex: '#6B4423' },
  { name: 'Deep', hex: '#4A2912' },
];

export const HAIR_COLOR_PRESETS = [
  { name: 'Black', hex: '#090806' },
  { name: 'Dark Brown', hex: '#3D2314' },
  { name: 'Brown', hex: '#5A3825' },
  { name: 'Light Brown', hex: '#8B6914' },
  { name: 'Blonde', hex: '#D4A76A' },
  { name: 'Platinum', hex: '#E8D5B7' },
  { name: 'Auburn', hex: '#922724' },
  { name: 'Red', hex: '#B55239' },
  { name: 'Ginger', hex: '#D96B27' },
  { name: 'Gray', hex: '#9A9A9A' },
  { name: 'White', hex: '#ECECEC' },
  { name: 'Blue', hex: '#4A90D9' },
  { name: 'Purple', hex: '#8B5CF6' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Green', hex: '#22C55E' },
];

export const SHIRT_COLOR_PRESETS = [
  { name: 'Black', hex: '#1F1F1F' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Navy', hex: '#1E3A5F' },
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Red', hex: '#EF4444' },
  { name: 'Green', hex: '#22C55E' },
  { name: 'Purple', hex: '#8B5CF6' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Orange', hex: '#F97316' },
  { name: 'Yellow', hex: '#EAB308' },
  { name: 'Teal', hex: '#14B8A6' },
  { name: 'Gray', hex: '#6B7280' },
];

export const BG_COLOR_PRESETS = [
  { name: 'Sky', hex: '#E0F2FE' },
  { name: 'Mint', hex: '#D1FAE5' },
  { name: 'Lavender', hex: '#EDE9FE' },
  { name: 'Peach', hex: '#FFEDD5' },
  { name: 'Rose', hex: '#FCE7F3' },
  { name: 'Slate', hex: '#E2E8F0' },
  { name: 'Warm', hex: '#FEF3C7' },
  { name: 'Cool', hex: '#DBEAFE' },
  { name: 'Forest', hex: '#DCFCE7' },
  { name: 'Sunset', hex: '#FED7AA' },
  { name: 'Ocean', hex: '#BAE6FD' },
  { name: 'Berry', hex: '#F5D0FE' },
];

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

export const DEFAULT_NICE_AVATAR_CONFIG: NiceAvatarConfig = {
  sex: 'woman',
  faceColor: '#F9C9B6',
  earSize: 'small',
  hairColor: '#3D2314',
  hairStyle: 'womanLong',
  hatStyle: 'none',
  eyeStyle: 'circle',
  glassesStyle: 'none',
  noseStyle: 'short',
  mouthStyle: 'smile',
  shirtStyle: 'hoody',
  shirtColor: '#6BD9E9',
  bgColor: '#E0F2FE',
  isGradient: false,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getRandomConfig(): NiceAvatarConfig {
  const randomPick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  
  return {
    sex: randomPick(['man', 'woman'] as const),
    faceColor: randomPick(SKIN_COLOR_PRESETS).hex,
    earSize: randomPick(['small', 'big'] as const),
    hairColor: randomPick(HAIR_COLOR_PRESETS).hex,
    hairStyle: randomPick(['normal', 'thick', 'mohawk', 'womanLong', 'womanShort'] as const),
    hatStyle: randomPick(['none', 'none', 'none', 'beanie', 'turban'] as const), // weighted towards none
    eyeStyle: randomPick(['circle', 'oval', 'smile'] as const),
    glassesStyle: randomPick(['none', 'none', 'round', 'square'] as const), // weighted towards none
    noseStyle: randomPick(['short', 'long', 'round'] as const),
    mouthStyle: randomPick(['laugh', 'smile', 'peace'] as const),
    shirtStyle: randomPick(['hoody', 'short', 'polo'] as const),
    shirtColor: randomPick(SHIRT_COLOR_PRESETS).hex,
    bgColor: randomPick(BG_COLOR_PRESETS).hex,
    isGradient: Math.random() > 0.7,
  };
}

export function mergeNiceAvatarConfig(partial: Partial<NiceAvatarConfig> | null | undefined): NiceAvatarConfig {
  if (!partial) return DEFAULT_NICE_AVATAR_CONFIG;
  return { ...DEFAULT_NICE_AVATAR_CONFIG, ...partial };
}
