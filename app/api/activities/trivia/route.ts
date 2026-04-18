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
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  createGameState,
  processAnswer,
  getGameEndReaction,
  saveGameResult,
  type TriviaCategory,
  type TriviaGameState,
} from '@/lib/activities/trivia';

const TriviaStartSchema = z.object({
  companionId: z.string().uuid(),
  category: z.enum(['general', 'science', 'history', 'entertainment', 'sports', 'geography']),
});

const TriviaAnswerSchema = z.object({
  gameId: z.string().min(1).max(200),
  selectedIndex: z.number().int().min(0).max(3),
});

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

    const rawBody: unknown = await request.json();
    const parseResult = TriviaStartSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { companionId, category } = parseResult.data;

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
    const gameState = createGameState(companionId, category as TriviaCategory);

    // game_state and expires_at are not in generated trivia_games types (schema drift vs runtime table)
    const { error: insertError } = await supabase
      .from('trivia_games' as never)
      .insert({
        id: gameState.gameId,
        user_id: user.id,
        companion_id: companionId,
        game_state: gameState,
      } as never);

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

    const rawBody: unknown = await request.json();
    const parseResult = TriviaAnswerSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { gameId, selectedIndex } = parseResult.data;

    // Load game — enforce ownership and expiry
    const { data: row, error: fetchError } = await supabase
      .from('trivia_games' as never)
      .select('game_state')
      .eq('id', gameId)
      .eq('user_id', user.id)
      .gt('expires_at', new Date().toISOString())
      .single() as unknown as { data: { game_state: TriviaGameState } | null; error: Error | null };

    if (fetchError || !row) {
      return NextResponse.json({ error: 'Game not found or expired' }, { status: 404 });
    }

    const gameState = row.game_state;

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
      await supabase.from('trivia_games' as never).delete().eq('id', gameId);

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
      .from('trivia_games' as never)
      .update({ game_state: updatedState } as never)
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
