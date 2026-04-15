/**
 * Proactive Check Cron Endpoint
 * 
 * Called periodically to check all active companions for proactive messaging opportunities.
 * Should be triggered by a cron service (Vercel Cron, Supabase pg_cron, etc.)
 * 
 * Security: Protected by cron secret header
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  processProactiveCheck,
  expireOldMessages,
} from '@/lib/companion/proactive-messaging';

// Use service role for cron operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// ============================================================================
// POST - Run proactive check for all companions
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
      companion_id,  // Optional: specific companion
      batch_size = 50,
      dry_run = false,
    } = body as {
      companion_id?: string;
      batch_size?: number;
      dry_run?: boolean;
    };
    
    const results: {
      companion_id: string;
      checked: boolean;
      sent: boolean;
      reason?: string;
    }[] = [];
    
    // First, expire old pending messages
    const expiredCount = await expireOldMessages(24);
    
    if (companion_id) {
      // Check specific companion
      if (dry_run) {
        results.push({
          companion_id,
          checked: true,
          sent: false,
          reason: 'Dry run - no message sent',
        });
      } else {
        const result = await processProactiveCheck(companion_id);
        results.push({
          companion_id,
          ...result,
        });
      }
    } else {
      // Get all active companions that are due for a proactive check
      // Get companions with their simulation states
      const { data: companions, error } = await supabaseAdmin
        .from('companions')
        .select(`
          id,
          user_id,
          simulation_states!simulation_states_companion_id_fkey (
            last_proactive_message_at,
            next_scheduled_at
          )
        `)
        .limit(batch_size);
      
      if (error) {
        console.error('Error fetching companions for proactive check:', error);
        return NextResponse.json(
          { error: 'Failed to fetch companions' },
          { status: 500 }
        );
      }
      
      // Filter to companions that are due for a check
      const now = new Date();
      const eligibleCompanions = (companions || []).filter(c => {
        const simState = Array.isArray(c.simulation_states) 
          ? c.simulation_states[0] 
          : c.simulation_states;
        
        if (!simState) return true; // No simulation state yet
        
        // Check if scheduled time has passed
        if (simState.next_scheduled_at) {
          const scheduledAt = new Date(simState.next_scheduled_at);
          if (scheduledAt > now) return false;
        }
        
        return true;
      });
      
      // Process each eligible companion
      for (const companion of eligibleCompanions) {
        try {
          if (dry_run) {
            results.push({
              companion_id: companion.id,
              checked: true,
              sent: false,
              reason: 'Dry run - no message sent',
            });
          } else {
            const result = await processProactiveCheck(companion.id);
            results.push({
              companion_id: companion.id,
              ...result,
            });
          }
        } catch (err) {
          console.error(`Error processing companion ${companion.id}:`, err);
          results.push({
            companion_id: companion.id,
            checked: false,
            sent: false,
            reason: `Error: ${err instanceof Error ? err.message : 'Unknown'}`,
          });
        }
        
        // Small delay between companions to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Summarize results
    const summary = {
      total_checked: results.length,
      messages_sent: results.filter(r => r.sent).length,
      failed: results.filter(r => !r.checked).length,
      expired_messages: expiredCount,
    };
    
    return NextResponse.json({
      success: true,
      summary,
      results,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Proactive cron error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - Called by Vercel Cron - runs the proactive check
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // Vercel cron sends the secret in x-vercel-cron-auth header
    // Also check authorization header for manual calls
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
    
    // Check if this is just a status check (query param)
    const { searchParams } = new URL(request.url);
    if (searchParams.get('status') === 'true') {
      // Return status only
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { count: sentToday } = await supabaseAdmin
        .from('proactive_messages')
        .select('id', { count: 'exact', head: true })
        .gte('sent_at', twentyFourHoursAgo);
      
      const { count: pendingCount } = await supabaseAdmin
        .from('proactive_messages')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      const { count: activeCompanions } = await supabaseAdmin
        .from('companions')
        .select('id', { count: 'exact', head: true });
      
      return NextResponse.json({
        status: 'healthy',
        stats: {
          messages_sent_24h: sentToday || 0,
          pending_messages: pendingCount || 0,
          active_companions: activeCompanions || 0,
        },
        timestamp: new Date().toISOString(),
      });
    }
    
    // Run the proactive check (same as POST but with defaults)
    const results: {
      companion_id: string;
      checked: boolean;
      sent: boolean;
      reason?: string;
    }[] = [];
    
    // First, expire old pending messages
    const expiredCount = await expireOldMessages(24);
    
    // Get all active companions that need checking
    const { data: companions, error } = await supabaseAdmin
      .from('companions')
      .select(`
        id,
        user_id,
        simulation_states!simulation_states_companion_id_fkey (
          last_proactive_message_at,
          next_scheduled_at
        )
      `)
      .limit(50);
    
    if (error) {
      console.error('Error fetching companions for proactive check:', error);
      return NextResponse.json(
        { error: 'Failed to fetch companions' },
        { status: 500 }
      );
    }
    
    // Filter to companions that are due for a check
    const now = new Date();
    const eligibleCompanions = (companions || []).filter(c => {
      const simState = Array.isArray(c.simulation_states) 
        ? c.simulation_states[0] 
        : c.simulation_states;
      
      if (!simState) return true;
      
      if (simState.next_scheduled_at) {
        const scheduledAt = new Date(simState.next_scheduled_at);
        if (scheduledAt > now) return false;
      }
      
      return true;
    });
    
    // Process each eligible companion
    for (const companion of eligibleCompanions) {
      try {
        const result = await processProactiveCheck(companion.id);
        results.push({
          companion_id: companion.id,
          ...result,
        });
      } catch (err) {
        console.error(`Error processing companion ${companion.id}:`, err);
        results.push({
          companion_id: companion.id,
          checked: false,
          sent: false,
          reason: `Error: ${err instanceof Error ? err.message : 'Unknown'}`,
        });
      }
      
      // Small delay between companions
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Summarize results
    const summary = {
      total_checked: results.length,
      messages_sent: results.filter(r => r.sent).length,
      failed: results.filter(r => !r.checked).length,
      expired_messages: expiredCount,
    };
    
    console.log(`Proactive cron completed: ${summary.messages_sent} messages sent`);
    
    return NextResponse.json({
      success: true,
      summary,
      results,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Proactive cron error:', error);
    return NextResponse.json(
      { 
        status: 'error',
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
