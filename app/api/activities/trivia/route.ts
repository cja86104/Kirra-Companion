/**
 * TRIVIA GAME API
 *
 * POST - Start a new game
 * PUT  - Submit an answer
 *
 * Game state is persisted in Supabase (trivia_games table) so it survives
 * across Vercel serverless invocations. Games expire after 1 hour via the
 * expires_at column and the cleanup_expired_trivia_games() DB function.
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

// Type shim for the untyped trivia_games table (types regenerate after supabase db pull)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

// ============================================================
// POST - Start New Game
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      return NextResponse.json({ error: 'Companion not found' }, { status: 404 });
    }

    // Create game state
    const gameState = createGameState(companionId, category);

    // Persist to Supabase — trivia_games: id TEXT, user_id UUID, companion_id UUID, game_state JSONB
    const db = supabase as AnySupabase;
    const { error: insertError } = await db
      .from('trivia_games')
      .insert({
        id: gameState.gameId,
        user_id: user.id,
        companion_id: companionId,
        game_state: gameState,
      });

    if (insertError) {
      console.error('Failed to persist trivia game:', insertError);
      return NextResponse.json({ error: 'Failed to start game' }, { status: 500 });
    }

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
    return NextResponse.json({ error: 'Failed to start game' }, { status: 500 });
  }
}

// ============================================================
// PUT - Submit Answer
// ============================================================

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    const db = supabase as AnySupabase;

    // Load game — enforce ownership and expiry
    const { data: row, error: fetchError } = await db
      .from('trivia_games')
      .select('game_state')
      .eq('id', gameId)
      .eq('user_id', user.id)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (fetchError || !row) {
      return NextResponse.json({ error: 'Game not found or expired' }, { status: 404 });
    }

    const gameState = (row as { game_state: TriviaGameState }).game_state;

    if (gameState.status === 'completed') {
      return NextResponse.json({ error: 'Game already completed' }, { status: 400 });
    }

    // Process the answer
    const { updatedState, correct, reaction, correctAnswer } = processAnswer(
      gameState,
      selectedIndex
    );

    if (updatedState.status === 'completed') {
      // Save full result to history
      await saveGameResult(user.id, updatedState);

      // Delete the active game row
      await db.from('trivia_games').delete().eq('id', gameId);

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
    const { error: updateError } = await db
      .from('trivia_games')
      .update({ game_state: updatedState })
      .eq('id', gameId);

    if (updateError) {
      console.error('Failed to update trivia game state:', updateError);
      return NextResponse.json({ error: 'Failed to save answer' }, { status: 500 });
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
    return NextResponse.json({ error: 'Failed to submit answer' }, { status: 500 });
  }
}
