/**
 * SKILL USAGE TRACKING
 * 
 * Tracks when skills are used in conversations:
 * - Increments times_used counter
 * - Updates last_used_at timestamp
 * - Logs usage for analytics
 * - Triggers proficiency updates
 * 
 * Called after chat responses when relevant skills were included.
 */

import { createClient } from '@/lib/supabase/server';
import type { SkillUsageLogInsert } from '@/types/skills';

// ============================================================================
// TYPES
// ============================================================================

export interface SkillUsageRecord {
  skill_id: string;
  skill_name: string;
  usage_type: 'referenced' | 'applied' | 'taught' | 'corrected';
  was_successful?: boolean;
}

export interface TrackingResult {
  tracked: number;
  errors: number;
  details: Array<{
    skill_id: string;
    skill_name: string;
    success: boolean;
    new_times_used?: number;
  }>;
}

// ============================================================================
// MAIN TRACKING FUNCTION
// ============================================================================

/**
 * Track usage of multiple skills after a chat response
 */
export async function trackSkillUsage(
  companionId: string,
  skillsUsed: SkillUsageRecord[],
  messageId?: string
): Promise<TrackingResult> {
  const result: TrackingResult = {
    tracked: 0,
    errors: 0,
    details: [],
  };

  if (!skillsUsed || skillsUsed.length === 0) {
    return result;
  }

  const supabase = await createClient();

  for (const usage of skillsUsed) {
    try {
      // Update the skill's usage stats
      const { data: updatedSkill, error: updateError } = await supabase
        .from('companion_skills')
        .update({
          times_used: supabase.rpc('increment_field', { row_id: usage.skill_id, field: 'times_used' }),
          last_used_at: new Date().toISOString(),
          // If marked successful, increment successful_uses
          ...(usage.was_successful === true && {
            successful_uses: supabase.rpc('increment_field', { row_id: usage.skill_id, field: 'successful_uses' }),
          }),
          // If marked failed/corrected, increment failed_uses
          ...(usage.was_successful === false && {
            failed_uses: supabase.rpc('increment_field', { row_id: usage.skill_id, field: 'failed_uses' }),
          }),
        } as never)
        .eq('id', usage.skill_id)
        .select('times_used')
        .single();

      // Fallback: Direct increment if RPC doesn't exist
      if (updateError) {
        // Get current values first
        const { data: currentSkill } = await supabase
          .from('companion_skills')
          .select('times_used, successful_uses, failed_uses')
          .eq('id', usage.skill_id)
          .single();

        if (currentSkill) {
          const updates: Record<string, unknown> = {
            times_used: (currentSkill.times_used || 0) + 1,
            last_used_at: new Date().toISOString(),
          };

          if (usage.was_successful === true) {
            updates.successful_uses = (currentSkill.successful_uses || 0) + 1;
          } else if (usage.was_successful === false) {
            updates.failed_uses = (currentSkill.failed_uses || 0) + 1;
          }

          await supabase
            .from('companion_skills')
            .update(updates as never)
            .eq('id', usage.skill_id);
        }
      }

      // Log the usage
      const logEntry: SkillUsageLogInsert = {
        skill_id: usage.skill_id,
        companion_id: companionId,
        message_id: messageId || null,
        usage_type: usage.usage_type,
        was_successful: usage.was_successful ?? null,
      };

      await supabase
        .from('skill_usage_log')
        .insert(logEntry as never);

      result.tracked++;
      result.details.push({
        skill_id: usage.skill_id,
        skill_name: usage.skill_name,
        success: true,
        new_times_used: updatedSkill?.times_used,
      });

    } catch (error) {
      console.error(`[SkillUsage] Error tracking skill ${usage.skill_id}:`, error);
      result.errors++;
      result.details.push({
        skill_id: usage.skill_id,
        skill_name: usage.skill_name,
        success: false,
      });
    }
  }

  if (result.tracked > 0) {
    console.log(`[SkillUsage] Tracked ${result.tracked} skill(s) for companion ${companionId}`);
  }

  return result;
}

/**
 * Track a single skill usage (convenience function)
 */
export async function trackSingleSkillUsage(
  companionId: string,
  skillId: string,
  skillName: string,
  usageType: 'referenced' | 'applied' | 'taught' | 'corrected',
  wasSuccessful?: boolean,
  messageId?: string
): Promise<boolean> {
  const result = await trackSkillUsage(companionId, [{
    skill_id: skillId,
    skill_name: skillName,
    usage_type: usageType,
    was_successful: wasSuccessful,
  }], messageId);

  return result.tracked > 0;
}

/**
 * Mark a skill usage as successful (user confirmed)
 */
export async function markSkillSuccess(
  skillId: string,
  companionId: string,
  feedback?: string
): Promise<boolean> {
  const supabase = await createClient();

  try {
    // Get current stats
    const { data: skill } = await supabase
      .from('companion_skills')
      .select('successful_uses')
      .eq('id', skillId)
      .single();

    if (!skill) return false;

    // Update successful uses
    await supabase
      .from('companion_skills')
      .update({
        successful_uses: (skill.successful_uses || 0) + 1,
      } as never)
      .eq('id', skillId);

    // Log the success
    await supabase
      .from('skill_usage_log')
      .insert({
        skill_id: skillId,
        companion_id: companionId,
        usage_type: 'applied',
        was_successful: true,
        user_feedback: feedback || null,
      } as never);

    return true;
  } catch (error) {
    console.error('[SkillUsage] Error marking success:', error);
    return false;
  }
}

