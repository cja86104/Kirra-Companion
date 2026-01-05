-- ============================================================================
-- MIGRATION 3: COMPANIONS TABLE
-- ============================================================================

CREATE TABLE companions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  avatar_3d_config JSONB,
  relationship_type relationship_type NOT NULL DEFAULT 'friend',
  relationship_label TEXT,
  personality_base JSONB DEFAULT '{
    "openness": 0.5,
    "conscientiousness": 0.5,
    "extraversion": 0.5,
    "agreeableness": 0.7,
    "neuroticism": 0.3,
    "humor": 0.5,
    "empathy": 0.7,
    "curiosity": 0.6,
    "playfulness": 0.5,
    "assertiveness": 0.4
  }',
  backstory TEXT,
  affection_level INTEGER NOT NULL DEFAULT 50 CHECK (affection_level >= 0 AND affection_level <= 100),
  trust_level INTEGER NOT NULL DEFAULT 50 CHECK (trust_level >= 0 AND trust_level <= 100),
  current_mood JSONB DEFAULT '{"primary": "neutral", "intensity": 0.5}',
  needs JSONB DEFAULT '{
    "social": 70,
    "energy": 80,
    "fun": 60,
    "comfort": 75,
    "affection": 50,
    "intellectual": 60,
    "creativity": 50,
    "lastUpdated": null,
    "lastInteraction": null
  }',
  voice_config JSONB,
  interests TEXT[] DEFAULT '{}',
  quirks TEXT[] DEFAULT '{}',
  total_messages INTEGER NOT NULL DEFAULT 0,
  total_voice_minutes NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total_activities INTEGER NOT NULL DEFAULT 0,
  last_interaction TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_companions_user_id ON companions(user_id);
CREATE INDEX idx_companions_relationship_type ON companions(relationship_type);
CREATE INDEX idx_companions_is_active ON companions(is_active);
CREATE INDEX idx_companions_last_interaction ON companions(last_interaction DESC NULLS LAST);

-- Trigger for updated_at
CREATE TRIGGER update_companions_updated_at
  BEFORE UPDATE ON companions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE companions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own companions"
  ON companions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create companions"
  ON companions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own companions"
  ON companions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own companions"
  ON companions FOR DELETE
  USING (auth.uid() = user_id);
