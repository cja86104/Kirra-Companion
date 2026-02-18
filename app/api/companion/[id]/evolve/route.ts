/**
 * MANUAL DNA EVOLUTION API
 * 
 * Endpoints for manually triggering and monitoring DNA evolution.
 * 
 * GET  /api/companion/[id]/evolve - Get evolution status and history
 * POST /api/companion/[id]/evolve - Trigger manual evolution
 * 
 * Use cases:
 * - Testing evolution during development
 * - Admin tools to force evolution
 * - UI button to "train" companion faster
 * - Debugging evolution issues
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  evolveCompanionDNA,
  getEvolutionHistory,
  isEvolutionDue,
} from '@/lib/companion/dna-evolution';

// ============================================================================
// GET - Evolution Status
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companionId } = await params;
    const supabase = await createClient();

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user owns this companion
    const { data: companion } = await supabase
      .from('companions')
      .select('id, name, user_id, total_messages')
      .eq('id', companionId)
      .single();

    if (!companion || companion.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Companion not found' },
        { status: 404 }
      );
    }

    // Get DNA data
    const { data: dna } = await supabase
      .from('companion_dna')
      .select('*')
      .eq('companion_id', companionId)
      .single();

    if (!dna) {
      return NextResponse.json(
        { error: 'No DNA record found for companion' },
        { status: 404 }
      );
    }

    // Check if evolution is due
    const isDue = await isEvolutionDue(companionId, 1); // 1 hour for manual
    const isDueCron = await isEvolutionDue(companionId, 12); // 12 hours for cron

    // Extract key evolution metrics
    const dialect = (dna.communication_dialect || {}) as Record<string, string[]>;
    const evolutionStatus = {
      companionId,
      companionName: companion.name,
      totalMessages: companion.total_messages,

      // Evolution state
      personalityVersion: dna.personality_version || 0,
      lastEvolution: dna.last_evolution,
      canEvolveNow: isDue,
      nextCronEvolutionDue: isDueCron,

      // DNA summary
      dnaSummary: {
        uniquePhrases: dialect.uniquePhrases?.length || 0,
        favoriteExpressions: dialect.favoriteExpressions?.length || 0,
        speechPatterns: dialect.speechPatterns?.length || 0,
        humorStyles: Object.keys(dna.humor_genome || {}).filter(k => (dna.humor_genome as Record<string, number>)?.[k] > 0.6).length,
        emotionalTendencies: Object.keys(dna.emotional_resonance_map || {}).filter(k => (dna.emotional_resonance_map as Record<string, number>)?.[k] > 0.6).length,
        topicWeights: Object.keys(dna.memory_weighting_algorithm || {}).filter(k => k.startsWith('topic_')).length,
      },
      
      // Full DNA (for debugging)
      dna: {
        communication_dialect: dna.communication_dialect,
        humor_genome: dna.humor_genome,
        emotional_resonance_map: dna.emotional_resonance_map,
        learning_style_matrix: dna.learning_style_matrix,
        memory_weighting_algorithm: dna.memory_weighting_algorithm,
      },
      
      createdAt: dna.created_at,
      updatedAt: dna.updated_at,
    };

    return NextResponse.json(evolutionStatus);

  } catch (error) {
    console.error('Evolution status error:', error);
    return NextResponse.json(
      { error: 'Failed to get evolution status' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Trigger Evolution
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companionId } = await params;
    const supabase = await createClient();

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const {
      force = false,        // Skip cooldown check
      useAI = true,         // Use AI-powered analysis
      hoursBack = 24,       // How far back to analyze
      minMessages = 5,      // Minimum messages required
    } = body as {
      force?: boolean;
      useAI?: boolean;
      hoursBack?: number;
      minMessages?: number;
    };

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user owns this companion
    const { data: companion } = await supabase
      .from('companions')
      .select('id, name, user_id, total_messages')
      .eq('id', companionId)
      .single();

    if (!companion || companion.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Companion not found' },
        { status: 404 }
      );
    }

    // Check cooldown (unless forced)
    if (!force) {
      const isDue = await isEvolutionDue(companionId, 1); // 1 hour cooldown
      if (!isDue) {
        const history = await getEvolutionHistory(companionId);
        return NextResponse.json({
          success: false,
          evolved: false,
          reason: 'Evolution on cooldown (less than 1 hour since last evolution)',
          lastEvolution: history?.lastEvolution,
          suggestion: 'Use force=true to bypass cooldown',
        });
      }
    }

    // Check minimum messages
    if ((companion.total_messages ?? 0) < minMessages && !force) {
      return NextResponse.json({
        success: false,
        evolved: false,
        reason: `Not enough messages (${companion.total_messages} < ${minMessages} required)`,
        suggestion: 'Use force=true or lower minMessages to bypass',
      });
    }

    console.log(`[Manual Evolution] Starting for companion ${companionId} (${companion.name})`);
    const startTime = Date.now();

    // Run evolution
    const result = await evolveCompanionDNA(companionId, {
      hoursBack,
      minMessages,
      forceEvolution: force,
      useAI,
    });

    const elapsed = Date.now() - startTime;

    if (!result) {
      return NextResponse.json({
        success: false,
        evolved: false,
        reason: 'Evolution returned no result - possibly not enough conversation data',
        elapsed_ms: elapsed,
      });
    }

    // Get updated DNA for response
    const { data: updatedDna } = await supabase
      .from('companion_dna')
      .select('personality_version, communication_dialect, last_evolution')
      .eq('companion_id', companionId)
      .single();

    console.log(`[Manual Evolution] Complete for ${companion.name}: v${updatedDna?.personality_version}, AI=${result.aiAnalysisUsed}`);

    return NextResponse.json({
      success: true,
      evolved: true,
      companionName: companion.name,

      // Evolution results
      messagesAnalyzed: result.messagesAnalyzed,
      aiAnalysisUsed: result.aiAnalysisUsed,
      newVersion: updatedDna?.personality_version || 0,
      
      // What changed
      changes: {
        newPhrases: result.dialectEvolution?.newPhrases || [],
        speechPatterns: result.dialectEvolution?.speechPatternChanges || [],
        humorStylesUpdated: [
          ...result.humorEvolution?.successfulStyles || [],
          ...result.humorEvolution?.failedStyles?.map(s => `${s} (reduced)`) || [],
        ],
        emotionalChanges: result.emotionalEvolution?.expressionStyleChanges || [],
      },
      
      // Timing
      elapsed_ms: elapsed,
      timestamp: result.timestamp,
    });

  } catch (error) {
    console.error('Manual evolution error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to evolve companion' },
      { status: 500 }
    );
  }
}
