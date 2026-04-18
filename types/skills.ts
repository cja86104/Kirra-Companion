/**
 * TEACHABLE SKILLS TYPES
 *
 * Type definitions for the companion skill learning system.
 * Companions can be taught specific knowledge that they retain and use.
 */

// ============================================================================
// ENUMS
// ============================================================================

export type SkillCategory = 
  | 'coding'      // Programming languages, frameworks, debugging
  | 'recipes'     // Cooking recipes, food preparation
  | 'domain'      // Work/professional domain knowledge
  | 'traditions'  // Family/cultural traditions and customs
  | 'games'       // Game rules, strategies, character info
  | 'creative'    // Art techniques, writing styles, music
  | 'language'    // Phrases, vocabulary, translations
  | 'procedures'  // How-to processes, workflows
  | 'trivia'      // Facts, information, knowledge
  | 'other';      // Anything else

export type SkillProficiency = 
  | 'novice'      // Just learned, basic understanding
  | 'familiar'    // Can recall and use with prompting
  | 'competent'   // Solid understanding, uses naturally
  | 'proficient'  // Deep knowledge, can elaborate
  | 'expert';     // Mastery, can teach others

export type SkillUsageType = 
  | 'referenced'  // Mentioned the skill
  | 'applied'     // Used the skill knowledge
  | 'taught'      // Taught/reinforced by user
  | 'corrected';  // User corrected the skill

export type SkillTaughtVia = 
  | 'chat'        // Taught through conversation
  | 'manual'      // Manually entered via UI
  | 'import';     // Imported from file/template

// ============================================================================
// DATABASE TYPES
// ============================================================================

/**
 * Main companion skill record
 */
export interface CompanionSkill {
  id: string;
  companion_id: string;
  
  // Skill identification
  skill_name: string;
  skill_category: SkillCategory;
  skill_description: string | null;
  
  // The actual knowledge
  skill_content: string;
  skill_summary: string | null;
  
  // Structured data for specific categories (JSON from database)
  structured_data: SkillStructuredData | Record<string, unknown> | null;
  
  // Learning metadata
  proficiency: SkillProficiency;
  times_used: number;
  times_reinforced: number;
  last_used_at: string | null;
  
  // Teaching context
  taught_at: string;
  taught_via: SkillTaughtVia;
  teaching_context: string | null;
  
  // Effectiveness tracking
  successful_uses: number;
  failed_uses: number;
  confidence_score: number;
  
