/**
 * TRIVIA GAME API
 * 
 * POST - Start a new game
 * PUT - Submit an answer
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  createGameState,
  processAnswer,
  getGameEndReaction,
  saveGameResult,
  type TriviaCategory,
  type TriviaGameState,
} from '@/lib/activities/trivia';

// Store active games in memory (in production, use Redis or similar)
const activeGames = new Map<string, TriviaGameState>();

// ============================================================
// POST - Start New Game
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { companionId, category } = body as {
      companionId: string;
      category: TriviaCategory;
    };
    
    if (!companionId || !category) {
      return NextResponse.json(
        { error: 'companionId and category are required' },
        { status: 400 }
      );
    }
    
    // Verify companion belongs to user
    const { data: companionData, error: companionError } = await supabase
      .from('companions')
      .select('id, name')
      .eq('id', companionId)
      .eq('user_id', user.id)
      .single();
    
    const companion = companionData as { id: string; name: string } | null;
    
    if (companionError || !companion) {
      return NextResponse.json(
        { error: 'Companion not found' },
        { status: 404 }
      );
    }
    
    // Create new game
    const gameState = createGameState(companionId, category);
    
    // Store in memory (keyed by gameId)
    activeGames.set(gameState.gameId, gameState);
    
    // Return first question (without correct answer)
    const firstQuestion = gameState.questions[0];
    
    return NextResponse.json({
      gameId: gameState.gameId,
      category: gameState.category,
      totalQuestions: gameState.totalQuestions,
      currentQuestion: {
        index: 0,
        question: firstQuestion.question,
        options: firstQuestion.options,
        difficulty: firstQuestion.difficulty,
      },
      companionName: companion.name,
    });
    
  } catch (error) {
    console.error('Start game error:', error);
    return NextResponse.json(
      { error: 'Failed to start game' },
      { status: 500 }
    );
  }
}

// ============================================================
// PUT - Submit Answer
// ============================================================

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { gameId, selectedIndex } = body as {
      gameId: string;
      selectedIndex: number;
    };
    
    if (!gameId || selectedIndex === undefined) {
      return NextResponse.json(
        { error: 'gameId and selectedIndex are required' },
        { status: 400 }
      );
    }
    
    // Get game from memory
    const gameState = activeGames.get(gameId);
    
    if (!gameState) {
      return NextResponse.json(
        { error: 'Game not found or expired' },
        { status: 404 }
      );
    }
    
    if (gameState.status === 'completed') {
      return NextResponse.json(
        { error: 'Game already completed' },
        { status: 400 }
      );
    }
    
    // Process the answer
    const { updatedState, correct, reaction, correctAnswer } = processAnswer(
      gameState,
      selectedIndex
    );
    
    // Update game in memory
    activeGames.set(gameId, updatedState);
    
    // Check if game is complete
    if (updatedState.status === 'completed') {
      // Save to database
      await saveGameResult(user.id, updatedState);
      
      // Get end game reaction
      const endReaction = getGameEndReaction(updatedState.score, updatedState.totalQuestions);
      
      // Clean up memory
      activeGames.delete(gameId);
      
      return NextResponse.json({
        correct,
        correctAnswer,
        reaction,
        gameComplete: true,
        finalScore: updatedState.score,
        totalQuestions: updatedState.totalQuestions,
        endReaction,
        answers: updatedState.answers,
      });
    }
    
    // Get next question
    const nextQuestion = updatedState.questions[updatedState.currentQuestionIndex];
    
    return NextResponse.json({
      correct,
      correctAnswer,
      reaction,
      gameComplete: false,
      currentScore: updatedState.score,
      nextQuestion: {
        index: updatedState.currentQuestionIndex,
        question: nextQuestion.question,
        options: nextQuestion.options,
        difficulty: nextQuestion.difficulty,
      },
    });
    
  } catch (error) {
    console.error('Submit answer error:', error);
    return NextResponse.json(
      { error: 'Failed to submit answer' },
      { status: 500 }
    );
  }
}
