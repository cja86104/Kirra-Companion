/**
 * Manual Life Simulation Trigger
 * 
 * POST /api/companion/[id]/simulate
 * 
 * Manually triggers a life simulation tick for a specific companion.
 * Use this to test the life simulation system without waiting for cron.
 * 
 * In production, the cron runs every 2 hours automatically.
 * In dev mode, use this endpoint to generate activities and life events.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  runSimulationTick, 
  DEFAULT_SIMULATION_CONFIG,
  getSimulationState,
  getCompanionMood,
} from '@/lib/companion/life-simulation';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companionId } = await params;
    
    const supabase = await createClient();
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify companion belongs to user
    const { data: companion, error: companionError } = await supabase
      .from('companions')
      .select('id, name, is_active, is_archived')
      .eq('id', companionId)
      .eq('user_id', user.id)
      .single();
    
    if (companionError || !companion) {
      return NextResponse.json({ error: 'Companion not found' }, { status: 404 });
    }
    
    if (companion.is_archived) {
      return NextResponse.json({ error: 'Companion is archived' }, { status: 400 });
    }
    
    // Get current state before simulation
    const stateBefore = await getSimulationState(companionId);
    const moodBefore = await getCompanionMood(companionId);
    
    // Run simulation tick with overrides for testing
    // Force it to run even if not due yet
    const testConfig = {
      ...DEFAULT_SIMULATION_CONFIG,
      activity_frequency_hours: 0, // Allow immediate simulation
    };
    
    console.log(`[Manual Sim] Running for ${companion.name}...`);
    
    const result = await runSimulationTick(companionId, testConfig);
    
    // Get state after simulation
    const stateAfter = await getSimulationState(companionId);
    const moodAfter = await getCompanionMood(companionId);
    
    return NextResponse.json({
      success: true,
      companion: {
        id: companion.id,
        name: companion.name,
      },
      simulation: {
        activity_generated: !!result.activity,
        activity: result.activity ? {
          name: result.activity.activity_name,
          category: result.activity.activity_category,
          description: result.activity.description,
          outcome: result.activity.outcome,
        } : null,
        event_generated: !!result.event,
        event: result.event ? {
          type: result.event.event_type,
          title: result.event.title,
          description: result.event.description,
        } : null,
        mood_changed: result.moodChanged,
        thought_of_user: result.thoughtOfUser,
      },
      mood: {
        before: moodBefore,
        after: moodAfter,
      },
      state: {
        before: stateBefore,
        after: stateAfter,
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Manual simulation error:', error);
    return NextResponse.json(
      { 
        error: 'Simulation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/companion/[id]/simulate
 * 
 * Get current simulation state for debugging
 */
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify companion belongs to user
    const { data: companion } = await supabase
      .from('companions')
      .select('id, name')
      .eq('id', companionId)
      .eq('user_id', user.id)
      .single();
    
    if (!companion) {
      return NextResponse.json({ error: 'Companion not found' }, { status: 404 });
    }
    
    // Get current state and mood
    const state = await getSimulationState(companionId);
    const mood = await getCompanionMood(companionId);
    
    // Get recent activities
    const { data: recentActivities } = await supabase
      .from('companion_activities')
      .select('*')
      .eq('companion_id', companionId)
      .order('started_at', { ascending: false })
      .limit(5);
    
    // Get recent life events
    const { data: recentEvents } = await supabase
      .from('life_events')
      .select('*')
      .eq('companion_id', companionId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    return NextResponse.json({
      companion: {
        id: companion.id,
        name: companion.name,
      },
      simulation_state: state,
      current_mood: mood,
      recent_activities: recentActivities || [],
      recent_life_events: recentEvents || [],
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Get simulation state error:', error);
    return NextResponse.json(
      { error: 'Failed to get simulation state' },
      { status: 500 }
    );
  }
}
