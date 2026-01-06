import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateEmbedding, cosineSimilarity } from '@/lib/ai/embeddings';
import type { Memory, MemoryCategoryRow } from '@/types/database';

interface SearchRequestBody {
  query: string;
  limit?: number;
}

// Type for memory with category joined
interface MemoryWithCategory extends Pick<Memory, 'id' | 'title' | 'content' | 'importance_score' | 'embedding'> {
  memory_categories: Pick<MemoryCategoryRow, 'name'> | null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companionId } = await params;
    const body: SearchRequestBody = await request.json();
    const { query, limit = 10 } = body;

    if (!query?.trim()) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify user owns this companion
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: companionData, error: companionError } = await supabase
      .from('companions')
      .select('id')
      .eq('id', companionId)
      .eq('user_id', user.id)
      .single();

    if (companionError || !companionData) {
      return NextResponse.json(
        { error: 'Companion not found' },
        { status: 404 }
      );
    }

    // Get all memories for this companion
    const { data: memoriesData, error: memoriesError } = await supabase
      .from('memories')
      .select(`
        id,
        title,
        content,
        importance_score,
        embedding,
        memory_categories (
          name
        )
      `)
      .eq('companion_id', companionId)
      .order('importance_score', { ascending: false });

    if (memoriesError) {
      console.error('Error fetching memories:', memoriesError);
      return NextResponse.json(
        { error: 'Failed to fetch memories' },
        { status: 500 }
      );
    }

    const memories = memoriesData as MemoryWithCategory[] | null;

    if (!memories || memories.length === 0) {
      return NextResponse.json({ results: [] });
    }

    // Check if we have embeddings stored
    const memoriesWithEmbeddings = memories.filter(
      (m) => m.embedding && Array.isArray(m.embedding) && m.embedding.length > 0
    );

    let results: Array<{
      id: string;
      title: string | null;
      content: string;
      importance_score: number;
      similarity: number;
      category?: string;
    }>;

    if (memoriesWithEmbeddings.length > 0) {
      // Use semantic search with embeddings
      const queryEmbedding = await generateEmbedding(query);

      results = memoriesWithEmbeddings
        .map((memory) => ({
          id: memory.id,
          title: memory.title,
          content: memory.content,
          importance_score: memory.importance_score || 0,
          similarity: cosineSimilarity(queryEmbedding, memory.embedding as number[]),
          category: memory.memory_categories?.name,
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    } else {
      // Fallback to text-based search
      const lowerQuery = query.toLowerCase();
      
      results = memories
        .filter((m) => 
          (m.title?.toLowerCase().includes(lowerQuery)) ||
          m.content.toLowerCase().includes(lowerQuery)
        )
        .map((memory) => ({
          id: memory.id,
          title: memory.title,
          content: memory.content,
          importance_score: memory.importance_score || 0,
          similarity: 1, // Perfect match for text search
          category: memory.memory_categories?.name,
        }))
        .slice(0, limit);
    }

    // Log search for analytics
    await supabase
      .from('memory_access_log')
      .insert({
        memory_id: results[0]?.id || null,
        companion_id: companionId,
        access_type: 'search',
        context: { query, results_count: results.length },
      } as never);

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Memory search error:', error);
    return NextResponse.json(
      { error: 'Failed to search memories' },
      { status: 500 }
    );
  }
}
