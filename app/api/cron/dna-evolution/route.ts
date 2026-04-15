/**
 * DNA Evolution Cron Endpoint
 * 
 * Called periodically (recommended: every 12 hours) to evolve companion DNA.
 * This is what makes companions become unique over time.
 * 
 * What it does:
 * - Analyzes recent conversations for each companion
 * - Extracts unique phrases and speech patterns
 * - Tracks humor that resonates with the user
 * - Updates emotional tendencies
 * - Evolves learning/explanation styles
 * - Adjusts memory weighting preferences
 * 
 * Security: Protected by cron secret header
 * 
 * Vercel Cron Config (add to vercel.json):
 * {
 *   "crons": [
 *     {
 *       "path": "/api/cron/dna-evolution",
 *       "schedule": "0 0,12 * * *"
 *     }
 *   ]
 * }
 * 
 * Note: "0 0,12 * * *" runs at midnight and noon (every 12 hours)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  evolveCompanionDNA,
  isEvolutionDue,
} from '@/lib/companion/dna-evolution';

// Use service role for cron operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// ============================================================================
// TYPES
// ============================================================================

interface EvolutionResult {
  companion_id: string;
  companion_name: string;
  evolved: boolean;
  version?: number;
  phrases_added?: number;
  reason?: string;
}

// ============================================================================
// POST - Run DNA evolution for companions
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
    
    const body = await request.json().catch(() => ({}));
    const { 
      companion_id,     // Optional: specific companion to evolve
      batch_size = 50,  // Max companions per run
      hours_back = 24,  // Hours of conversation to analyze
      min_messages = 10, // Minimum messages required
      force = false,    // Force evolution even if not due
      dry_run = false,  // Analyze but don't save
    } = body as {
      companion_id?: string;
      batch_size?: number;
      hours_back?: number;
      min_messages?: number;
      force?: boolean;
      dry_run?: boolean;
    };
    
    const results: EvolutionResult[] = [];
    const startTime = Date.now();
    
    if (companion_id) {
      // Evolve specific companion
      const result = await processCompanionEvolution(
        companion_id,
        'Specific Companion',
        { hours_back, min_messages, force, dry_run }
      );
      results.push(result);
    } else {
      // Get all active companions with recent activity
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: companions, error } = await supabaseAdmin
        .from('companions')
        .select(`
          id,
          name,
          last_interaction,
          companion_dna (
            personality_version,
            last_evolution
          )
        `)
                .gte('last_interaction', twentyFourHoursAgo)
        .limit(batch_size);
      
      if (error) {
        console.error('Error fetching companions for DNA evolution:', error);
        return NextResponse.json(
          { error: 'Failed to fetch companions' },
          { status: 500 }
        );
      }
      
      // Process each companion
      for (const companion of companions || []) {
        try {
          // Check if evolution is due (every 12 hours minimum)
          const isDue = force || await isEvolutionDue(companion.id, 12);
          
          if (!isDue) {
            results.push({
              companion_id: companion.id,
              companion_name: companion.name,
              evolved: false,
              reason: 'Evolution not due yet',
            });
            continue;
          }
          
          const result = await processCompanionEvolution(
            companion.id,
            companion.name,
            { hours_back, min_messages, force, dry_run }
          );
          results.push(result);
          
          // Small delay between companions to avoid overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (err) {
          console.error(`Error evolving companion ${companion.id}:`, err);
          results.push({
            companion_id: companion.id,
            companion_name: companion.name,
            evolved: false,
            reason: `Error: ${err instanceof Error ? err.message : 'Unknown'}`,
          });
        }
      }
    }
    
    // Calculate summary
    const elapsed = Date.now() - startTime;
    const summary = {
      total_processed: results.length,
      evolved: results.filter(r => r.evolved).length,
      skipped: results.filter(r => !r.evolved && r.reason?.includes('not due')).length,
      not_enough_data: results.filter(r => !r.evolved && r.reason?.includes('messages')).length,
      failed: results.filter(r => !r.evolved && r.reason?.includes('Error')).length,
      total_phrases_added: results.reduce((sum, r) => sum + (r.phrases_added || 0), 0),
      elapsed_ms: elapsed,
    };
    
    console.log(`DNA Evolution cron completed: ${summary.evolved} companions evolved`);
    
    return NextResponse.json({
      success: true,
      summary,
      results,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('DNA Evolution cron error:', error);
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
    // Verify authorization
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
    
    // Check if this is just a status check
    const { searchParams } = new URL(request.url);
    if (searchParams.get('status') === 'true') {
      return await getEvolutionStatus();
    }
    
    // Run the evolution (same as POST with defaults)
    const results: EvolutionResult[] = [];
    const startTime = Date.now();
    
    // Get companions with recent activity
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: companions, error } = await supabaseAdmin
      .from('companions')
      .select(`
        id,
        name,
        last_interaction,
        companion_dna (
          personality_version,
          last_evolution
        )
      `)
            .gte('last_interaction', twentyFourHoursAgo)
      .limit(50);
    
    if (error) {
      console.error('Error fetching companions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch companions' },
        { status: 500 }
      );
    }
    
    // Process each companion
    for (const companion of companions || []) {
      try {
        const isDue = await isEvolutionDue(companion.id, 12);
        
        if (!isDue) {
          results.push({
            companion_id: companion.id,
            companion_name: companion.name,
            evolved: false,
            reason: 'Evolution not due yet',
          });
          continue;
        }
        
        const result = await processCompanionEvolution(
          companion.id,
          companion.name,
          { hours_back: 24, min_messages: 10, force: false, dry_run: false }
        );
        results.push(result);
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (err) {
        console.error(`Error evolving companion ${companion.id}:`, err);
        results.push({
          companion_id: companion.id,
          companion_name: companion.name,
          evolved: false,
          reason: `Error: ${err instanceof Error ? err.message : 'Unknown'}`,
        });
      }
    }
    
    const elapsed = Date.now() - startTime;
    const summary = {
      total_processed: results.length,
      evolved: results.filter(r => r.evolved).length,
      skipped: results.filter(r => !r.evolved && r.reason?.includes('not due')).length,
      not_enough_data: results.filter(r => !r.evolved && r.reason?.includes('messages')).length,
      failed: results.filter(r => !r.evolved && r.reason?.includes('Error')).length,
      elapsed_ms: elapsed,
    };
    
    console.log(`DNA Evolution cron (GET) completed: ${summary.evolved} companions evolved`);
    
    return NextResponse.json({
      success: true,
      summary,
      results,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('DNA Evolution cron error:', error);
    return NextResponse.json(
      { 
        status: 'error',
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Process evolution for a single companion
 */
