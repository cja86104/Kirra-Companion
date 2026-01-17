/**
 * SKILL FEEDBACK API
 * 
 * POST /api/companion/[id]/skills/[skillId]/feedback
 * 
 * Allows users to provide feedback on skill usage:
 * - Mark as successful (companion used the skill correctly)
 * - Mark as corrected (companion made a mistake, user provided correction)
 * 
 * This improves skill proficiency over time.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { markSkillSuccess, markSkillCorrection } from '@/lib/companion/skill-usage';

interface CompanionRow {
  id: string;
  user_id: string;
}

interface SkillRow {
  id: string;
  skill_name: string;
  proficiency: string;
  successful_uses: number;
  failed_uses: number;
}

interface UpdatedSkillRow {
  proficiency: string;
  successful_uses: number;
  failed_uses: number;
  confidence_score: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; skillId: string }> }
) {
  try {
    const { id: companionId, skillId } = await params;
    const supabase = await createClient();
    const body = await request.json();

    const {
      feedback_type,  // 'success' | 'correction'
      feedback_text,  // Optional text (required for corrections)
    } = body as {
      feedback_type: 'success' | 'correction';
      feedback_text?: string;
    };

    // Validate
    if (!feedback_type || !['success', 'correction'].includes(feedback_type)) {
      return NextResponse.json(
        { error: 'feedback_type must be "success" or "correction"' },
        { status: 400 }
      );
    }

    if (feedback_type === 'correction' && !feedback_text?.trim()) {
      return NextResponse.json(
        { error: 'feedback_text is required for corrections' },
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
      .select('id, user_id')
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
    const { data: skillData } = await supabase
      .from('companion_skills')
      .select('id, skill_name, proficiency, successful_uses, failed_uses')
      .eq('id', skillId)
      .eq('companion_id', companionId)
      .single();

    const skill = skillData as SkillRow | null;

    if (!skill) {
      return NextResponse.json(
        { error: 'Skill not found' },
        { status: 404 }
      );
    }

    // Process feedback
    let success = false;

    if (feedback_type === 'success') {
      success = await markSkillSuccess(skillId, companionId, feedback_text);
    } else {
      success = await markSkillCorrection(skillId, companionId, feedback_text!);
    }

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to record feedback' },
        { status: 500 }
      );
    }

    // Get updated skill stats
    const { data: updatedSkillData } = await supabase
      .from('companion_skills')
      .select('proficiency, successful_uses, failed_uses, confidence_score')
      .eq('id', skillId)
      .single();

    const updatedSkill = updatedSkillData as UpdatedSkillRow | null;

    console.log(`[SkillFeedback] ${feedback_type} recorded for skill "${skill.skill_name}"`);

    return NextResponse.json({
      success: true,
      feedback_type,
      skill_name: skill.skill_name,
      updated_stats: updatedSkill ? {
        proficiency: updatedSkill.proficiency,
        successful_uses: updatedSkill.successful_uses,
        failed_uses: updatedSkill.failed_uses,
        confidence_score: updatedSkill.confidence_score,
      } : null,
      message: feedback_type === 'success' 
        ? 'Great! This helps your companion learn.'
        : 'Thanks for the correction. Your companion will improve.',
    });

  } catch (error) {
    console.error('Skill feedback error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
