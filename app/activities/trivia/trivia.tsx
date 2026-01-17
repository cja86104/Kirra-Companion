'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  ArrowLeft, 
  Trophy, 
  CheckCircle, 
  XCircle,
  Loader2,
  RotateCcw,
  Home,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils/cn';
import { getClient } from '@/lib/supabase/client';
import { TRIVIA_CATEGORIES, type TriviaCategory, type CompanionReaction } from '@/lib/activities/trivia';

// ============================================================
// TYPES
// ============================================================

interface Question {
  index: number;
  question: string;
  options: string[];
  difficulty: 'easy' | 'medium' | 'hard';
}

interface GameState {
  status: 'selecting' | 'loading' | 'playing' | 'answered' | 'complete';
  gameId: string | null;
  category: TriviaCategory | null;
  companionId: string | null;
  companionName: string | null;
  currentQuestion: Question | null;
  totalQuestions: number;
  currentScore: number;
  selectedAnswer: number | null;
  wasCorrect: boolean | null;
  correctAnswer: string | null;
  reaction: CompanionReaction | null;
  finalScore: number | null;
  endReaction: CompanionReaction | null;
}

interface Companion {
  id: string;
  name: string;
  avatar_url: string | null;
}

// ============================================================
// COMPONENT
// ============================================================

