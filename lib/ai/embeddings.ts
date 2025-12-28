import OpenAI from 'openai';
import { AI_CONFIG } from './config';

// Singleton client instance
let openaiClient: OpenAI | null = null;

/**
 * Get or create OpenAI client instance
 * Used exclusively for embeddings (Anthropic doesn't offer embeddings)
 */
export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    
    openaiClient = new OpenAI({
      apiKey,
    });
  }
  
  return openaiClient;
}

/**
 * Generate embedding vector for text
 * Used for semantic memory search
 * 
 * @param text - Text to generate embedding for
 * @param model - Embedding model to use (default: text-embedding-3-small)
 * @returns Embedding vector (1536 dimensions for small, 3072 for large)
 */
export async function generateEmbedding(
  text: string,
  model: string = AI_CONFIG.openai.models.embedding
): Promise<number[]> {
  const client = getOpenAIClient();
  
  try {
    const response = await client.embeddings.create({
      model,
      input: text,
      encoding_format: 'float',
    });
    
    return response.data[0]?.embedding || [];
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      console.error(`OpenAI Embeddings Error: ${error.status} - ${error.message}`);
      
      if (error.status === 429) {
        throw new Error('Rate limit exceeded for embeddings. Please try again.');
      }
    }
    
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts in batch
 * More efficient than calling generateEmbedding multiple times
 * 
 * @param texts - Array of texts to generate embeddings for
 * @param model - Embedding model to use
 * @returns Array of embedding vectors
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  model: string = AI_CONFIG.openai.models.embedding
): Promise<number[][]> {
  if (texts.length === 0) return [];
  
  const client = getOpenAIClient();
  
  try {
    const response = await client.embeddings.create({
      model,
      input: texts,
      encoding_format: 'float',
    });
    
    // Sort by index to maintain order
    const sorted = response.data.sort((a, b) => a.index - b.index);
    return sorted.map((item) => item.embedding);
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      console.error(`OpenAI Batch Embeddings Error: ${error.status} - ${error.message}`);
    }
    
    throw error;
  }
}

/**
 * Calculate cosine similarity between two vectors
 * Used for finding similar memories
 * 
 * @param a - First vector
 * @param b - Second vector
 * @returns Similarity score between -1 and 1 (higher = more similar)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  
  if (magnitude === 0) return 0;
  
  return dotProduct / magnitude;
}

/**
 * Find most similar items from a list based on embedding similarity
 * 
 * @param queryEmbedding - Embedding of the query
 * @param items - Array of items with embeddings
 * @param topK - Number of results to return
 * @returns Top K most similar items with similarity scores
 */
export function findMostSimilar<T extends { embedding: number[] }>(
  queryEmbedding: number[],
  items: T[],
  topK: number = 5
): Array<T & { similarity: number }> {
  const withScores = items.map((item) => ({
    ...item,
    similarity: cosineSimilarity(queryEmbedding, item.embedding),
  }));
  
  // Sort by similarity descending and take top K
  return withScores
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}
