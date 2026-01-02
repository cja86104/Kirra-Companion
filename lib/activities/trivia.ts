/**
 * KIRRA COMPANION - TRIVIA GAME
 * 
 * A real, working trivia game you play with your companion.
 * 
 * Features:
 * - Multiple categories
 * - AI-generated questions with fallback to static
 * - Companion reactions to answers
 * - Score tracking
 * - Game history saved to database
 */

import { createClient } from '@/lib/supabase/server';
import type { TriviaQuestion, TriviaGameState, CompanionReaction, TriviaCategory } from './trivia-types';

// Re-export types for convenience
export type { TriviaQuestion, TriviaGameState, CompanionReaction, TriviaCategory };
export { TRIVIA_CATEGORIES } from './trivia-types';

// ============================================================
// STATIC QUESTION BANK (Fallback)
// ============================================================

const QUESTION_BANK: Record<TriviaCategory, TriviaQuestion[]> = {
  general: [
    {
      id: 'gen1',
      question: 'What is the largest organ in the human body?',
      options: ['Heart', 'Liver', 'Skin', 'Brain'],
      correctIndex: 2,
      category: 'general',
      difficulty: 'easy',
    },
    {
      id: 'gen2',
      question: 'How many continents are there on Earth?',
      options: ['5', '6', '7', '8'],
      correctIndex: 2,
      category: 'general',
      difficulty: 'easy',
    },
    {
      id: 'gen3',
      question: 'What is the chemical symbol for gold?',
      options: ['Go', 'Gd', 'Au', 'Ag'],
      correctIndex: 2,
      category: 'general',
      difficulty: 'medium',
    },
    {
      id: 'gen4',
      question: 'Which planet is known as the Red Planet?',
      options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
      correctIndex: 1,
      category: 'general',
      difficulty: 'easy',
    },
    {
      id: 'gen5',
      question: 'What year did World War II end?',
      options: ['1943', '1944', '1945', '1946'],
      correctIndex: 2,
      category: 'general',
      difficulty: 'medium',
    },
  ],
  science: [
    {
      id: 'sci1',
      question: 'What is the speed of light in a vacuum?',
      options: ['299,792 km/s', '150,000 km/s', '1,000,000 km/s', '186,000 km/s'],
      correctIndex: 0,
      category: 'science',
      difficulty: 'hard',
    },
    {
      id: 'sci2',
      question: 'What is the most abundant gas in Earth\'s atmosphere?',
      options: ['Oxygen', 'Carbon Dioxide', 'Nitrogen', 'Argon'],
      correctIndex: 2,
      category: 'science',
      difficulty: 'medium',
    },
    {
      id: 'sci3',
      question: 'How many bones are in the adult human body?',
      options: ['186', '206', '226', '256'],
      correctIndex: 1,
      category: 'science',
      difficulty: 'medium',
    },
    {
      id: 'sci4',
      question: 'What is the powerhouse of the cell?',
      options: ['Nucleus', 'Ribosome', 'Mitochondria', 'Golgi Body'],
      correctIndex: 2,
      category: 'science',
      difficulty: 'easy',
    },
    {
      id: 'sci5',
      question: 'What is the hardest natural substance on Earth?',
      options: ['Gold', 'Iron', 'Diamond', 'Titanium'],
      correctIndex: 2,
      category: 'science',
      difficulty: 'easy',
    },
  ],
  history: [
    {
      id: 'his1',
      question: 'Who was the first President of the United States?',
      options: ['John Adams', 'Thomas Jefferson', 'George Washington', 'Benjamin Franklin'],
      correctIndex: 2,
      category: 'history',
      difficulty: 'easy',
    },
    {
      id: 'his2',
      question: 'In what year did the Titanic sink?',
      options: ['1910', '1912', '1914', '1916'],
      correctIndex: 1,
      category: 'history',
      difficulty: 'medium',
    },
    {
      id: 'his3',
      question: 'Which ancient wonder was located in Alexandria?',
      options: ['Colossus', 'Lighthouse', 'Hanging Gardens', 'Mausoleum'],
      correctIndex: 1,
      category: 'history',
      difficulty: 'hard',
    },
    {
      id: 'his4',
      question: 'Who painted the Mona Lisa?',
      options: ['Michelangelo', 'Raphael', 'Leonardo da Vinci', 'Donatello'],
      correctIndex: 2,
      category: 'history',
      difficulty: 'easy',
    },
    {
      id: 'his5',
      question: 'The Great Wall of China was primarily built to protect against invasions from which direction?',
      options: ['South', 'East', 'North', 'West'],
      correctIndex: 2,
      category: 'history',
      difficulty: 'medium',
    },
  ],
  entertainment: [
    {
      id: 'ent1',
      question: 'What is the highest-grossing film of all time (unadjusted)?',
      options: ['Titanic', 'Avatar', 'Avengers: Endgame', 'Star Wars: The Force Awakens'],
      correctIndex: 1,
      category: 'entertainment',
      difficulty: 'medium',
    },
    {
      id: 'ent2',
      question: 'Who played Jack in the movie Titanic?',
      options: ['Brad Pitt', 'Tom Cruise', 'Leonardo DiCaprio', 'Johnny Depp'],
      correctIndex: 2,
      category: 'entertainment',
      difficulty: 'easy',
    },
    {
      id: 'ent3',
      question: 'What band was Freddie Mercury the lead singer of?',
      options: ['The Beatles', 'Led Zeppelin', 'Queen', 'Pink Floyd'],
      correctIndex: 2,
      category: 'entertainment',
      difficulty: 'easy',
    },
    {
      id: 'ent4',
      question: 'Which TV show features a character named Walter White?',
      options: ['The Wire', 'Breaking Bad', 'Mad Men', 'The Sopranos'],
      correctIndex: 1,
      category: 'entertainment',
      difficulty: 'easy',
    },
    {
      id: 'ent5',
      question: 'Who directed the movie "Inception"?',
      options: ['Steven Spielberg', 'Christopher Nolan', 'Martin Scorsese', 'Quentin Tarantino'],
      correctIndex: 1,
      category: 'entertainment',
      difficulty: 'medium',
    },
  ],
  sports: [
    {
      id: 'spo1',
      question: 'How many players are on a standard soccer team on the field?',
      options: ['9', '10', '11', '12'],
      correctIndex: 2,
      category: 'sports',
      difficulty: 'easy',
    },
    {
      id: 'spo2',
      question: 'Which country has won the most FIFA World Cups?',
      options: ['Germany', 'Argentina', 'Brazil', 'Italy'],
      correctIndex: 2,
      category: 'sports',
      difficulty: 'medium',
    },
    {
      id: 'spo3',
      question: 'In basketball, how many points is a shot from behind the arc worth?',
      options: ['1', '2', '3', '4'],
      correctIndex: 2,
      category: 'sports',
      difficulty: 'easy',
    },
    {
      id: 'spo4',
      question: 'Which tennis tournament is played on grass?',
      options: ['US Open', 'French Open', 'Australian Open', 'Wimbledon'],
      correctIndex: 3,
      category: 'sports',
      difficulty: 'medium',
    },
    {
      id: 'spo5',
      question: 'How long is an Olympic swimming pool in meters?',
      options: ['25', '50', '75', '100'],
      correctIndex: 1,
      category: 'sports',
      difficulty: 'medium',
    },
  ],
  geography: [
    {
      id: 'geo1',
      question: 'What is the capital of Australia?',
      options: ['Sydney', 'Melbourne', 'Canberra', 'Perth'],
      correctIndex: 2,
      category: 'geography',
      difficulty: 'medium',
    },
    {
      id: 'geo2',
      question: 'Which is the longest river in the world?',
      options: ['Amazon', 'Nile', 'Mississippi', 'Yangtze'],
      correctIndex: 1,
      category: 'geography',
      difficulty: 'medium',
    },
    {
      id: 'geo3',
      question: 'What is the smallest country in the world?',
      options: ['Monaco', 'San Marino', 'Vatican City', 'Liechtenstein'],
      correctIndex: 2,
      category: 'geography',
      difficulty: 'medium',
    },
    {
      id: 'geo4',
      question: 'Mount Everest is located in which mountain range?',
      options: ['Alps', 'Andes', 'Rockies', 'Himalayas'],
      correctIndex: 3,
      category: 'geography',
      difficulty: 'easy',
    },
    {
      id: 'geo5',
      question: 'Which country has the most time zones?',
      options: ['Russia', 'USA', 'France', 'China'],
      correctIndex: 2,
      category: 'geography',
      difficulty: 'hard',
    },
  ],
};