export default function TriviaPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const preselectedCompanion = searchParams.get('companion');

  const [companions, setCompanions] = useState<Companion[]>([]);
  const [selectedCompanion, setSelectedCompanion] = useState<string | null>(preselectedCompanion);
  const [loading, setLoading] = useState(true);
  
  const [gameState, setGameState] = useState<GameState>({
    status: 'selecting',
    gameId: null,
    category: null,
    companionId: null,
    companionName: null,
    currentQuestion: null,
    totalQuestions: 5,
    currentScore: 0,
    selectedAnswer: null,
    wasCorrect: null,
    correctAnswer: null,
    reaction: null,
    finalScore: null,
    endReaction: null,
  });

  // Load companions
  useEffect(() => {
    async function loadCompanions() {
      try {
        const supabase = getClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        const { data } = await supabase
          .from('companions')
          .select('id, name, avatar_url')
          .eq('user_id', user.id)
          .eq('is_archived', false);

        if (data) {
          const companionData = data as Companion[];
          setCompanions(companionData);
          // Auto-select if only one companion or preselected
          if (preselectedCompanion) {
            setSelectedCompanion(preselectedCompanion);
          } else if (companionData.length === 1) {
            setSelectedCompanion(companionData[0].id);
          }
        }
      } catch (error) {
        console.error('Failed to load companions:', error);
      } finally {
        setLoading(false);
      }
    }

    loadCompanions();
  }, [router, preselectedCompanion]);

  // Start game
  const startGame = async (category: TriviaCategory) => {
    if (!selectedCompanion) return;

    setGameState(prev => ({ ...prev, status: 'loading', category }));

    try {
      const response = await fetch('/api/activities/trivia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companionId: selectedCompanion,
          category,
        }),
      });

      if (!response.ok) throw new Error('Failed to start game');

      const data = await response.json();

      setGameState({
        status: 'playing',
        gameId: data.gameId,
        category,
        companionId: selectedCompanion,
        companionName: data.companionName,
        currentQuestion: data.currentQuestion,
        totalQuestions: data.totalQuestions,
        currentScore: 0,
        selectedAnswer: null,
        wasCorrect: null,
        correctAnswer: null,
        reaction: null,
        finalScore: null,
        endReaction: null,
      });
    } catch (error) {
      console.error('Failed to start game:', error);
      setGameState(prev => ({ ...prev, status: 'selecting' }));
    }
  };

  // Submit answer
  const submitAnswer = async (answerIndex: number) => {
    if (!gameState.gameId || gameState.status !== 'playing') return;

    setGameState(prev => ({ ...prev, selectedAnswer: answerIndex, status: 'loading' }));

    try {
      const response = await fetch('/api/activities/trivia', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: gameState.gameId,
          selectedIndex: answerIndex,
        }),
      });

      if (!response.ok) throw new Error('Failed to submit answer');

      const data = await response.json();

      if (data.gameComplete) {
        setGameState(prev => ({
          ...prev,
          status: 'complete',
          wasCorrect: data.correct,
          correctAnswer: data.correctAnswer,
          reaction: data.reaction,
          finalScore: data.finalScore,
          endReaction: data.endReaction,
        }));
      } else {
        setGameState(prev => ({
          ...prev,
          status: 'answered',
          wasCorrect: data.correct,
          correctAnswer: data.correctAnswer,
          reaction: data.reaction,
          currentScore: data.currentScore,
          currentQuestion: data.nextQuestion,
        }));
      }
    } catch (error) {
      console.error('Failed to submit answer:', error);
      setGameState(prev => ({ ...prev, status: 'playing' }));
    }
  };

  // Continue to next question
  const nextQuestion = () => {
    setGameState(prev => ({
      ...prev,
      status: 'playing',
      selectedAnswer: null,
      wasCorrect: null,
      correctAnswer: null,
      reaction: null,
    }));
  };

  // Reset game
  const resetGame = () => {
    setGameState({
      status: 'selecting',
      gameId: null,
      category: null,
      companionId: null,
      companionName: null,
      currentQuestion: null,
      totalQuestions: 5,
      currentScore: 0,
      selectedAnswer: null,
      wasCorrect: null,
      correctAnswer: null,
      reaction: null,
      finalScore: null,
      endReaction: null,
    });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const selectedCompanionData = companions.find(c => c.id === selectedCompanion);

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-kirra-forest-light" />
      </div>
    );
  }

  // No companions
  if (companions.length === 0) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center p-6">
        <Brain className="mb-4 h-12 w-12 text-muted-foreground" />
        <h2 className="mb-2 text-xl font-semibold">No Companions Yet</h2>
        <p className="mb-4 text-muted-foreground">Create a companion to play trivia with!</p>
        <Button asChild>
          <Link href="/companion/create">Create Companion</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-full p-6 lg:p-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Link href="/activities">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <Brain className="h-6 w-6 text-kirra-amber" />
              Trivia Challenge
            </h1>
            {gameState.companionName && (
              <p className="text-sm text-muted-foreground">
                Playing with {gameState.companionName}
              </p>
            )}
          </div>
        </div>

        {/* Category Selection */}
        {gameState.status === 'selecting' && (
          <div className="space-y-6">
            {/* Companion Selection */}
            {companions.length > 1 && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm font-medium mb-3">Choose companion:</p>
                  <div className="flex flex-wrap gap-2">
                    {companions.map((companion) => (
                      <button
                        key={companion.id}
                        onClick={() => setSelectedCompanion(companion.id)}
                        className={cn(
                          'flex items-center gap-2 rounded-lg px-3 py-2 transition-all',
                          selectedCompanion === companion.id
                            ? 'bg-kirra-forest/20 ring-2 ring-kirra-forest-light'
                            : 'bg-muted hover:bg-muted/80'
                        )}
                      >
                        <Avatar size="sm">
                          {companion.avatar_url ? (
                            <AvatarImage src={companion.avatar_url} alt={companion.name} />
                          ) : (
                            <AvatarFallback className="bg-kirra-forest text-white text-xs">
                              {getInitials(companion.name)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <span className="text-sm font-medium">{companion.name}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Category Selection */}
            <div>
              <p className="text-sm font-medium mb-3">Choose a category:</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {TRIVIA_CATEGORIES.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => startGame(category.id)}
                    disabled={!selectedCompanion}
                    className={cn(
                      'flex items-center gap-4 rounded-xl bg-card p-4 text-left transition-all hover:shadow-md',
                      !selectedCompanion && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <div className="text-3xl">{category.emoji}</div>
                    <div>
                      <p className="font-medium">{category.name}</p>
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {!selectedCompanion && (
              <p className="text-center text-sm text-muted-foreground">
                Select a companion to start playing
              </p>
            )}
          </div>
        )}

        {/* Loading */}
        {gameState.status === 'loading' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-kirra-forest-light mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        )}

        {/* Playing / Answered */}
        {(gameState.status === 'playing' || gameState.status === 'answered') && gameState.currentQuestion && (
          <div className="space-y-6">
            {/* Progress */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Question {gameState.currentQuestion.index + 1} of {gameState.totalQuestions}
              </span>
              <span className="font-medium">
                Score: {gameState.currentScore}/{gameState.currentQuestion.index + (gameState.status === 'answered' ? 1 : 0)}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full bg-kirra-forest"
                initial={{ width: 0 }}
                animate={{ 
                  width: `${((gameState.currentQuestion.index + (gameState.status === 'answered' ? 1 : 0)) / gameState.totalQuestions) * 100}%` 
                }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* Question Card */}
            <Card>
              <CardContent className="p-6">
                <div className="mb-6">
                  <span className={cn(
                    'inline-block px-2 py-1 rounded text-xs font-medium mb-3',
                    gameState.currentQuestion.difficulty === 'easy' && 'bg-green-500/20 text-green-600',
                    gameState.currentQuestion.difficulty === 'medium' && 'bg-yellow-500/20 text-yellow-600',
                    gameState.currentQuestion.difficulty === 'hard' && 'bg-red-500/20 text-red-600',
                  )}>
                    {gameState.currentQuestion.difficulty.toUpperCase()}
                  </span>
                  <h2 className="text-xl font-medium">{gameState.currentQuestion.question}</h2>
                </div>

                {/* Options */}
                <div className="space-y-3">
                  {gameState.currentQuestion.options.map((option, index) => {
                    const isSelected = gameState.selectedAnswer === index;
                    const isCorrect = gameState.status === 'answered' && option === gameState.correctAnswer;
                    const isWrong = gameState.status === 'answered' && isSelected && !gameState.wasCorrect;

                    return (
                      <button
                        key={index}
                        onClick={() => gameState.status === 'playing' && submitAnswer(index)}
                        disabled={gameState.status !== 'playing'}
                        className={cn(
                          'w-full flex items-center gap-3 rounded-lg border p-4 text-left transition-all',
                          gameState.status === 'playing' && 'hover:border-kirra-forest hover:bg-kirra-forest/5',
                          isCorrect && 'border-green-500 bg-green-500/10',
                          isWrong && 'border-red-500 bg-red-500/10',
                          isSelected && gameState.status === 'playing' && 'border-kirra-forest bg-kirra-forest/10',
                        )}
                      >
                        <span className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-medium',
                          isCorrect && 'border-green-500 bg-green-500 text-white',
                          isWrong && 'border-red-500 bg-red-500 text-white',
                        )}>
                          {isCorrect ? <CheckCircle className="h-5 w-5" /> : 
                           isWrong ? <XCircle className="h-5 w-5" /> : 
                           String.fromCharCode(65 + index)}
                        </span>
                        <span className="flex-1">{option}</span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Companion Reaction */}
            <AnimatePresence>
              {gameState.status === 'answered' && gameState.reaction && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex items-start gap-3"
                >
                  <Avatar>
                    {selectedCompanionData?.avatar_url ? (
                      <AvatarImage src={selectedCompanionData.avatar_url} alt={gameState.companionName || ''} />
                    ) : (
                      <AvatarFallback className="bg-kirra-forest text-white">
                        {getInitials(gameState.companionName || 'C')}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className={cn(
                    'rounded-2xl rounded-tl-none px-4 py-3',
                    gameState.wasCorrect ? 'bg-green-500/10' : 'bg-kirra-warm/10'
                  )}>
                    <p>{gameState.reaction.message}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Continue Button */}
            {gameState.status === 'answered' && (
              <Button onClick={nextQuestion} className="w-full">
                Next Question
              </Button>
            )}
          </div>
        )}

        {/* Game Complete */}
        {gameState.status === 'complete' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6"
          >
            {/* Trophy */}
            <div className="flex justify-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="flex h-24 w-24 items-center justify-center rounded-full bg-kirra-amber/20"
              >
                <Trophy className="h-12 w-12 text-kirra-amber" />
              </motion.div>
            </div>

            {/* Score */}
            <div>
              <h2 className="text-3xl font-bold">
                {gameState.finalScore} / {gameState.totalQuestions}
              </h2>
              <p className="text-muted-foreground">
                {Math.round((gameState.finalScore! / gameState.totalQuestions) * 100)}% correct
              </p>
            </div>

            {/* Companion Reaction */}
            {gameState.endReaction && (
              <div className="flex justify-center">
                <div className="flex items-start gap-3 max-w-sm">
                  <Avatar>
                    {selectedCompanionData?.avatar_url ? (
                      <AvatarImage src={selectedCompanionData.avatar_url} alt={gameState.companionName || ''} />
                    ) : (
                      <AvatarFallback className="bg-kirra-forest text-white">
                        {getInitials(gameState.companionName || 'C')}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="rounded-2xl rounded-tl-none bg-kirra-forest/10 px-4 py-3 text-left">
                    <p>{gameState.endReaction.message}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button onClick={resetGame} variant="outline" className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Play Again
              </Button>
              <Button asChild className="gap-2">
                <Link href="/activities">
                  <Home className="h-4 w-4" />
                  Back to Activities
                </Link>
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
