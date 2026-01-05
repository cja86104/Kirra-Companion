-- ============================================================================
-- MIGRATION 6: MEMORY CATEGORIES AND MEMORIES TABLES
-- ============================================================================

-- Memory Categories table
CREATE TABLE memory_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  color TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default categories
INSERT INTO memory_categories (name, description, icon, color, priority, is_system) VALUES
  ('facts', 'Factual information about the user', 'BookOpen', '#3B82F6', 10, TRUE),
  ('preferences', 'User likes, dislikes, and preferences', 'Heart', '#EC4899', 9, TRUE),
  ('relationships', 'Information about user relationships', 'Users', '#8B5CF6', 8, TRUE),
  ('events', 'Important events and dates', 'Calendar', '#F59E0B', 7, TRUE),
  ('emotions', 'Emotional moments and feelings shared', 'Smile', '#10B981', 6, TRUE),
  ('goals', 'User goals and aspirations', 'Target', '#6366F1', 5, TRUE),
  ('stories', 'Stories and experiences shared', 'Book', '#14B8A6', 4, TRUE),
  ('inside_jokes', 'Shared humor and inside jokes', 'Laugh', '#F97316', 3, TRUE),
  ('daily', 'Day-to-day details', 'Sun', '#64748B', 1, TRUE);

-- ============================================================================
-- MEMORIES TABLE
-- ============================================================================

CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  companion_id UUID NOT NULL REFERENCES companions(id) ON DELETE CASCADE,
  category_id UUID REFERENCES memory_categories(id) ON DELETE SET NULL,
  title TEXT,
  content TEXT NOT NULL,
  embedding vector(1536),
  importance_score NUMERIC(3, 2) NOT NULL DEFAULT 0.5 CHECK (importance_score >= 0 AND importance_score <= 1),
  emotional_context JSONB,
  source_message_id UUID,
  source_conversation_id UUID,
  is_core_memory BOOLEAN NOT NULL DEFAULT FALSE,
  last_accessed TIMESTAMPTZ,
  access_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_memories_companion_id ON memories(companion_id);
CREATE INDEX idx_memories_category_id ON memories(category_id);
CREATE INDEX idx_memories_importance ON memories(importance_score DESC);
CREATE INDEX idx_memories_is_core ON memories(is_core_memory) WHERE is_core_memory = TRUE;
CREATE INDEX idx_memories_created_at ON memories(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_memories_updated_at
  BEFORE UPDATE ON memories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view memories of own companions"
  ON memories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM companions
      WHERE companions.id = memories.companion_id
      AND companions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create memories for own companions"
  ON memories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companions
      WHERE companions.id = memories.companion_id
      AND companions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update memories of own companions"
  ON memories FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM companions
      WHERE companions.id = memories.companion_id
      AND companions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete memories of own companions"
  ON memories FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM companions
      WHERE companions.id = memories.companion_id
      AND companions.user_id = auth.uid()
    )
  );

-- ============================================================================
-- MEMORY ACCESS LOG TABLE
-- ============================================================================

CREATE TABLE memory_access_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  companion_id UUID NOT NULL REFERENCES companions(id) ON DELETE CASCADE,
  access_type memory_access_type NOT NULL,
  context TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_memory_access_log_memory_id ON memory_access_log(memory_id);
CREATE INDEX idx_memory_access_log_companion_id ON memory_access_log(companion_id);

ALTER TABLE memory_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view memory access for own companions"
  ON memory_access_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM companions
      WHERE companions.id = memory_access_log.companion_id
      AND companions.user_id = auth.uid()
    )
  );

-- ============================================================================
-- SEMANTIC MEMORY SEARCH FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION match_memories(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  p_companion_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    memories.id,
    memories.content,
    1 - (memories.embedding <=> query_embedding) AS similarity
  FROM memories
  WHERE 
    memories.embedding IS NOT NULL
    AND (p_companion_id IS NULL OR memories.companion_id = p_companion_id)
    AND 1 - (memories.embedding <=> query_embedding) > match_threshold
  ORDER BY memories.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