/**
 * Mark a skill usage as failed/corrected
 */
export async function markSkillCorrection(
  skillId: string,
  companionId: string,
  correction: string
): Promise<boolean> {
  const supabase = await createClient();

  try {
    // Get current stats
    const { data: skill } = await supabase
      .from('companion_skills')
      .select('failed_uses, times_reinforced')
      .eq('id', skillId)
      .single();

    if (!skill) return false;

    // Update failed uses and reinforced count
    await supabase
      .from('companion_skills')
      .update({
        failed_uses: (skill.failed_uses || 0) + 1,
        times_reinforced: (skill.times_reinforced || 0) + 1,
      } as never)
      .eq('id', skillId);

    // Log the correction
    await supabase
      .from('skill_usage_log')
      .insert({
        skill_id: skillId,
        companion_id: companionId,
        usage_type: 'corrected',
        was_successful: false,
        user_feedback: correction,
      } as never);

    return true;
  } catch (error) {
    console.error('[SkillUsage] Error marking correction:', error);
    return false;
  }
}

// ============================================================================
// ANALYTICS FUNCTIONS
// ============================================================================

/**
 * Get skill usage statistics for a companion
 */
export async function getSkillUsageStats(
  companionId: string,
  timeframe: 'day' | 'week' | 'month' | 'all' = 'week'
): Promise<{
  total_uses: number;
  unique_skills_used: number;
  success_rate: number;
  most_used: Array<{ skill_name: string; count: number }>;
  by_category: Record<string, number>;
}> {
  const supabase = await createClient();

  // Calculate date filter
  let dateFilter: string | null = null;
  const now = new Date();
  
  switch (timeframe) {
    case 'day':
      dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      break;
    case 'week':
      dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      break;
    case 'month':
      dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      break;
  }

  // Get usage logs
  let query = supabase
    .from('skill_usage_log')
    .select('skill_id, usage_type, was_successful, used_at')
    .eq('companion_id', companionId);

  if (dateFilter) {
    query = query.gte('used_at', dateFilter);
  }

  const { data: logs } = await query;

  if (!logs || logs.length === 0) {
    return {
      total_uses: 0,
      unique_skills_used: 0,
      success_rate: 0,
      most_used: [],
      by_category: {},
    };
  }

  // Calculate stats
  const uniqueSkills = new Set(logs.map(l => l.skill_id));
  const successfulUses = logs.filter(l => l.was_successful === true).length;
  const evaluatedUses = logs.filter(l => l.was_successful !== null).length;

  // Get skill details for most used
  const skillCounts: Record<string, number> = {};
  for (const log of logs) {
    skillCounts[log.skill_id] = (skillCounts[log.skill_id] || 0) + 1;
  }

  const topSkillIds = Object.entries(skillCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  const { data: topSkills } = await supabase
    .from('companion_skills')
    .select('id, skill_name, skill_category')
    .in('id', topSkillIds);

  const skillMap = new Map((topSkills || []).map(s => [s.id, s]));
  
  const mostUsed = topSkillIds.map(id => ({
    skill_name: skillMap.get(id)?.skill_name || 'Unknown',
    count: skillCounts[id],
  }));

  // Count by category
  const byCategory: Record<string, number> = {};
  for (const log of logs) {
    const skill = skillMap.get(log.skill_id);
    if (skill) {
      byCategory[skill.skill_category] = (byCategory[skill.skill_category] || 0) + 1;
    }
  }

  return {
    total_uses: logs.length,
    unique_skills_used: uniqueSkills.size,
    success_rate: evaluatedUses > 0 ? successfulUses / evaluatedUses : 0,
    most_used: mostUsed,
    by_category: byCategory,
  };
}

/**
 * Get recent skill usage for a companion
 */
export async function getRecentSkillUsage(
  companionId: string,
  limit: number = 10
): Promise<Array<{
  skill_name: string;
  skill_category: string;
  usage_type: string;
  was_successful: boolean | null;
  used_at: string;
}>> {
  const supabase = await createClient();

  const { data: logs } = await supabase
    .from('skill_usage_log')
    .select(`
      skill_id,
      usage_type,
      was_successful,
      used_at,
      companion_skills (
        skill_name,
        skill_category
      )
    `)
    .eq('companion_id', companionId)
    .order('used_at', { ascending: false })
    .limit(limit);

  if (!logs) return [];

  return logs.map(log => ({
    skill_name: (log.companion_skills as { skill_name: string })?.skill_name || 'Unknown',
    skill_category: (log.companion_skills as { skill_category: string })?.skill_category || 'other',
    usage_type: log.usage_type,
    was_successful: log.was_successful,
    used_at: log.used_at,
  }));
}
