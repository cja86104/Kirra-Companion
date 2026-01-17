/**
 * SKILLS API - Main Endpoint
 * 
 * GET  /api/companion/[id]/skills - List all skills for a companion
 * POST /api/companion/[id]/skills - Teach a new skill to the companion
 * 
 * Query params for GET:
 * - category: Filter by skill category
 * - search: Search skills by name/content
 * - limit: Max results (default 50)
 * - offset: Pagination offset
 * - active_only: Only return active skills (default true)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateSimpleCompletion } from '@/lib/ai/chat-client';
import type {
  CompanionSkill,
  CompanionSkillInsert,
  SkillCategory,
  TeachSkillRequest,
  TeachSkillResponse,
  SkillsSummary,
} from '@/types/skills';

interface CompanionRow {
  id: string;
  user_id: string;
  name: string;
}

// ============================================================================
// GET - List Skills
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companionId } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Parse query params
    const category = searchParams.get('category') as SkillCategory | null;
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const activeOnly = searchParams.get('active_only') !== 'false';
    const summary = searchParams.get('summary') === 'true';

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

    // If summary requested, return aggregated stats
    if (summary) {
      return await getSkillsSummary(supabase, companionId);
    }

    // Build query
    let query = supabase
      .from('companion_skills')
      .select('*', { count: 'exact' })
      .eq('companion_id', companionId)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    if (category) {
      query = query.eq('skill_category', category);
    }

    if (search) {
      query = query.or(`skill_name.ilike.%${search}%,skill_description.ilike.%${search}%,skill_content.ilike.%${search}%`);
    }

    const { data: skills, error, count } = await query;

    if (error) {
      console.error('Error fetching skills:', error);
      return NextResponse.json(
        { error: 'Failed to fetch skills' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      skills: skills as CompanionSkill[],
      total: count || 0,
      limit,
      offset,
      has_more: (count || 0) > offset + limit,
    });

  } catch (error) {
    console.error('Skills GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Teach New Skill
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companionId } = await params;
    const supabase = await createClient();
    const body: TeachSkillRequest = await request.json();

    // Validate required fields
    if (!body.skill_name?.trim()) {
      return NextResponse.json(
        { error: 'skill_name is required' },
        { status: 400 }
      );
    }

    if (!body.skill_content?.trim()) {
      return NextResponse.json(
        { error: 'skill_content is required' },
        { status: 400 }
      );
    }

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

    // Check if skill with this name already exists
    const { data: existing } = await supabase
      .from('companion_skills')
      .select('id, skill_name')
      .eq('companion_id', companionId)
      .ilike('skill_name', body.skill_name.trim())
      .single();

    if (existing) {
      return NextResponse.json(
        { 
          error: 'A skill with this name already exists',
          existing_skill_id: (existing as { id: string }).id,
        },
        { status: 409 }
      );
    }

    // Generate AI summary of the skill
    let skillSummary: string | null = null;
    try {
      skillSummary = await generateSkillSummary(
        body.skill_name,
        body.skill_category || 'other',
        body.skill_content
      );
    } catch (err) {
      console.error('Failed to generate skill summary:', err);
      // Continue without summary
    }

    // Prepare skill insert
    const skillInsert: CompanionSkillInsert = {
      companion_id: companionId,
      skill_name: body.skill_name.trim(),
      skill_category: body.skill_category || 'other',
      skill_description: body.skill_description?.trim() || null,
      skill_content: body.skill_content.trim(),
      skill_summary: skillSummary,
      structured_data: body.structured_data || { type: 'generic' },
      tags: body.tags || [],
      taught_via: 'manual',
      teaching_context: body.teaching_context || null,
    };

    // Insert the skill
    const { data: skill, error: insertError } = await supabase
      .from('companion_skills')
      .insert(skillInsert as never)
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting skill:', insertError);
      return NextResponse.json(
        { error: 'Failed to save skill' },
        { status: 500 }
      );
    }

    console.log(`[Skills] Taught "${body.skill_name}" to companion ${companion.name}`);

    const response: TeachSkillResponse = {
      success: true,
      skill: skill as CompanionSkill,
      message: `Successfully taught "${body.skill_name}" to ${companion.name}!`,
      summary_generated: skillSummary || undefined,
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Skills POST error:', error);
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
Create a 1-2 sentence summary of the following skill/knowledge that a user is teaching their AI companion.
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

/**
 * Get aggregated skills summary for a companion
 */
async function getSkillsSummary(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companionId: string
): Promise<NextResponse> {
  // Get all active skills
  const { data: skills, error } = await supabase
    .from('companion_skills')
    .select('*')
    .eq('companion_id', companionId)
    .eq('is_active', true)
    .order('times_used', { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch skills summary' },
      { status: 500 }
    );
  }

  const typedSkills = (skills || []) as CompanionSkill[];

  // Calculate summary stats
  const byCategory: Record<string, number> = {};
  const byProficiency: Record<string, number> = {};

  for (const skill of typedSkills) {
    byCategory[skill.skill_category] = (byCategory[skill.skill_category] || 0) + 1;
    byProficiency[skill.proficiency] = (byProficiency[skill.proficiency] || 0) + 1;
  }

  const summary: SkillsSummary = {
    total_skills: typedSkills.length,
    by_category: byCategory as Record<SkillCategory, number>,
    by_proficiency: byProficiency as Record<string, number>,
    most_used: typedSkills.slice(0, 5),
    recently_learned: [...typedSkills]
      .sort((a, b) => new Date(b.taught_at).getTime() - new Date(a.taught_at).getTime())
      .slice(0, 5),
    favorites: typedSkills.filter(s => s.is_favorite).slice(0, 5),
  };

  return NextResponse.json(summary);
}