async function processCompanionEvolution(
  companionId: string,
  companionName: string,
  options: {
    hours_back: number;
    min_messages: number;
    force: boolean;
    dry_run: boolean;
  }
): Promise<EvolutionResult> {
  const analysis = await evolveCompanionDNA(companionId, {
    hoursBack: options.hours_back,
    minMessages: options.min_messages,
    forceEvolution: options.force,
  });
  
  if (!analysis) {
    return {
      companion_id: companionId,
      companion_name: companionName,
      evolved: false,
      reason: `Not enough messages (need ${options.min_messages}+)`,
    };
  }
  
  // Get updated version number
  const { data: dna } = await supabaseAdmin
    .from('companion_dna')
    .select('personality_version')
    .eq('companion_id', companionId)
    .single();
  
  return {
    companion_id: companionId,
    companion_name: companionName,
    evolved: true,
    version: dna?.personality_version || 1,
    phrases_added: analysis.dialectEvolution?.newPhrases.length || 0,
  };
}

/**
 * Get evolution status for monitoring
 */
async function getEvolutionStatus() {
  // Get stats about DNA evolution
  const { data: dnaStats } = await supabaseAdmin
    .from('companion_dna')
    .select('personality_version, last_evolution')
    .order('last_evolution', { ascending: false })
    .limit(100);
  
  const now = Date.now();
  const last24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const last7d = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  
  const stats = {
    total_companions_with_dna: dnaStats?.length || 0,
    evolved_last_24h: dnaStats?.filter(d => d.last_evolution && d.last_evolution > last24h).length || 0,
    evolved_last_7d: dnaStats?.filter(d => d.last_evolution && d.last_evolution > last7d).length || 0,
    never_evolved: dnaStats?.filter(d => !d.last_evolution).length || 0,
    average_version: dnaStats && dnaStats.length > 0
      ? Math.round(dnaStats.reduce((sum, d) => sum + (d.personality_version || 0), 0) / dnaStats.length * 10) / 10
      : 0,
    highest_version: dnaStats && dnaStats.length > 0
      ? Math.max(...dnaStats.map(d => d.personality_version || 0))
      : 0,
  };
  
  return NextResponse.json({
    status: 'healthy',
    stats,
    timestamp: new Date().toISOString(),
  });
}
