/**
 * SKILLS API - Individual Skill Endpoint
 * 
 * GET    /api/companion/[id]/skills/[skillId] - Get a specific skill
 * PUT    /api/companion/[id]/skills/[skillId] - Update a skill
 * DELETE /api/companion/[id]/skills/[skillId] - Delete a skill
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateSimpleCompletion } from '@/lib/ai/chat-client';
import type {
  CompanionSkill,
  CompanionSkillUpdate,
  SkillCategory,
} from '@/types/skills';

interface CompanionRow {
  id: string;
  user_id: string;
  name: string;
}

interface ExistingSkillRow {
  id: string;
  skill_name: string;
  skill_category: string;
  skill_content: string;
  times_reinforced: number;
}

// ============================================================================
// GET - Get Single Skill
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; skillId: string }> }
) {
  try {
    const { id: companionId, skillId } = await params;
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
    const { data: companionData } = await supabase
      .from('companions')
      .select('id, user_id')
      .eq('id', companionId)
      .single();

    const companion = companionData as { id: string; user_id: string } | null;

    if (!companion) {
      return NextResponse.json(
        { error: 'Companion not found' },
        { status: 404 }
      );
    }

    if (companion.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Companion not found' },
        { status: 404 }
      );
    }

    // Fetch the skill
    const { data: skill, error } = await supabase
      .from('companion_skills')
      .select('*')
      .eq('id', skillId)
      .eq('companion_id', companionId)
      .single();

    if (error || !skill) {
      return NextResponse.json(
        { error: 'Skill not found' },
        { status: 404 }
      );
    }

    // Also fetch recent usage
    const { data: recentUsage } = await supabase
      .from('skill_usage_log')
      .select('*')
      .eq('skill_id', skillId)
      .order('used_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      skill: skill as CompanionSkill,
      recent_usage: recentUsage || [],
    });

  } catch (error) {
    console.error('Skill GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT - Update Skill
// ============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; skillId: string }> }
) {
  try {
    const { id: companionId, skillId } = await params;
    const supabase = await createClient();
    const body: CompanionSkillUpdate & { regenerate_summary?: boolean } = await request.json();

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user owns this companion
    const { data: companionData } = await supabase
      .from('companions')
      .select('id, user_id, name')
      .eq('id', companionId)
      .single();

    const companion = companionData as CompanionRow | null;

    if (!companion) {
      return NextResponse.json(
        { error: 'Companion not found' },
        { status: 404 }
      );
    }

    if (companion.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Companion not found' },
        { status: 404 }
      );
    }

    // Verify skill exists and belongs to this companion
    const { data: existingSkillData } = await supabase
      .from('companion_skills')
      .select('id, skill_name, skill_category, skill_content, times_reinforced')
      .eq('id', skillId)
      .eq('companion_id', companionId)
      .single();

    const existingSkill = existingSkillData as ExistingSkillRow | null;

    if (!existingSkill) {
      return NextResponse.json(
        { error: 'Skill not found' },
        { status: 404 }
      );
    }

    // If name is being changed, check for duplicates
    if (body.skill_name && body.skill_name !== existingSkill.skill_name) {
      const { data: duplicate } = await supabase
        .from('companion_skills')
        .select('id')
        .eq('companion_id', companionId)
        .ilike('skill_name', body.skill_name.trim())
        .neq('id', skillId)
        .single();

      if (duplicate) {
        return NextResponse.json(
          { error: 'A skill with this name already exists' },
          { status: 409 }
        );
      }
    }

    // Build update object
    const updates: Record<string, unknown> = {};

    if (body.skill_name !== undefined) updates.skill_name = body.skill_name.trim();
    if (body.skill_category !== undefined) updates.skill_category = body.skill_category;
    if (body.skill_description !== undefined) updates.skill_description = body.skill_description?.trim() || null;
    if (body.skill_content !== undefined) updates.skill_content = body.skill_content.trim();
    if (body.structured_data !== undefined) updates.structured_data = body.structured_data;
    if (body.tags !== undefined) updates.tags = body.tags;
    if (body.is_favorite !== undefined) updates.is_favorite = body.is_favorite;
    if (body.is_active !== undefined) updates.is_active = body.is_active;

    // Regenerate summary if content changed or explicitly requested
    if (body.regenerate_summary || body.skill_content) {
      try {
        const newSummary = await generateSkillSummary(
          body.skill_name || existingSkill.skill_name,
          (body.skill_category || existingSkill.skill_category) as SkillCategory,
          body.skill_content || existingSkill.skill_content
        );
        if (newSummary) {
          updates.skill_summary = newSummary;
        }
      } catch (err) {
        console.error('Failed to regenerate summary:', err);
      }
    }

    // Increment reinforced count if content was updated
    if (body.skill_content && body.skill_content !== existingSkill.skill_content) {
      updates.times_reinforced = (existingSkill.times_reinforced || 0) + 1;
    }

    // Perform update
    const { data: updatedSkill, error: updateError } = await supabase
      .from('companion_skills')
      .update(updates as never)
      .eq('id', skillId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating skill:', updateError);
      return NextResponse.json(
        { error: 'Failed to update skill' },
        { status: 500 }
      );
    }

    console.log(`[Skills] Updated "${existingSkill.skill_name}" for companion ${companion.name}`);

    return NextResponse.json({
      success: true,
      skill: updatedSkill as CompanionSkill,
      message: 'Skill updated successfully',
    });

  } catch (error) {
    console.error('Skill PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE - Delete Skill
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; skillId: string }> }
) {
  try {
    const { id: companionId, skillId } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    // Option to soft-delete (deactivate) instead of hard delete
    const softDelete = searchParams.get('soft') === 'true';

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user owns this companion
    const { data: companionData } = await supabase
      .from('companions')
      .select('id, user_id, name')
      .eq('id', companionId)
      .single();

    const companion = companionData as CompanionRow | null;

    if (!companion) {
      return NextResponse.json(
        { error: 'Companion not found' },
        { status: 404 }
      );
    }

    if (companion.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Companion not found' },
        { status: 404 }
      );
    }

    // Verify skill exists
    const { data: existingSkillData } = await supabase
      .from('companion_skills')
      .select('id, skill_name')
      .eq('id', skillId)
      .eq('companion_id', companionId)
      .single();

    const existingSkill = existingSkillData as { id: string; skill_name: string } | null;

    if (!existingSkill) {
      return NextResponse.json(
        { error: 'Skill not found' },
        { status: 404 }
      );
    }

    if (softDelete) {
      // Soft delete - just deactivate
      const { error: updateError } = await supabase
        .from('companion_skills')
        .update({ is_active: false } as never)
        .eq('id', skillId);

      if (updateError) {
        console.error('Error deactivating skill:', updateError);
        return NextResponse.json(
          { error: 'Failed to deactivate skill' },
          { status: 500 }
        );
      }

      console.log(`[Skills] Deactivated "${existingSkill.skill_name}" for companion ${companion.name}`);

      return NextResponse.json({
        success: true,
        message: `Skill "${existingSkill.skill_name}" has been deactivated`,
        soft_deleted: true,
      });

    } else {
      // Hard delete
      const { error: deleteError } = await supabase
        .from('companion_skills')
        .delete()
        .eq('id', skillId);

      if (deleteError) {
        console.error('Error deleting skill:', deleteError);
        return NextResponse.json(
          { error: 'Failed to delete skill' },
          { status: 500 }
        );
      }

      console.log(`[Skills] Deleted "${existingSkill.skill_name}" for companion ${companion.name}`);

      return NextResponse.json({
        success: true,
        message: `Skill "${existingSkill.skill_name}" has been deleted`,
        soft_deleted: false,
      });
    }

  } catch (error) {
    console.error('Skill DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a concise summary of the skill using AI
 */
async function generateSkillSummary(
  skillName: string,
  category: SkillCategory,
  content: string
): Promise<string | null> {
  const systemPrompt = `You are a helpful assistant that creates brief summaries. 
Create a 1-2 sentence summary of the following skill/knowledge.
Keep it concise and capture the key essence. Do not use quotes or markdown.`;

  const userPrompt = `Skill Name: ${skillName}
Category: ${category}
Content: ${content.slice(0, 2000)}

Create a brief summary:`;

  try {
    const response = await generateSimpleCompletion(systemPrompt, userPrompt, {
      temperature: 0.3,
      maxTokens: 100,
    });

    return response.content.trim();
  } catch {
    return null;
  }
}
