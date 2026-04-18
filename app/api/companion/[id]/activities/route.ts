import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  runSimulationTick,
  getSimulationState,
  getCompanionMood,
  DEFAULT_SIMULATION_CONFIG,
} from '@/lib/companion/life-simulation';
import { getCompanionRoutine } from '@/lib/companion/daily-routine';
import type {
  CompanionActivity,
  ActivitiesResponse,
  ActivityCategory,
} from '@/types/life-simulation';

/**
 * GET /api/companion/[id]/activities
 * 
 * Retrieve activities for a companion.
 * 
 * Query params:
 * - limit: number of activities (default 20, max 100)
 * - cursor: pagination cursor
 * - category: filter by category
 * - from: ISO date for start
 * - to: ISO date for end
 * - thinking_of_user: filter activities where they thought of user
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companionId } = await params;
    const { searchParams } = new URL(request.url);
    
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '20'));
    const cursor = searchParams.get('cursor');
    const category = searchParams.get('category') as ActivityCategory | null;
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');
    const thinkingOfUser = searchParams.get('thinking_of_user');
    
    const supabase = await createClient();
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Verify companion ownership
    const { data: companion } = await supabase
      .from('companions')
      .select('id, user_id')
      .eq('id', companionId)
      .eq('user_id', user.id)
      .single();
    
    if (!companion) {
      return NextResponse.json(
        { error: 'Companion not found' },
        { status: 404 }
      );
    }
    
    // Build query
    let query = supabase.from('companion_activities')
      .select('*', { count: 'exact' })
      .eq('companion_id', companionId)
      .order('started_at', { ascending: false });

    // Apply filters
    if (category) {
      query = query.eq('activity_category', category);
    }
    
    if (fromDate) {
      query = query.gte('started_at', fromDate);
    }
    
    if (toDate) {
      query = query.lte('started_at', toDate);
    }
    
    if (thinkingOfUser === 'true') {
      query = query.eq('thinking_of_user', true);
    }
    
    // Apply cursor pagination
    if (cursor) {
      const { data: cursorActivity } = await supabase.from('companion_activities')
        .select('started_at')
        .eq('id', cursor)
        .single();
      
      if (cursorActivity) {
        query = query.lt('started_at', cursorActivity.started_at);
      }
    }
    
    query = query.limit(limit + 1);
    
    const { data: activities, count, error } = await query;
    
    if (error) {
      console.error('Error fetching activities:', error);
      return NextResponse.json(
        { error: 'Failed to fetch activities' },
        { status: 500 }
      );
    }
    
    // Check for more results
    const hasMore = activities && activities.length > limit;
    const resultActivities = hasMore ? activities.slice(0, limit) : (activities || []);
    const nextCursor = hasMore ? resultActivities[resultActivities.length - 1]?.id : null;
    
    // Get current activity (one that hasn't ended yet)
    const { data: currentActivity } = await supabase
      .from('companion_activities')
      .select('*')
      .eq('companion_id', companionId)
      .is('ended_at', null)
      .single();
    
    // Count today's activities
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: todayCount } = await supabase
      .from('companion_activities')
      .select('id', { count: 'exact', head: true })
      .eq('companion_id', companionId)
      .gte('started_at', today.toISOString());
    
    const response: ActivitiesResponse = {
      activities: resultActivities as CompanionActivity[],
      current_activity: currentActivity as CompanionActivity | null,
      activities_today: todayCount || 0,
      total: count || 0,
      hasMore,
      cursor: nextCursor,
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Activities API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

const ActivitiesPostSchema = z.object({
  force: z.boolean().optional().default(false),
});

/**
 * POST /api/companion/[id]/activities
 *
 * Trigger a new activity simulation.
 * Can be called manually or by cron job.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companionId } = await params;
    const rawBody: unknown = await request.json().catch(() => ({}));
    const parseResult = ActivitiesPostSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { force } = parseResult.data;
    
    const supabase = await createClient();
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Verify companion ownership
    const { data: companion } = await supabase
      .from('companions')
      .select('id, user_id')
      .eq('id', companionId)
      .eq('user_id', user.id)
      .single();
    
    if (!companion) {
      return NextResponse.json(
        { error: 'Companion not found' },
        { status: 404 }
      );
    }
    
    // Get simulation state
    const state = await getSimulationState(companionId);
    
    if (!state) {
      return NextResponse.json(
        { error: 'Could not get simulation state' },
        { status: 500 }
      );
    }
    
    // Check if simulation is needed
    const lastSim = new Date(state.last_simulation_at);
    const hoursSinceLastSim = (Date.now() - lastSim.getTime()) / (1000 * 60 * 60);
    
    if (!force && hoursSinceLastSim < DEFAULT_SIMULATION_CONFIG.activity_frequency_hours) {
      return NextResponse.json({
        success: false,
        message: 'Simulation not needed yet',
        next_simulation_at: state.next_scheduled_at,
        hours_until_next: DEFAULT_SIMULATION_CONFIG.activity_frequency_hours - hoursSinceLastSim,
      });
    }
    
    // Run simulation
    const result = await runSimulationTick(companionId);
    
    if (!result.activity) {
      return NextResponse.json({
        success: false,
        message: 'No activity generated (companion may be sleeping or at daily limit)',
        is_sleeping: state.is_sleeping,
        activities_today: state.activities_today,
      });
    }
    
    // Get updated mood
    const mood = await getCompanionMood(companionId);
    
    return NextResponse.json({
      success: true,
      activity: result.activity,
      event: result.event,
      mood_changed: result.moodChanged,
      thought_of_user: result.thoughtOfUser,
      current_mood: mood,
    });
    
  } catch (error) {
    console.error('Activities POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/companion/[id]/activities
 * 
 * Get activity stats and summary.
 */
