/**
 * SKILLS API - Search Endpoint
 * 
 * POST /api/companion/[id]/skills/search - Search for relevant skills
 * 
 * Used by the chat system to find skills relevant to the current conversation.
 * Uses full-text search and semantic matching.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/types/database';

const SkillSearchSchema = z.object({
  query: z.string().min(1).max(500),
  categories: z.array(z.enum(['coding', 'recipes', 'domain', 'traditions', 'games', 'creative', 'language', 'procedures', 'trivia', 'other'])).optional(),
  limit: z.number().int().min(1).max(50).optional().default(5),
  min_confidence: z.number().min(0).max(1).optional().default(0),
});

// Local types matching actual database schema
interface CompanionRow {
  id: string;
  user_id: string;
}

interface SkillRow {
  id: string;
  companion_id: string;
  skill_name: string;
  skill_category: string;
  proficiency_level: number;
  times_used: number;
  last_used: string | null;
  learned_from: string | null;
  metadata: Json | null;
  created_at: string;
  updated_at: string;
}

interface RpcSkillResult {
  id: string;
  skill_name: string;
  skill_category: string;
  skill_content: string;
  skill_summary: string | null;
  proficiency: string;
  confidence_score: number;
  relevance_rank: number;
}

interface SearchResult {
  skill: SkillRow;
  relevance_score: number;
  match_reason: string;
}

type SkillCategory = 
  | 'coding'
  | 'recipes'
  | 'domain'
  | 'traditions'
  | 'games'
  | 'creative'
  | 'language'
  | 'procedures'
  | 'trivia'
  | 'other';

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
    const rawBody: unknown = await request.json();
    const parseResult = SkillSearchSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { query, categories, limit } = parseResult.data;

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

    // Try to use the database function first
    // get_relevant_skills not yet in generated types — cast through unknown
    type RpcClient = { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: RpcSkillResult[] | null; error: { message: string } | null }> };
    const { data: functionResults, error: functionError } = await (supabase as unknown as RpcClient)
      .rpc('get_relevant_skills', {
        p_companion_id: companionId,
        p_search_text: query.trim(),
        p_limit: limit,
      });

    const rpcResults = functionResults as RpcSkillResult[] | null;

    if (!functionError && rpcResults && rpcResults.length > 0) {
      // Filter by categories if provided
      let results = rpcResults;

      if (categories && categories.length > 0) {
        results = results.filter(r => categories.includes(r.skill_category as SkillCategory));
      }

      // Get full skill data for the results
      const skillIds = results.map(r => r.id);
      const { data: fullSkills } = await supabase
        .from('companion_skills')
        .select('*')
        .in('id', skillIds);

      const skillMap = new Map((fullSkills || []).map(s => {
        const skill = s as SkillRow;
        return [skill.id, skill];
      }));

      const searchResults: SearchResult[] = results
        .map(r => ({
          skill: skillMap.get(r.id) as SkillRow,
          relevance_score: r.relevance_rank,
          match_reason: `Matched on content search`,
        }))
        .filter(r => r.skill);

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
      .eq('companion_id', companionId);

    if (categories && categories.length > 0) {
      fallbackQuery = fallbackQuery.in('skill_category', categories);
    }

    // Search in name
    const searchTerm = query.trim().toLowerCase();
    fallbackQuery = fallbackQuery.ilike('skill_name', `%${searchTerm}%`);

    const { data: skills, error: searchError } = await fallbackQuery
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
    const searchResults: SearchResult[] = (skills || []).map(skill => {
      const s = skill as SkillRow;
      let relevance = 0;
      let matchReason = '';

      // Check where the match occurred
      if (s.skill_name.toLowerCase().includes(searchTerm)) {
        relevance += 1.0;
        matchReason = 'Matched in skill name';
      }

      // Boost by proficiency level
      relevance *= (0.5 + (s.proficiency_level / 10) * 0.5);

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
