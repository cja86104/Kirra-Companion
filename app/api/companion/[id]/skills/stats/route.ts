/**
 * SKILL STATS API
 * 
 * GET /api/companion/[id]/skills/stats
 * 
 * Returns skill usage statistics for a companion:
 * - Total uses, unique skills used
 * - Success rate
 * - Most used skills
 * - Usage by category
 * - Recent usage history
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSkillUsageStats, getRecentSkillUsage } from '@/lib/companion/skill-usage';

interface CompanionRow {
  id: string;
  user_id: string;
  name: string;
}

interface SkillProficiency {
  proficiency: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companionId } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const timeframe = (searchParams.get('timeframe') || 'week') as 'day' | 'week' | 'month' | 'all';
    const includeRecent = searchParams.get('recent') !== 'false';

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

    // Get usage statistics
    const stats = await getSkillUsageStats(companionId, timeframe);

    // Get recent usage if requested
    let recentUsage: Awaited<ReturnType<typeof getRecentSkillUsage>> = [];
    if (includeRecent) {
      recentUsage = await getRecentSkillUsage(companionId, 10);
    }

    // Get total skill count
    const { count: totalSkills } = await supabase
      .from('companion_skills')
      .select('id', { count: 'exact' })
      .eq('companion_id', companionId)
      .eq('is_active', true);

    // Get proficiency distribution
    const { data: proficiencyData } = await supabase
      .from('companion_skills')
      .select('proficiency')
      .eq('companion_id', companionId)
      .eq('is_active', true);

    const proficiencyDistribution: Record<string, number> = {};
    const skills = (proficiencyData || []) as SkillProficiency[];
    for (const skill of skills) {
      proficiencyDistribution[skill.proficiency] = (proficiencyDistribution[skill.proficiency] || 0) + 1;
    }

    return NextResponse.json({
      companion_name: companion.name,
      timeframe,
      
      // Overall stats
      total_skills: totalSkills || 0,
      proficiency_distribution: proficiencyDistribution,
      
      // Usage stats
      usage: {
        total_uses: stats.total_uses,
        unique_skills_used: stats.unique_skills_used,
        success_rate: Math.round(stats.success_rate * 100),
        most_used: stats.most_used,
        by_category: stats.by_category,
      },
      
      // Recent activity
      recent_usage: includeRecent ? recentUsage : undefined,
    });

  } catch (error) {
    console.error('Skill stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
