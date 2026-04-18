/**
 * Life Simulation Cron Endpoint
 * 
 * Runs the autonomous life simulation for all active companions.
 * Generates activities, life events, mood changes, and "thought of user" moments.
 * 
 * This is what makes companions feel ALIVE 24/7 even when not chatting.
 * 
 * Schedule: Every 2 hours (configured in vercel.json)
 * Security: Protected by cron secret header
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import {
  runSimulationTick,
  DEFAULT_SIMULATION_CONFIG
} from '@/lib/companion/life-simulation';

// Use service role for cron operations — lazy factory to avoid module-level env var access at build time
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

const LifeSimBodySchema = z.object({
  companion_id: z.string().uuid().optional(),
  batch_size: z.number().int().positive().max(500).optional().default(50),
  dry_run: z.boolean().optional().default(false),
});

// ============================================================================
// POST - Run life simulation for specific companion(s)
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const rawBody: unknown = await request.json().catch(() => ({}));
    const parseResult = LifeSimBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { companion_id, batch_size, dry_run } = parseResult.data;
    
    const results: {
      companion_id: string;
      simulated: boolean;
      activity_generated: boolean;
      event_generated: boolean;
      thought_of_user: boolean;
      error?: string;
    }[] = [];
    
    if (companion_id) {
      // Simulate specific companion
      if (dry_run) {
        results.push({
          companion_id,
          simulated: false,
          activity_generated: false,
          event_generated: false,
          thought_of_user: false,
          error: 'Dry run - no simulation performed',
        });
      } else {
        try {
          const result = await runSimulationTick(companion_id, DEFAULT_SIMULATION_CONFIG);
          results.push({
            companion_id,
            simulated: true,
            activity_generated: !!result.activity,
            event_generated: !!result.event,
            thought_of_user: result.thoughtOfUser,
          });
        } catch (err) {
          results.push({
            companion_id,
            simulated: false,
            activity_generated: false,
            event_generated: false,
            thought_of_user: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }
    } else {
      // Get all active companions
      const { data: companions, error } = await getSupabaseAdmin()
        .from('companions')
        .select('id, name, is_active')
        .eq('is_active', true)
        .limit(batch_size);
      
      if (error) {
        console.error('Error fetching companions for life simulation:', error);
        return NextResponse.json(
          { error: 'Failed to fetch companions' },
          { status: 500 }
        );
      }
      
      console.log(`[Life Simulation] Processing ${companions?.length || 0} companions`);
      
      // Process each companion
      for (const companion of companions || []) {
        try {
          if (dry_run) {
            results.push({
              companion_id: companion.id,
              simulated: false,
              activity_generated: false,
              event_generated: false,
              thought_of_user: false,
              error: 'Dry run',
            });
          } else {
            const result = await runSimulationTick(companion.id, DEFAULT_SIMULATION_CONFIG);
            
            results.push({
              companion_id: companion.id,
              simulated: true,
              activity_generated: !!result.activity,
              event_generated: !!result.event,
              thought_of_user: result.thoughtOfUser,
            });
            
            if (result.activity) {
              console.log(`[Life Simulation] ${companion.name}: ${result.activity.activity_name}`);
            }
          }
        } catch (err) {
          console.error(`[Life Simulation] Error for ${companion.id}:`, err);
          results.push({
            companion_id: companion.id,
            simulated: false,
            activity_generated: false,
            event_generated: false,
            thought_of_user: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
        
        // Small delay between companions to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    // Summarize
    const summary = {
      total_processed: results.length,
      simulated: results.filter(r => r.simulated).length,
      activities_generated: results.filter(r => r.activity_generated).length,
      events_generated: results.filter(r => r.event_generated).length,
      thought_of_user: results.filter(r => r.thought_of_user).length,
      errors: results.filter(r => r.error).length,
    };
    
    console.log(`[Life Simulation] Complete: ${summary.activities_generated} activities, ${summary.events_generated} events`);
    
    return NextResponse.json({
      success: true,
      summary,
      results,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Life simulation cron error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - Called by Vercel Cron
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // Vercel cron sends the secret in x-vercel-cron-auth header
    const vercelCronAuth = request.headers.get('x-vercel-cron-auth');
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    const isAuthorized = 
      (cronSecret && vercelCronAuth === cronSecret) ||
      (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
      !cronSecret; // Allow if no secret configured (dev mode)
    
    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check for status query
    const { searchParams } = new URL(request.url);
    if (searchParams.get('status') === 'true') {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      // Get life events from last 24h
      const { count: eventsToday } = await getSupabaseAdmin()
        .from('life_events')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', twentyFourHoursAgo);
      
      // Get activities from last 24h
      const { count: activitiesToday } = await getSupabaseAdmin()
        .from('companion_activities')
        .select('id', { count: 'exact', head: true })
        .gte('started_at', twentyFourHoursAgo);
      
      // Get active companions
      const { count: activeCompanions } = await getSupabaseAdmin()
        .from('companions')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true);
      
      return NextResponse.json({
        status: 'healthy',
        stats: {
          life_events_24h: eventsToday || 0,
          activities_24h: activitiesToday || 0,
          active_companions: activeCompanions || 0,
        },
        timestamp: new Date().toISOString(),
      });
    }
    
    // Run full simulation
    console.log('[Life Simulation Cron] Starting...');
    
    const results: {
      companion_id: string;
      simulated: boolean;
      activity_generated: boolean;
      event_generated: boolean;
      thought_of_user: boolean;
      error?: string;
    }[] = [];
    
    // Get all active companions
    const { data: companions, error } = await getSupabaseAdmin()
      .from('companions')
      .select('id, name, is_active')
      .eq('is_active', true)
      .limit(100); // Process up to 100 companions per cron run
    
    if (error) {
      console.error('Error fetching companions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch companions' },
        { status: 500 }
      );
    }
    
    console.log(`[Life Simulation] Found ${companions?.length || 0} active companions`);
    
    // Process each companion
    for (const companion of companions || []) {
      try {
        const result = await runSimulationTick(companion.id, DEFAULT_SIMULATION_CONFIG);
        
        results.push({
          companion_id: companion.id,
          simulated: true,
          activity_generated: !!result.activity,
          event_generated: !!result.event,
          thought_of_user: result.thoughtOfUser,
        });
        
        if (result.activity) {
          console.log(`[Life Sim] ${companion.name}: ${result.activity.activity_name}`);
        }
        if (result.event) {
          console.log(`[Life Sim] ${companion.name} event: ${result.event.title}`);
        }
        
      } catch (err) {
        console.error(`[Life Simulation] Error for ${companion.name}:`, err);
        results.push({
          companion_id: companion.id,
          simulated: false,
          activity_generated: false,
          event_generated: false,
          thought_of_user: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
      
      // Small delay to avoid overwhelming the DB
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    const summary = {
      total_processed: results.length,
      simulated: results.filter(r => r.simulated).length,
      activities_generated: results.filter(r => r.activity_generated).length,
      events_generated: results.filter(r => r.event_generated).length,
      thought_of_user: results.filter(r => r.thought_of_user).length,
      errors: results.filter(r => r.error).length,
    };
    
    console.log(`[Life Simulation Cron] Complete:`, summary);
    
    return NextResponse.json({
      success: true,
      summary,
      results,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Life simulation cron error:', error);
    return NextResponse.json(
      { 
        status: 'error',
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
