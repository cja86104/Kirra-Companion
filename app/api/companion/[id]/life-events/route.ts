import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { LifeEvent, LifeEventsResponse, EventSignificance } from '@/types/life-simulation';

/**
 * GET /api/companion/[id]/life-events
 * 
 * Retrieve life events for a companion.
 * Supports filtering, pagination, and sorting.
 * 
 * Query params:
 * - limit: number of events to return (default 20, max 100)
 * - cursor: pagination cursor (event ID)
 * - significance: filter by significance level
 * - type: filter by event type
 * - involves_user: filter events involving user (true/false)
 * - shareable: filter shareable events (true/false)
 * - from: ISO date string for start date
 * - to: ISO date string for end date
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
    const significance = searchParams.get('significance') as EventSignificance | null;
    const eventType = searchParams.get('type');
    const involvesUser = searchParams.get('involves_user');
    const shareable = searchParams.get('shareable');
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');
    
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
    let query = (supabase.from('life_events') as any)
      .select('*', { count: 'exact' })
      .eq('companion_id', companionId)
      .order('occurred_at', { ascending: false });
    
    // Apply filters
    if (significance) {
      query = query.eq('significance', significance);
    }
    
    if (eventType) {
      query = query.eq('event_type', eventType);
    }
    
    if (involvesUser === 'true') {
      query = query.eq('involves_user', true);
    } else if (involvesUser === 'false') {
      query = query.eq('involves_user', false);
    }
    
    if (shareable === 'true') {
      query = query.eq('shareable', true);
    }
    
    if (fromDate) {
      query = query.gte('occurred_at', fromDate);
    }
    
    if (toDate) {
      query = query.lte('occurred_at', toDate);
    }
    
    // Apply cursor pagination
    if (cursor) {
      const { data: cursorEvent } = await ((supabase.from('life_events') as any)
        .select('occurred_at')
        .eq('id', cursor)
        .single()) as { data: { occurred_at: string } | null };
      
      if (cursorEvent) {
        query = query.lt('occurred_at', cursorEvent.occurred_at);
      }
    }
    
    // Execute query with limit + 1 to check for more
    query = query.limit(limit + 1);
    
    const { data: events, count, error } = await query;
    
    if (error) {
      console.error('Error fetching life events:', error);
      return NextResponse.json(
        { error: 'Failed to fetch life events' },
        { status: 500 }
      );
    }
    
    // Check if there are more results
    const hasMore = events && events.length > limit;
    const resultEvents = hasMore ? events.slice(0, limit) : (events || []);
    const nextCursor = hasMore ? resultEvents[resultEvents.length - 1]?.id : null;
    
    const response: LifeEventsResponse = {
      events: resultEvents as LifeEvent[],
      total: count || 0,
      hasMore,
      cursor: nextCursor,
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Life events API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/companion/[id]/life-events
 * 
 * Mark a life event as shared with user.
 * Called when the companion mentions an event in conversation.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companionId } = await params;
    const body = await request.json();
    const { eventId, action } = body;
    
    if (!eventId) {
      return NextResponse.json(
        { error: 'eventId is required' },
        { status: 400 }
      );
    }
    
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
    
    // Verify event belongs to companion
    const { data: event } = await supabase
      .from('life_events')
      .select('id, companion_id, shareable')
      .eq('id', eventId)
      .eq('companion_id', companionId)
      .single();
    
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }
    
    if (action === 'mark_shared') {
      // Mark as shared with user
      const { error: updateError } = await ((supabase.from('life_events') as any)
        .update({
          shared_with_user: true,
          shared_at: new Date().toISOString(),
        })
        .eq('id', eventId));
      
      if (updateError) {
        console.error('Error marking event as shared:', updateError);
        return NextResponse.json(
          { error: 'Failed to update event' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        message: 'Event marked as shared',
      });
    }
    
    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Life events POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/companion/[id]/life-events
 * 
 * Delete old life events (cleanup).
 * Only deletes events older than specified days.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companionId } = await params;
    const { searchParams } = new URL(request.url);
    const olderThanDays = parseInt(searchParams.get('older_than_days') || '90');
    
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
    
    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    // Delete old minor events only (keep notable and above)
    const { error: deleteError, count } = await supabase
      .from('life_events')
      .delete({ count: 'exact' })
      .eq('companion_id', companionId)
      .lt('occurred_at', cutoffDate.toISOString())
      .in('significance', ['minor', 'normal']);
    
    if (deleteError) {
      console.error('Error deleting old events:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete events' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      deleted: count || 0,
      message: `Deleted ${count || 0} events older than ${olderThanDays} days`,
    });
    
  } catch (error) {
    console.error('Life events DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
