import type { Companion, CompanionDNA } from './database';

// Personality traits interface
export interface PersonalityTraits {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
  humor: number;
  empathy: number;
  curiosity: number;
  playfulness: number;
  assertiveness: number;
}

// Mood state interface
export interface MoodState {
  primary: EmotionType;
  secondary?: EmotionType | null;
  intensity: number;
  lastUpdated?: string | null;
}

// Emotion types
export type EmotionType =
  | 'happy'
  | 'sad'
  | 'excited'
  | 'calm'
  | 'curious'
  | 'loving'
  | 'playful'
  | 'thoughtful'
  | 'neutral'
  | 'anxious'
  | 'proud'
  | 'grateful';

// Relationship types
export type RelationshipType = 'friend' | 'mentor' | 'romantic' | 'family' | 'custom';

// Avatar configuration
export interface Avatar3DConfig {
  model: string;
  skinTone: string;
  hairColor: string;
  hairStyle: string;
  eyeColor: string;
  expression: string;
  outfit: string;
  accessories: string[];
}

// Voice configuration
export interface VoiceConfig {
  provider: 'elevenlabs' | 'openai';
  voiceId: string | null;
  stability: number;
  similarityBoost: number;
  style: number;
  speakingRate: number;
}

// DNA Components
export interface LearningStyleMatrix {
  visualLearner: number;
  analyticalThinker: number;
  emotionalProcessor: number;
  practicalApproach: number;
  abstractReasoning: number;
  detailOriented: number;
  bigPictureFocus: number;
  sequentialLearning: number;
}

export interface HumorGenome {
  sarcasm: number;
  wordplay: number;
  observational: number;
  selfDeprecating: number;
  darkHumor: number;
  slapstick: number;
  intellectual: number;
  absurdist: number;
  timing: number;
  callbacks: number;
}

export interface EmotionalResonanceMap {
  joyResponse: number;
  sadnessSupport: number;
  angerHandling: number;
  fearComfort: number;
  surpriseReaction: number;
  disgustTolerance: number;
  empathyDepth: number;
  emotionalMirroring: number;
  boundaryAwareness: number;
  conflictResolution: number;
}

export interface InterestEvolutionTree {
  roots: InterestNode[];
  branches: InterestNode[];
  leaves: InterestNode[];
  connections: InterestConnection[];
}

export interface InterestNode {
  id: string;
  name: string;
  level: number;
  source: string;
  developedAt: string;
}

export interface InterestConnection {
  from: string;
  to: string;
  strength: number;
}

export interface CommunicationDialect {
  favoriteExpressions: string[];
  vocabularyLevel: 'simple' | 'moderate' | 'advanced' | 'adaptive';
  sentenceComplexity: number;
  emojiUsage: number;
  formalityLevel: number;
  uniquePhrases: string[];
  avoidedWords: string[];
  speechPatterns: string[];
}

export interface MemoryWeightingAlgorithm {
  emotionalMoments: number;
  sharedExperiences: number;
  userPreferences: number;
  insideJokes: number;
  importantDates: number;
  userGoals: number;
  relationshipMilestones: number;
  conflictResolutions: number;
  dailyDetails: number;
  randomFacts: number;
}

// Extended companion with parsed types
export interface CompanionFull extends Omit<Companion, 'personality_base' | 'current_mood' | 'avatar_3d_config' | 'voice_config'> {
  personality_base: PersonalityTraits;
  current_mood: MoodState;
  avatar_3d_config: Avatar3DConfig;
  voice_config: VoiceConfig;
  companion_dna: CompanionDNAFull | null;
}

export interface CompanionDNAFull extends Omit<CompanionDNA, 'learning_style_matrix' | 'humor_genome' | 'emotional_resonance_map' | 'interest_evolution_tree' | 'communication_dialect' | 'memory_weighting_algorithm'> {
  learning_style_matrix: LearningStyleMatrix;
  humor_genome: HumorGenome;
  emotional_resonance_map: EmotionalResonanceMap;
  interest_evolution_tree: InterestEvolutionTree;
  communication_dialect: CommunicationDialect;
  memory_weighting_algorithm: MemoryWeightingAlgorithm;
}

// Create companion request
export interface CreateCompanionRequest {
  name: string;
  relationshipType: RelationshipType;
  backstory?: string;
  personality?: Partial<PersonalityTraits>;
}

// Update companion request
export interface UpdateCompanionRequest {
  name?: string;
  relationshipType?: RelationshipType;
  relationshipLabel?: string;
  backstory?: string;
  personality?: Partial<PersonalityTraits>;
  avatarUrl?: string;
  avatar3dConfig?: Partial<Avatar3DConfig>;
  voiceConfig?: Partial<VoiceConfig>;
  interests?: string[];
  quirks?: string[];
}

// Companion stats
export interface CompanionStats {
  totalMessages: number;
  totalVoiceMinutes: number;
  totalActivities: number;
  memoriesCount: number;
  skillsCount: number;
  daysKnown: number;
  conversationsCount: number;
  averageSessionLength: number;
}
