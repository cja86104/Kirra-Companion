import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  getUserSharedInterests,
  getRecentlyActiveInterests,
  discoverNewInterest,
  addInterestExperience,
  INTEREST_TEMPLATES,
} from '@/lib/companion/interest-evolution';
import type {
  CompanionInterest,
  InterestsResponse,
  InterestCategory,
} from '@/types/life-simulation';
import type { CompanionInterestRow } from '@/types/life-simulation-db';

const InterestPostSchema = z.object({
  origin: z.enum(['initial', 'user_shared', 'discovered', 'evolved', 'activity', 'conversation']),
  interest_id: z.string().optional(),
  context: z.string().max(1000).optional(),
});

const InterestPutSchema = z.object({
  interest_id: z.string().uuid(),
  action: z.enum(['add_experience', 'update_strength', 'increment_mentions']),
  amount: z.number().optional(),
  context: z.string().max(1000).optional(),
});

/**
 * GET /api/companion/[id]/interests
 * 
 * Retrieve interests for a companion.
 * 
 * Query params:
 * - category: filter by category
 * - user_shared: filter by user-shared interests (true/false)
 * - stage: filter by stage (curious, interested, passionate, expert)
 * - limit: max results (default all)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companionId } = await params;
    const { searchParams } = new URL(request.url);
    
    const category = searchParams.get('category') as InterestCategory | null;
    const userShared = searchParams.get('user_shared');
    const stage = searchParams.get('stage');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    
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
    
    // Build query - use type assertion for tables not in generated types
    let query = supabase
      .from('companion_interests')
      .select('*')
      .eq('companion_id', companionId)
      .order('strength', { ascending: false });
    
    if (category) {
      query = query.eq('interest_category', category);
    }
    
    if (userShared === 'true') {
      query = query.eq('shared_with_user', true);
    } else if (userShared === 'false') {
      query = query.eq('shared_with_user', false);
    }
    
    if (stage) {
      query = query.eq('stage', stage);
    }
    
    if (limit) {
      query = query.limit(limit);
    }
    
    const { data: interests, error } = await query;
    
    if (error) {
      console.error('Error fetching interests:', error);
      return NextResponse.json(
        { error: 'Failed to fetch interests' },
        { status: 500 }
      );
    }
    
    // Get category counts
    const categoryCounts: Record<InterestCategory, number> = {} as Record<InterestCategory, number>;
    for (const interest of interests || []) {
      const cat = interest.interest_category as InterestCategory;
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }
    
    const categories = Object.entries(categoryCounts).map(([category, count]) => ({
      category: category as InterestCategory,
      count,
    }));
    
    // Get recently active
    const recentlyActive = await getRecentlyActiveInterests(companionId, 5);
    
    // Get user shared
    const sharedWithUser = await getUserSharedInterests(companionId);
    
    const response: InterestsResponse = {
      interests: (interests || []) as CompanionInterest[],
      categories,
      total: interests?.length || 0,
      recently_active: recentlyActive,
      shared_with_user: sharedWithUser,
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Interests API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/companion/[id]/interests
 * 
 * Discover or create a new interest.
 * 
 * Body:
 * - origin: how the interest was discovered
 * - interest_id?: specific interest template ID
 * - context?: additional context
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companionId } = await params;
    const rawBody: unknown = await request.json();
    const parseResult = InterestPostSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { origin, interest_id, context } = parseResult.data;

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
    
    // Validate interest_id if provided
    if (interest_id) {
      const template = INTEREST_TEMPLATES.find(t => t.id === interest_id);
      if (!template) {
        return NextResponse.json(
          { 
            error: 'Invalid interest_id',
            valid_ids: INTEREST_TEMPLATES.map(t => ({ id: t.id, name: t.name })),
          },
          { status: 400 }
        );
      }
    }
    
    // Discover new interest
    const newInterest = await discoverNewInterest(
      companionId,
      origin,
      {
        specificInterestId: interest_id,
        conversationContext: context,
      }
    );
    
    if (!newInterest) {
      return NextResponse.json(
        { 
          error: 'Could not discover new interest',
          message: 'Companion may already have all available interests or the specific interest',
        },
        { status: 409 }
      );
    }
    
    return NextResponse.json({
      success: true,
      interest: newInterest,
      message: `${newInterest.interest_name} discovered!`,
    });
    
  } catch (error) {
    console.error('Interests POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/companion/[id]/interests
 * 
 * Update an interest (add experience, etc.)
 * 
 * Body:
 * - interest_id: ID of interest to update
 * - action: 'add_experience' | 'update_strength'
 * - amount: experience or strength amount
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companionId } = await params;
    const rawBody: unknown = await request.json();
    const parseResult = InterestPutSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { interest_id, action, amount, context } = parseResult.data;

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
    
    // Verify interest belongs to companion
    const { data: interest } = await supabase
      .from('companion_interests')
      .select('*')
      .eq('id', interest_id)
      .eq('companion_id', companionId)
      .single() as unknown as { data: Pick<CompanionInterestRow, 'strength' | 'conversation_mentions'> | null };
    
    if (!interest) {
      return NextResponse.json(
        { error: 'Interest not found' },
        { status: 404 }
      );
    }
    
    if (action === 'add_experience') {
      const experienceAmount = typeof amount === 'number' ? amount : 10;
      const result = await addInterestExperience(interest_id, experienceAmount, context);
      
      // Fetch updated interest
      const { data: updatedInterest } = await supabase
        .from('companion_interests')
        .select('*')
        .eq('id', interest_id)
        .single() as unknown as { data: CompanionInterestRow | null };
      
      return NextResponse.json({
        success: true,
        interest: updatedInterest,
        leveled_up: result.leveledUp,
        new_stage: result.newStage,
      });
    }
    
    if (action === 'update_strength') {
      const newStrength = Math.max(0, Math.min(100, typeof amount === 'number' ? amount : interest.strength));

      const { data: updatedInterest, error: updateError } = await supabase
        .from('companion_interests')
        .update({ strength: newStrength })
        .eq('id', interest_id)
        .select()
        .single() as unknown as { data: CompanionInterestRow | null; error: Error | null };
      
      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to update interest' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        interest: updatedInterest,
      });
    }
    
    if (action === 'increment_mentions') {
      // Increment conversation mentions count
      const { data: updatedInterest, error: updateError } = await supabase
        .from('companion_interests')
        .update({
          conversation_mentions: (interest.conversation_mentions || 0) + 1,
          last_engaged: new Date().toISOString(),
        })
        .eq('id', interest_id)
        .select()
        .single() as unknown as { data: CompanionInterestRow | null; error: Error | null };
      
      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to update interest' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        interest: updatedInterest,
      });
    }
    
    return NextResponse.json(
      { 
        error: 'Invalid action',
        valid_actions: ['add_experience', 'update_strength', 'increment_mentions'],
      },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Interests PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/companion/[id]/interests
 * 
 * Remove an interest.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companionId } = await params;
    const { searchParams } = new URL(request.url);
    const interestId = searchParams.get('interest_id');
    
    if (!interestId) {
      return NextResponse.json(
        { error: 'interest_id is required' },
        { status: 400 }
      );
    }
    
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
    
    // Delete interest
    const { error: deleteError } = await supabase
      .from('companion_interests')
      .delete()
      .eq('id', interestId)
      .eq('companion_id', companionId);
    
    if (deleteError) {
      console.error('Error deleting interest:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete interest' },
        { status: 500 }
      );
    }
    
    // Also delete related connections
    await supabase
      .from('interest_connections')
      .delete()
      .or(`interest_id.eq.${interestId},related_interest_id.eq.${interestId}`);
    
    return NextResponse.json({
      success: true,
      message: 'Interest deleted',
    });
    
  } catch (error) {
    console.error('Interests DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
