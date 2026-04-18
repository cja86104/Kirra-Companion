import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { generateEmbedding, cosineSimilarity } from '@/lib/ai/embeddings';

const MemorySearchSchema = z.object({
  query: z.string().min(1).max(500),
  limit: z.number().int().min(1).max(100).optional().default(10),
});

// Type for memory with category joined
interface MemorySearchResult {
  id: string;
  title: string | null;
  summary: string | null;
  content: string;
  importance_score: number;
  embedding: number[] | null;
  memory_type: string | null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companionId } = await params;
    const rawBody: unknown = await request.json();
    const parseResult = MemorySearchSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { query, limit } = parseResult.data;

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
      .select('id, title, summary, content, importance_score, embedding, memory_type')
      .eq('companion_id', companionId)
      .order('importance_score', { ascending: false });

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
          title: memory.title || memory.summary,
          content: memory.content,
          importance: memory.importance_score,
          similarity: cosineSimilarity(queryEmbedding, memory.embedding as number[]),
          category: memory.memory_type || 'general',
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    } else {
      // Fallback to text-based search
      const lowerQuery = query.toLowerCase();
      
      results = memories
        .filter((m) => 
          (m.title?.toLowerCase().includes(lowerQuery)) ||
          (m.summary?.toLowerCase().includes(lowerQuery)) ||
          m.content.toLowerCase().includes(lowerQuery)
        )
        .map((memory) => ({
          id: memory.id,
          title: memory.title || memory.summary,
          content: memory.content,
          importance: memory.importance_score,
          similarity: 1,
          category: memory.memory_type || 'general',
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
