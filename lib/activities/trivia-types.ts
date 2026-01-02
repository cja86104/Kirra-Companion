/**
 * KIRRA COMPANION - TRIVIA GAME TYPES
 * 
 * Client-safe types and constants for trivia game.
 * No server imports - can be used in client components.
 */

// ============================================================
// TYPES
// ============================================================

export interface TriviaQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface TriviaGameState {
  gameId: string;
  companionId: string;
  category: string;
  questions: TriviaQuestion[];
  currentQuestionIndex: number;
  answers: { questionId: string; selectedIndex: number; correct: boolean }[];
  score: number;
  totalQuestions: number;
  status: 'playing' | 'completed';
  startedAt: string;
  completedAt: string | null;
}

export interface CompanionReaction {
  message: string;
  emoji: string;
  mood: 'excited' | 'encouraging' | 'playful' | 'impressed';
}

export type TriviaCategory = 
  | 'general'
  | 'science'
  | 'history'
  | 'entertainment'
  | 'sports'
  | 'geography';

// ============================================================
// CATEGORIES
// ============================================================

export const TRIVIA_CATEGORIES: { id: TriviaCategory; name: string; emoji: string; description: string }[] = [
  { id: 'general', name: 'General Knowledge', emoji: '🧠', description: 'A mix of everything' },
  { id: 'science', name: 'Science & Nature', emoji: '🔬', description: 'Physics, biology, chemistry' },
  { id: 'history', name: 'History', emoji: '📜', description: 'Past events and people' },
  { id: 'entertainment', name: 'Entertainment', emoji: '🎬', description: 'Movies, music, TV' },
  { id: 'sports', name: 'Sports', emoji: '⚽', description: 'Games and athletes' },
  { id: 'geography', name: 'Geography', emoji: '🌍', description: 'Countries and places' },
];