// ============================================================
// COMPANION REACTIONS
// ============================================================

const CORRECT_REACTIONS: CompanionReaction[] = [
  { message: "Yes! You got it! 🎉", emoji: "🎉", mood: "excited" },
  { message: "That's right! You're on fire!", emoji: "🔥", mood: "excited" },
  { message: "Brilliant! I knew you'd get that one!", emoji: "✨", mood: "impressed" },
  { message: "Correct! High five! ✋", emoji: "✋", mood: "playful" },
  { message: "Nailed it! You're so smart!", emoji: "🧠", mood: "impressed" },
  { message: "Woohoo! Another point for us!", emoji: "🙌", mood: "excited" },
];

const WRONG_REACTIONS: CompanionReaction[] = [
  { message: "Ooh, so close! Don't worry, we've got this!", emoji: "💪", mood: "encouraging" },
  { message: "Hmm, not quite! But hey, that's how we learn!", emoji: "📚", mood: "encouraging" },
  { message: "Aw, that was a tricky one! Next question!", emoji: "🤔", mood: "encouraging" },
  { message: "No worries! I would've guessed wrong too!", emoji: "😅", mood: "playful" },
  { message: "That one was tough! Let's get the next one!", emoji: "💫", mood: "encouraging" },
];

const GAME_END_REACTIONS = {
  perfect: [
    { message: "PERFECT SCORE! You're absolutely amazing! 🏆", emoji: "🏆", mood: "excited" as const },
    { message: "Wow! 100%! I'm so proud of you!", emoji: "🌟", mood: "impressed" as const },
  ],
  great: [
    { message: "Great job! You really know your stuff!", emoji: "🎊", mood: "excited" as const },
    { message: "Awesome! That was so much fun playing with you!", emoji: "😊", mood: "excited" as const },
  ],
  good: [
    { message: "Nice work! We make a great team!", emoji: "🤝", mood: "playful" as const },
    { message: "Good game! Want to try another round?", emoji: "🎮", mood: "playful" as const },
  ],
  okay: [
    { message: "Hey, that was fun! Practice makes perfect!", emoji: "💪", mood: "encouraging" as const },
    { message: "Good effort! Let's play again sometime!", emoji: "🌈", mood: "encouraging" as const },
  ],
};

