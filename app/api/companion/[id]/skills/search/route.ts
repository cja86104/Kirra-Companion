/**
 * SKILLS API - Search Endpoint
 * 
 * POST /api/companion/[id]/skills/search - Search for relevant skills
 * 
 * Used by the chat system to find skills relevant to the current conversation.
 * Uses full-text search and semantic matching.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type {
  CompanionSkill,
  SkillSearchResult,
  SkillCategory,
} from '@/types/skills';

// ============================================================================
// POST - Search Skills
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companionId } = await params;
    const supabase = await createClient();
    const body = await request.json();

    const {
      query,               // Search query text
      categories,          // Optional: filter by categories
      limit = 5,           // Max results
      min_confidence = 0,  // Minimum confidence score
      include_inactive = false,
    } = body as {
      query: string;
      categories?: SkillCategory[];
      limit?: number;
      min_confidence?: number;
      include_inactive?: boolean;
    };

    if (!query?.trim()) {
      return NextResponse.json(
        { error: 'query is required' },
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
    const { data: companion } = await supabase
      .from('companions')
      .select('id, user_id')
      .eq('id', companionId)
      .single();

    if (!companion || companion.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Companion not found' },
        { status: 404 }
      );
    }

    // Try to use the database function first
    const { data: functionResults, error: functionError } = await supabase
      .rpc('get_relevant_skills', {
        p_companion_id: companionId,
        p_search_text: query.trim(),
        p_limit: limit,
      });

    if (!functionError && functionResults && functionResults.length > 0) {
      // Filter and format results from function
      let results = functionResults as Array<{
        id: string;
        skill_name: string;
        skill_category: SkillCategory;
        skill_content: string;
        skill_summary: string | null;
        proficiency: string;
        confidence_score: number;
        relevance_rank: number;
      }>;

      // Apply additional filters
      if (min_confidence > 0) {
        results = results.filter(r => r.confidence_score >= min_confidence);
      }

      if (categories && categories.length > 0) {
        results = results.filter(r => categories.includes(r.skill_category));
      }

      // Get full skill data for the results
      const skillIds = results.map(r => r.id);
      const { data: fullSkills } = await supabase
        .from('companion_skills')
        .select('*')
        .in('id', skillIds);

      const skillMap = new Map((fullSkills || []).map(s => [s.id, s]));

      const searchResults: SkillSearchResult[] = results.map(r => ({
        skill: skillMap.get(r.id) as CompanionSkill,
        relevance_score: r.relevance_rank,
        match_reason: `Matched on content search`,
      })).filter(r => r.skill);

      return NextResponse.json({
        results: searchResults,
        total: searchResults.length,
        query: query.trim(),
      });
    }

    // Fallback: Manual search if function fails or returns nothing
    let fallbackQuery = supabase
      .from('companion_skills')
      .select('*')
      .eq('companion_id', companionId)
      .gte('confidence_score', min_confidence);

    if (!include_inactive) {
      fallbackQuery = fallbackQuery.eq('is_active', true);
    }

    if (categories && categories.length > 0) {
      fallbackQuery = fallbackQuery.in('skill_category', categories);
    }

    // Search in name, description, and content
    const searchTerm = query.trim().toLowerCase();
    fallbackQuery = fallbackQuery.or(
      `skill_name.ilike.%${searchTerm}%,skill_description.ilike.%${searchTerm}%,skill_content.ilike.%${searchTerm}%,tags.cs.{${searchTerm}}`
    );

    const { data: skills, error: searchError } = await fallbackQuery
      .order('confidence_score', { ascending: false })
      .order('times_used', { ascending: false })
      .limit(limit);

    if (searchError) {
      console.error('Skill search error:', searchError);
      return NextResponse.json(
        { error: 'Search failed' },
        { status: 500 }
      );
    }

    // Calculate relevance scores manually
    const searchResults: SkillSearchResult[] = (skills || []).map(skill => {
      const s = skill as CompanionSkill;
      let relevance = 0;
      let matchReason = '';

      // Check where the match occurred
      if (s.skill_name.toLowerCase().includes(searchTerm)) {
        relevance += 1.0;
        matchReason = 'Matched in skill name';
      } else if (s.skill_description?.toLowerCase().includes(searchTerm)) {
        relevance += 0.7;
        matchReason = 'Matched in description';
      } else if (s.skill_content.toLowerCase().includes(searchTerm)) {
        relevance += 0.5;
        matchReason = 'Matched in content';
      } else if (s.tags?.some(t => t.toLowerCase().includes(searchTerm))) {
        relevance += 0.6;
        matchReason = 'Matched in tags';
      }

      // Boost by confidence
      relevance *= (0.5 + s.confidence_score * 0.5);

      return {
        skill: s,
        relevance_score: relevance,
        match_reason: matchReason,
      };
    });

    // Sort by relevance
    searchResults.sort((a, b) => b.relevance_score - a.relevance_score);

    return NextResponse.json({
      results: searchResults,
      total: searchResults.length,
      query: query.trim(),
    });

  } catch (error) {
    console.error('Skills search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - Quick search via query param
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter "q" is required' },
      { status: 400 }
    );
  }

  // Convert to POST request format
  const postRequest = new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify({
      query,
      limit: parseInt(searchParams.get('limit') || '5', 10),
    }),
    headers: request.headers,
  });

  return POST(postRequest, { params });
}
