import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import type { MemoryInsert, MemoryUpdate } from '@/types/database';

const MemoryCreateSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().min(1).max(10000),
  importance_score: z.number().min(0).max(1).optional().default(0.5),
  is_core_memory: z.boolean().optional().default(false),
  is_pinned: z.boolean().optional().default(false),
});

const MemoryUpdateSchema = z.object({
  memory_id: z.string().uuid(),
  title: z.string().max(200).nullable().optional(),
  content: z.string().min(1).max(10000).optional(),
  category_id: z.string().uuid().nullable().optional(),
  importance_score: z.number().min(0).max(1).optional(),
  is_core_memory: z.boolean().optional(),
  is_pinned: z.boolean().optional(),
});

// ============================================================
// GET - List memories for companion
// ============================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companionId } = await params;
    const supabase = await createClient();

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify companion ownership
    const { data: companion } = await supabase
      .from('companions')
      .select('id')
      .eq('id', companionId)
      .eq('user_id', user.id)
      .single();

    if (!companion) {
      return NextResponse.json({ error: 'Companion not found' }, { status: 404 });
    }

    // Get memories
    const { data: memories, error } = await supabase
      .from('memories')
      .select(`
        *,
        memory_categories (
          id,
          name,
          icon,
          color
        )
      `)
      .eq('companion_id', companionId)
      .order('importance_score', { ascending: false });

    if (error) {
      console.error('Error fetching memories:', error);
      return NextResponse.json({ error: 'Failed to fetch memories' }, { status: 500 });
    }

    return NextResponse.json({ memories });
  } catch (error) {
    console.error('Memory fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch memories' }, { status: 500 });
  }
}

// ============================================================
// POST - Create new memory
// ============================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companionId } = await params;
    const rawBody: unknown = await request.json();
    const parseResult = MemoryCreateSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { title, content, importance_score, is_core_memory, is_pinned } = parseResult.data;

    const supabase = await createClient();

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify companion ownership
    const { data: companion } = await supabase
      .from('companions')
      .select('id, name')
      .eq('id', companionId)
      .eq('user_id', user.id)
      .single();

    if (!companion) {
      return NextResponse.json({ error: 'Companion not found' }, { status: 404 });
    }

    // Create memory.
    // Note: category_id support can be added later by looking up category by name.
    // source_type='manual' marks this as a user-created memory (vs 'chat_extraction'
    // for AI-extracted memories). is_verified=true because the user authored it directly.
    const memoryData = {
      companion_id: companionId,
      title: title?.trim() || null,
      content: content.trim(),
      importance_score: importance_score ?? 0.5,
      is_core_memory: is_core_memory ?? false,
      is_pinned: is_pinned ?? false,
      source_type: 'manual',
      is_verified: true,
    } satisfies MemoryInsert;

    const { data: memory, error } = await supabase
      .from('memories')
      .insert(memoryData)
      .select(`
        *,
        memory_categories (
          id,
          name,
          icon,
          color
        )
      `)
      .single();

    if (error) {
      console.error('Error creating memory:', error);
      return NextResponse.json({ error: 'Failed to create memory' }, { status: 500 });
    }

    return NextResponse.json({ memory }, { status: 201 });
  } catch (error) {
    console.error('Memory create error:', error);
    return NextResponse.json({ error: 'Failed to create memory' }, { status: 500 });
  }
}

// ============================================================
// PUT - Update memory
// ============================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companionId } = await params;
    const rawBody: unknown = await request.json();
    const parseResult = MemoryUpdateSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { memory_id, title, content, category_id, importance_score, is_core_memory, is_pinned } = parseResult.data;

    const supabase = await createClient();

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify companion ownership
    const { data: companion } = await supabase
      .from('companions')
      .select('id')
      .eq('id', companionId)
      .eq('user_id', user.id)
      .single();

    if (!companion) {
      return NextResponse.json({ error: 'Companion not found' }, { status: 404 });
    }

    // Build the update object as a typed MemoryUpdate so each conditional
    // assignment is type-checked against the actual column types.
    const updateData: MemoryUpdate = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updateData.title = title?.trim() || null;
    if (content !== undefined) updateData.content = content.trim();
    if (category_id !== undefined) updateData.category_id = category_id;
    if (importance_score !== undefined) updateData.importance_score = importance_score;
    if (is_core_memory !== undefined) updateData.is_core_memory = is_core_memory;
    if (is_pinned !== undefined) updateData.is_pinned = is_pinned;

    const { data: memory, error } = await supabase
      .from('memories')
      .update(updateData)
      .eq('id', memory_id)
      .eq('companion_id', companionId)
      .select(`
        *,
        memory_categories (
          id,
          name,
          icon,
          color
        )
      `)
      .single();

    if (error) {
      console.error('Error updating memory:', error);
      return NextResponse.json({ error: 'Failed to update memory' }, { status: 500 });
    }

    return NextResponse.json({ memory });
  } catch (error) {
    console.error('Memory update error:', error);
    return NextResponse.json({ error: 'Failed to update memory' }, { status: 500 });
  }
}

// ============================================================
// DELETE - Delete memory
// ============================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companionId } = await params;
    const { searchParams } = new URL(request.url);
    const memoryId = searchParams.get('memory_id');

    if (!memoryId) {
      return NextResponse.json({ error: 'Memory ID is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify companion ownership
    const { data: companion } = await supabase
      .from('companions')
      .select('id')
      .eq('id', companionId)
      .eq('user_id', user.id)
      .single();

    if (!companion) {
      return NextResponse.json({ error: 'Companion not found' }, { status: 404 });
    }

    // Delete memory
    const { error } = await supabase
      .from('memories')
      .delete()
      .eq('id', memoryId)
      .eq('companion_id', companionId);

    if (error) {
      console.error('Error deleting memory:', error);
      return NextResponse.json({ error: 'Failed to delete memory' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Memory delete error:', error);
    return NextResponse.json({ error: 'Failed to delete memory' }, { status: 500 });
  }
}