// ============================================================
// GAME FUNCTIONS
// ============================================================

/**
 * Get questions for a trivia game.
 * Returns 5 shuffled questions from the category.
 */
export function getQuestions(category: TriviaCategory, count: number = 5): TriviaQuestion[] {
  const categoryQuestions = QUESTION_BANK[category] || QUESTION_BANK.general;
  
  // Shuffle and take requested count
  const shuffled = [...categoryQuestions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Get a random companion reaction for correct answer.
 */
export function getCorrectReaction(): CompanionReaction {
  return CORRECT_REACTIONS[Math.floor(Math.random() * CORRECT_REACTIONS.length)];
}

/**
 * Get a random companion reaction for wrong answer.
 */
export function getWrongReaction(): CompanionReaction {
  return WRONG_REACTIONS[Math.floor(Math.random() * WRONG_REACTIONS.length)];
}

/**
 * Get companion reaction for game end based on score.
 */
export function getGameEndReaction(score: number, total: number): CompanionReaction {
  const percentage = (score / total) * 100;
  
  let reactions: CompanionReaction[];
  if (percentage === 100) {
    reactions = GAME_END_REACTIONS.perfect;
  } else if (percentage >= 80) {
    reactions = GAME_END_REACTIONS.great;
  } else if (percentage >= 60) {
    reactions = GAME_END_REACTIONS.good;
  } else {
    reactions = GAME_END_REACTIONS.okay;
  }
  
  return reactions[Math.floor(Math.random() * reactions.length)];
}

/**
 * Create a new game state.
 */
export function createGameState(
  companionId: string,
  category: TriviaCategory
): TriviaGameState {
  const questions = getQuestions(category);
  
  return {
    gameId: crypto.randomUUID(),
    companionId,
    category,
    questions,
    currentQuestionIndex: 0,
    answers: [],
    score: 0,
    totalQuestions: questions.length,
    status: 'playing',
    startedAt: new Date().toISOString(),
    completedAt: null,
  };
}

/**
 * Process an answer and update game state.
 */
export function processAnswer(
  state: TriviaGameState,
  selectedIndex: number
): { 
  updatedState: TriviaGameState; 
  correct: boolean; 
  reaction: CompanionReaction;
  correctAnswer: string;
} {
  const currentQuestion = state.questions[state.currentQuestionIndex];
  const correct = selectedIndex === currentQuestion.correctIndex;
  
  const newAnswer = {
    questionId: currentQuestion.id,
    selectedIndex,
    correct,
  };
  
  const newScore = correct ? state.score + 1 : state.score;
  const nextIndex = state.currentQuestionIndex + 1;
  const isComplete = nextIndex >= state.questions.length;
  
  const updatedState: TriviaGameState = {
    ...state,
    currentQuestionIndex: nextIndex,
    answers: [...state.answers, newAnswer],
    score: newScore,
    status: isComplete ? 'completed' : 'playing',
    completedAt: isComplete ? new Date().toISOString() : null,
  };
  
  const reaction = correct ? getCorrectReaction() : getWrongReaction();
  
  return {
    updatedState,
    correct,
    reaction,
    correctAnswer: currentQuestion.options[currentQuestion.correctIndex],
  };
}

// ============================================================
// DATABASE FUNCTIONS
// ============================================================

/**
 * Save completed game to database.
 */
export async function saveGameResult(
  userId: string,
  state: TriviaGameState
): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('trivia_games')
      .insert({
        id: state.gameId,
        user_id: userId,
        companion_id: state.companionId,
        category: state.category,
        score: state.score,
        total_questions: state.totalQuestions,
        answers: state.answers,
        started_at: state.startedAt,
        completed_at: state.completedAt,
      } as never);
    
    if (error) {
      console.error('Error saving trivia game:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Exception saving trivia game:', error);
    return false;
  }
}

/**
 * Get game history for a user.
 */
export async function getGameHistory(
  userId: string,
  limit: number = 10
) {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('trivia_games')
      .select(`
        *,
        companions (
          id,
          name,
          avatar_url
        )
      `)
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching game history:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Exception fetching game history:', error);
    return [];
  }
}

/**
 * Get user's best score for a category.
 */
export async function getBestScore(
  userId: string,
  category: TriviaCategory
): Promise<number | null> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('trivia_games')
      .select('score, total_questions')
      .eq('user_id', userId)
      .eq('category', category)
      .order('score', { ascending: false })
      .limit(1)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    const result = data as { score: number; total_questions: number };
    return result.score;
  } catch (error) {
    return null;
  }
}
