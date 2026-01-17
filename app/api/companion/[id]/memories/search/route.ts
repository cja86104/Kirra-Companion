import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateEmbedding, cosineSimilarity } from '@/lib/ai/embeddings';

interface SearchRequestBody {
  query: string;
  limit?: number;
}

// Type for memory with category joined
interface MemorySearchResult {
  id: string;
  summary: string | null;
  content: string;
  importance: number;
  embedding: number[] | null;
  memory_type: string;
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
      .select('id, summary, content, importance, embedding, memory_type')
      .eq('companion_id', companionId)
      .eq('is_active', true)
      .order('importance', { ascending: false });

    if (memoriesError) {
      console.error('Error fetching memories:', memoriesError);
      return NextResponse.json(
        { error: 'Failed to fetch memories' },
        { status: 500 }
      );
    }

    const memories = memoriesData as MemorySearchResult[] | null;

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
      importance: number;
      similarity: number;
      category: string;
    }>;

    if (memoriesWithEmbeddings.length > 0) {
      // Use semantic search with embeddings
      const queryEmbedding = await generateEmbedding(query);

      results = memoriesWithEmbeddings
        .map((memory) => ({
          id: memory.id,
          title: memory.summary,
          content: memory.content,
          importance: memory.importance,
          similarity: cosineSimilarity(queryEmbedding, memory.embedding as number[]),
          category: memory.memory_type,
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    } else {
      // Fallback to text-based search
      const lowerQuery = query.toLowerCase();
      
      results = memories
        .filter((m) => 
          (m.summary?.toLowerCase().includes(lowerQuery)) ||
          m.content.toLowerCase().includes(lowerQuery)
        )
        .map((memory) => ({
          id: memory.id,
          title: memory.summary,
          content: memory.content,
          importance: memory.importance,
          similarity: 1, // Perfect match for text search
          category: memory.memory_type,
        }))
        .slice(0, limit);
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Memory search error:', error);
    return NextResponse.json(
      { error: 'Failed to search memories' },
      { status: 500 }
    );
  }
}
