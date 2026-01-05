-- ============================================================================
-- MIGRATION 4: COMPANION DNA TABLE
-- ============================================================================

CREATE TABLE companion_dna (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  companion_id UUID NOT NULL REFERENCES companions(id) ON DELETE CASCADE UNIQUE,
  communication_dialect JSONB DEFAULT '{
    "favoriteExpressions": [],
    "vocabularyLevel": "adaptive",
    "sentenceComplexity": 0.5,
    "emojiUsage": 0.5,
    "formalityLevel": 0.3,
    "uniquePhrases": [],
    "avoidedWords": [],
    "speechPatterns": []
  }',
  emotional_patterns JSONB DEFAULT '{
    "triggers": {},
    "recoveryTime": 0.5,
    "expressionStyle": "balanced",
    "emotionalRange": 0.7
  }',
  core_traits JSONB DEFAULT '{
    "values": [],
    "fears": [],
    "dreams": [],
    "strengths": [],
    "weaknesses": []
  }',
  learning_style_matrix JSONB DEFAULT '{}',
  humor_genome JSONB DEFAULT '{
    "sarcasm": 0.3,
    "wordplay": 0.5,
    "observational": 0.5,
    "selfDeprecating": 0.3,
    "darkHumor": 0.1,
    "intellectual": 0.4,
    "absurdist": 0.3
  }',
  emotional_resonance_map JSONB DEFAULT '{}',
  interest_evolution_tree JSONB DEFAULT '{"roots": [], "branches": [], "leaves": []}',
  memory_weighting_algorithm JSONB DEFAULT '{}',
  growth_areas TEXT[] DEFAULT '{}',
  personality_version INTEGER NOT NULL DEFAULT 1,
  last_evolution TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_companion_dna_companion_id ON companion_dna(companion_id);

-- Trigger for updated_at
CREATE TRIGGER update_companion_dna_updated_at
  BEFORE UPDATE ON companion_dna
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE companion_dna ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own companion DNA"
  ON companion_dna FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM companions
      WHERE companions.id = companion_dna.companion_id
      AND companions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create companion DNA"
  ON companion_dna FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companions
      WHERE companions.id = companion_dna.companion_id
      AND companions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own companion DNA"
  ON companion_dna FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM companions
      WHERE companions.id = companion_dna.companion_id
      AND companions.user_id = auth.uid()
    )
  );

-- Auto-create DNA when companion is created
CREATE OR REPLACE FUNCTION create_companion_dna()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO companion_dna (companion_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER create_dna_on_companion_insert
  AFTER INSERT ON companions
  FOR EACH ROW
  EXECUTE FUNCTION create_companion_dna();
