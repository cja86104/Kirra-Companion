/**
 * TRIVIA GAME API
 *
 * POST - Start a new game
 * PUT  - Submit an answer
 *
 * Game state is persisted in the `trivia_games` Supabase table so that
 * answers can be submitted to any serverless invocation, not just the one
 * that started the game. Rows expire after 1 hour automatically.
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

    // Create new game state
    const gameState = createGameState(companionId, category);

    // Persist to Supabase — safe across all serverless invocations
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
    const { error: insertError } = await supabase
      .from('trivia_games')
      .insert({
        id: gameState.gameId,
        user_id: user.id,
        companion_id: companionId,
        game_state: gameState as unknown as Record<string, unknown>,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error('Failed to persist trivia game:', insertError);
      return NextResponse.json(
        { error: 'Failed to start game' },
        { status: 500 }
      );
    }

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

    // Load game state from Supabase — ownership enforced by RLS + user_id check
    const { data: row, error: fetchError } = await supabase
      .from('trivia_games')
      .select('game_state, expires_at')
      .eq('id', gameId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !row) {
      return NextResponse.json(
        { error: 'Game not found or expired' },
        { status: 404 }
      );
    }

    // Treat expired rows as not found
    if (new Date(row.expires_at) < new Date()) {
      await supabase.from('trivia_games').delete().eq('id', gameId);
      return NextResponse.json(
        { error: 'Game not found or expired' },
        { status: 404 }
      );
    }

    const gameState = row.game_state as unknown as TriviaGameState;

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

    // Game complete — save result and remove the row
    if (updatedState.status === 'completed') {
      await saveGameResult(user.id, updatedState);

      await supabase
        .from('trivia_games')
        .delete()
        .eq('id', gameId);

      const endReaction = getGameEndReaction(updatedState.score, updatedState.totalQuestions);

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

    // Game still in progress — persist updated state
    const { error: updateError } = await supabase
      .from('trivia_games')
      .update({ game_state: updatedState as unknown as Record<string, unknown> })
      .eq('id', gameId);

    if (updateError) {
      console.error('Failed to update trivia game state:', updateError);
      return NextResponse.json(
        { error: 'Failed to save answer' },
        { status: 500 }
      );
    }

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