export async function PUT(
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
    
    // Verify companion ownership
    const { data: companion } = await supabase
      .from('companions')
      .select('id, user_id, current_mood')
      .eq('id', companionId)
      .eq('user_id', user.id)
      .single() as unknown as { data: { id: string; user_id: string; current_mood: unknown } | null };
    
    if (!companion) {
      return NextResponse.json(
        { error: 'Companion not found' },
        { status: 404 }
      );
    }
    
    // Get simulation state
    const state = await getSimulationState(companionId);
    
    // Get routine
    const routine = await getCompanionRoutine(companionId);
    
    // Get activity counts by category (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const { data: weeklyActivities } = await supabase.from('companion_activities')
      .select('activity_category')
      .eq('companion_id', companionId)
      .gte('started_at', weekAgo.toISOString());
    
    // Count by category
    const categoryCounts: Record<string, number> = {};
    for (const activity of weeklyActivities || []) {
      const cat = activity.activity_category;
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }

    // Get total activity count
    const { count: totalCount } = await supabase.from('companion_activities')
      .select('id', { count: 'exact', head: true })
      .eq('companion_id', companionId);

    // Get thoughts of user count
    const { count: thoughtsCount } = await supabase.from('companion_activities')
      .select('id', { count: 'exact', head: true })
      .eq('companion_id', companionId)
      .eq('thinking_of_user', true);
    
    return NextResponse.json({
      simulation_state: state,
      routine: routine ? {
        name: routine.name,
        energy_pattern: routine.energy_pattern,
        wake_time: routine.wake_time,
        sleep_time: routine.sleep_time,
        social_windows: routine.social_windows,
      } : null,
      current_mood: companion.current_mood,
      stats: {
        total_activities: totalCount || 0,
        weekly_activities: weeklyActivities?.length || 0,
        category_breakdown: categoryCounts,
        times_thought_of_user: thoughtsCount || 0,
        thought_percentage: totalCount 
          ? Math.round(((thoughtsCount || 0) / totalCount) * 100) 
          : 0,
      },
    });
    
  } catch (error) {
    console.error('Activities PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
