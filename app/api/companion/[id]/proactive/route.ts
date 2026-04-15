/**
 * Proactive Messaging API
 * 
 * Endpoints for managing proactive messages from companions to users.
 * 
 * GET  - Get pending/recent proactive messages
 * POST - Trigger a proactive message check
 * PUT  - Update message status (seen, responded)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  checkProactiveTriggers,
  generateProactiveMessage,
  markMessageSeen,
  markMessageResponded,
} from '@/lib/companion/proactive-messaging';
import type { ProactiveMessage, ProactiveTriggerType } from '@/types/proactive';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ============================================================================
// GET - Fetch proactive messages
// ============================================================================

export async function GET(request: NextRequest, { params }: RouteParams) {
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
    
    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status'); // pending, sent, seen, responded, all
    const limit = parseInt(searchParams.get('limit') || '20');
    // includeExpired param reserved for future use
    
    // Build query
    let query = supabase
      .from('proactive_messages')
      .select('*')
      .eq('companion_id', companionId)
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 100));

    // proactive_messages uses read (boolean) not status
    if (status === 'unread') {
      query = query.eq('read', false);
    } else if (status === 'read') {
      query = query.eq('read', true);
    }

    const { data: messages, error } = await query as unknown as {
      data: ProactiveMessage[] | null;
      error: Error | null;
    };
    
    if (error) {
      console.error('Error fetching proactive messages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }
    
    // Count pending messages
    const { count: pendingCount } = await supabase
      .from('proactive_messages')
      .select('id', { count: 'exact', head: true })
      .eq('companion_id', companionId)
      .eq('read', false) as unknown as { count: number | null };
    
    return NextResponse.json({
      messages: messages || [],
      pending_count: pendingCount || 0,
      total: messages?.length || 0,
    });
    
  } catch (error) {
    console.error('Proactive GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Trigger proactive message check or force a message
// ============================================================================

export async function POST(request: NextRequest, { params }: RouteParams) {
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
    
    const body = await request.json().catch(() => ({}));
    const { action = 'check', trigger_type, force = false } = body as {
      action?: 'check' | 'generate';
      trigger_type?: ProactiveTriggerType;
      force?: boolean;
    };
    
    if (action === 'check') {
      // Just check triggers without generating
      const result = await checkProactiveTriggers(companionId);
      
      return NextResponse.json({
        success: true,
        result,
        should_send: result.shouldSendMessage,
        selected_trigger: result.selectedTrigger,
        cooldown_active: result.cooldownActive,
        cooldown_ends_at: result.cooldownEndsAt,
      });
    }
    
    if (action === 'generate') {
      if (!trigger_type) {
        // Auto-select trigger
        const checkResult = await checkProactiveTriggers(companionId);
        
        if (!checkResult.shouldSendMessage && !force) {
          return NextResponse.json({
            success: false,
            error: 'No valid triggers or cooldown active',
            result: checkResult,
          });
        }
        
        const selectedType = checkResult.selectedTrigger?.triggerType || 'random_thought';
        
        const message = await generateProactiveMessage(companionId, selectedType, {
          forceGenerate: force,
        });
        
        if (!message) {
          return NextResponse.json(
            { error: 'Failed to generate message' },
            { status: 500 }
          );
        }
        
        return NextResponse.json({
          success: true,
          message,
          trigger_type: selectedType,
        });
      }
      
      // Generate with specific trigger type
      const message = await generateProactiveMessage(companionId, trigger_type, {
        forceGenerate: force,
      });
      
      if (!message) {
        return NextResponse.json(
          { error: 'Failed to generate message' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        message,
        trigger_type,
      });
    }
    
    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Proactive POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT - Update message status
// ============================================================================

export async function PUT(request: NextRequest, { params }: RouteParams) {
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
    
    const body = await request.json();
    const { message_id, action } = body as {
      message_id: string;
      action: 'seen' | 'responded';
    };
    
    if (!message_id || !action) {
      return NextResponse.json(
        { error: 'Missing message_id or action' },
        { status: 400 }
      );
    }
    
    // Verify message belongs to user
    const { data: message } = await supabase
      .from('proactive_messages')
      .select('id, user_id, companion_id')
      .eq('id', message_id)
      .eq('user_id', user.id)
      .single() as unknown as { data: { id: string; user_id: string; companion_id: string } | null };
    
    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }
    
    if (message.companion_id !== companionId) {
      return NextResponse.json(
        { error: 'Message does not belong to this companion' },
        { status: 400 }
      );
    }
    
    let success = false;
    
    if (action === 'seen') {
      success = await markMessageSeen(message_id);
    } else if (action === 'responded') {
      success = await markMessageResponded(message_id);
    }
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update message' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message_id,
      action,
    });
    
  } catch (error) {
    console.error('Proactive PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