  // Organization
  tags: string[] | null;
  is_favorite: boolean;
  is_active: boolean;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Insert type (omits generated fields)
 */
export interface CompanionSkillInsert {
  companion_id: string;
  skill_name: string;
  skill_category?: SkillCategory;
  skill_description?: string | null;
  skill_content: string;
  skill_summary?: string | null;
  structured_data?: SkillStructuredData;
  proficiency?: SkillProficiency;
  taught_via?: SkillTaughtVia;
  teaching_context?: string | null;
  tags?: string[];
  is_favorite?: boolean;
}

/**
 * Update type (all optional)
 */
export interface CompanionSkillUpdate {
  skill_name?: string;
  skill_category?: SkillCategory;
  skill_description?: string | null;
  skill_content?: string;
  skill_summary?: string | null;
  structured_data?: SkillStructuredData;
  times_used?: number;
  times_reinforced?: number;
  last_used_at?: string | null;
  successful_uses?: number;
  failed_uses?: number;
  tags?: string[];
  is_favorite?: boolean;
  is_active?: boolean;
}

// ============================================================================
// STRUCTURED DATA TYPES (for specific skill categories)
// ============================================================================

/**
 * Union type for all structured data formats
 */
export type SkillStructuredData = 
  | RecipeStructuredData
  | CodingStructuredData
  | GameStructuredData
  | ProcedureStructuredData
  | GenericStructuredData;

/**
 * Recipe-specific structured data
 */
export interface RecipeStructuredData {
  type: 'recipe';
  servings?: number;
  prepTime?: string;
  cookTime?: string;
  ingredients: {
    item: string;
    amount: string;
    unit?: string;
    notes?: string;
  }[];
  steps: {
    order: number;
    instruction: string;
    tips?: string;
  }[];
  cuisine?: string;
  dietary?: string[];  // vegetarian, gluten-free, etc.
  source?: string;     // "grandma", "mom", etc.
}

/**
 * Coding-specific structured data
 */
export interface CodingStructuredData {
  type: 'coding';
  language: string;
  framework?: string;
  snippets: {
    name: string;
    code: string;
    description?: string;
  }[];
  concepts?: string[];
  relatedDocs?: string[];
}

/**
 * Game-specific structured data
 */
export interface GameStructuredData {
  type: 'game';
  gameName: string;
  gameType?: string;  // board, video, card, rpg, etc.
  rules?: string[];
  characters?: {
    name: string;
    details: string;
  }[];
  strategies?: string[];
  houseRules?: string[];
}

/**
 * Procedure-specific structured data
 */
export interface ProcedureStructuredData {
  type: 'procedure';
  steps: {
    order: number;
    action: string;
    notes?: string;
    warnings?: string;
  }[];
  prerequisites?: string[];
  tools?: string[];
  estimatedTime?: string;
}

/**
 * Generic structured data (for other categories)
 */
export interface GenericStructuredData {
  type: 'generic';
  keyPoints?: string[];
  relatedTopics?: string[];
  examples?: string[];
  [key: string]: unknown;
}

// ============================================================================
// SKILL USAGE LOG
// ============================================================================

export interface SkillUsageLog {
  id: string;
  skill_id: string;
  companion_id: string;
  message_id: string | null;
  usage_type: SkillUsageType;
  was_successful: boolean | null;
  user_feedback: string | null;
  used_at: string;
}

export interface SkillUsageLogInsert {
  skill_id: string;
  companion_id: string;
  message_id?: string | null;
  usage_type: SkillUsageType;
  was_successful?: boolean | null;
  user_feedback?: string | null;
}

// ============================================================================
// API TYPES
// ============================================================================

/**
 * Request to teach a new skill
 */
export interface TeachSkillRequest {
  skill_name: string;
  skill_category: SkillCategory;
  skill_content: string;
  skill_description?: string;
  structured_data?: SkillStructuredData;
  tags?: string[];
  teaching_context?: string;
}

/**
 * Response after teaching a skill
 */
export interface TeachSkillResponse {
  success: boolean;
  skill: CompanionSkill;
  message: string;
  summary_generated?: string;
}

/**
 * Skill with relevance score (for search results)
 */
export interface SkillSearchResult {
  skill: CompanionSkill;
  relevance_score: number;
  match_reason: string;
}

/**
 * Skills summary for a companion
 */
export interface SkillsSummary {
  total_skills: number;
  by_category: Record<SkillCategory, number>;
  by_proficiency: Record<SkillProficiency, number>;
  most_used: CompanionSkill[];
  recently_learned: CompanionSkill[];
  favorites: CompanionSkill[];
}

// ============================================================================
// SKILL DETECTION TYPES (for chat analysis)
// ============================================================================

/**
 * Result of detecting a teaching moment in chat
 */
export interface TeachingDetection {
  is_teaching: boolean;
  confidence: number;
  detected_category: SkillCategory | null;
  detected_name: string | null;
  extracted_content: string | null;
  teaching_phrases: string[];
}

/**
 * Result of detecting skill usage need in chat
 */
export interface SkillUsageDetection {
  should_use_skills: boolean;
  relevant_topics: string[];
  suggested_skills: string[];
}

// ============================================================================
// CATEGORY METADATA
// ============================================================================

export const SKILL_CATEGORY_INFO: Record<SkillCategory, {
  label: string;
  emoji: string;
  description: string;
  examples: string[];
}> = {
  coding: {
    label: 'Coding',
    emoji: '💻',
    description: 'Programming languages, frameworks, and debugging',
    examples: ['Python basics', 'React patterns', 'SQL queries', 'Git commands'],
  },
  recipes: {
    label: 'Recipes',
    emoji: '🍳',
    description: 'Cooking recipes and food preparation',
    examples: ['Grandma\'s cookies', 'Family chili recipe', 'Sourdough bread'],
  },
  domain: {
    label: 'Domain Knowledge',
    emoji: '💼',
    description: 'Work and professional expertise',
    examples: ['Company processes', 'Industry terms', 'Project details'],
  },
  traditions: {
    label: 'Traditions',
    emoji: '🎄',
    description: 'Family and cultural traditions',
    examples: ['Holiday customs', 'Birthday traditions', 'Family rituals'],
  },
  games: {
    label: 'Games',
    emoji: '🎮',
    description: 'Game rules, strategies, and characters',
    examples: ['D&D character', 'Chess openings', 'Board game rules'],
  },
  creative: {
    label: 'Creative',
    emoji: '🎨',
    description: 'Art, writing, and music techniques',
    examples: ['Drawing style', 'Writing voice', 'Music theory'],
  },
  language: {
    label: 'Language',
    emoji: '🗣️',
    description: 'Phrases, vocabulary, and translations',
    examples: ['Family phrases', 'Slang meanings', 'Translations'],
  },
  procedures: {
    label: 'Procedures',
    emoji: '📋',
    description: 'Step-by-step processes and workflows',
    examples: ['Morning routine', 'Workout plan', 'Cleaning checklist'],
  },
  trivia: {
    label: 'Trivia',
    emoji: '🧠',
    description: 'Facts, information, and knowledge',
    examples: ['Historical facts', 'Science topics', 'Pop culture'],
  },
  other: {
    label: 'Other',
    emoji: '📦',
    description: 'Anything else',
    examples: ['Miscellaneous knowledge'],
  },
};

export const SKILL_PROFICIENCY_INFO: Record<SkillProficiency, {
  label: string;
  description: string;
  minUses: number;
  minSuccessRate: number;
}> = {
  novice: {
    label: 'Novice',
    description: 'Just learned, basic understanding',
    minUses: 0,
    minSuccessRate: 0,
  },
  familiar: {
    label: 'Familiar',
    description: 'Can recall and use with prompting',
    minUses: 2,
    minSuccessRate: 0.5,
  },
  competent: {
    label: 'Competent',
    description: 'Solid understanding, uses naturally',
    minUses: 5,
    minSuccessRate: 0.7,
  },
  proficient: {
    label: 'Proficient',
    description: 'Deep knowledge, can elaborate',
    minUses: 10,
    minSuccessRate: 0.8,
  },
  expert: {
    label: 'Expert',
    description: 'Mastery, can teach others',
    minUses: 20,
    minSuccessRate: 0.9,
  },
};
