-- ============================================================================
-- MIGRATION 9: EXTRAS
-- Data exports, milestones, achievements, simulation states, interests
-- ============================================================================

-- ============================================================================
-- DATA EXPORTS TABLE (GDPR)
-- ============================================================================

CREATE TABLE data_exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status export_status NOT NULL DEFAULT 'pending',
  file_url TEXT,
  file_size BIGINT,
  expires_at TIMESTAMPTZ,
  error_message TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_data_exports_user_id ON data_exports(user_id);
CREATE INDEX idx_data_exports_status ON data_exports(status);

ALTER TABLE data_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own exports"
  ON data_exports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can request exports"
  ON data_exports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- RELATIONSHIP MILESTONES TABLE
-- ============================================================================

CREATE TABLE relationship_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  companion_id UUID NOT NULL REFERENCES companions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  threshold_value INTEGER,
  achieved_value INTEGER,
  unlocks TEXT[] DEFAULT '{}',
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  celebrated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_relationship_milestones_companion_id ON relationship_milestones(companion_id);
CREATE INDEX idx_relationship_milestones_user_id ON relationship_milestones(user_id);
CREATE INDEX idx_relationship_milestones_type ON relationship_milestones(milestone_type);

ALTER TABLE relationship_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own milestones"
  ON relationship_milestones FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create milestones"
  ON relationship_milestones FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own milestones"
  ON relationship_milestones FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- USER ACHIEVEMENTS TABLE
-- ============================================================================

CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  rarity achievement_rarity NOT NULL DEFAULT 'common',
  xp_reward INTEGER NOT NULL DEFAULT 0,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_rarity ON user_achievements(rarity);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements"
  ON user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert achievements"
  ON user_achievements FOR INSERT
  WITH CHECK (TRUE);

-- ============================================================================
-- SIMULATION STATES TABLE
-- ============================================================================

CREATE TABLE simulation_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  companion_id UUID NOT NULL REFERENCES companions(id) ON DELETE CASCADE UNIQUE,
  last_simulation_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activities_today INTEGER NOT NULL DEFAULT 0,
  last_activity_at TIMESTAMPTZ,
  last_journal_at TIMESTAMPTZ,
  last_proactive_message_at TIMESTAMPTZ,
  is_sleeping BOOLEAN NOT NULL DEFAULT FALSE,
  current_activity_id UUID,
  next_scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  simulation_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_simulation_states_companion_id ON simulation_states(companion_id);
CREATE INDEX idx_simulation_states_next_scheduled ON simulation_states(next_scheduled_at);

CREATE TRIGGER update_simulation_states_updated_at
  BEFORE UPDATE ON simulation_states
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE simulation_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view simulation state of own companions"
  ON simulation_states FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM companions
      WHERE companions.id = simulation_states.companion_id
      AND companions.user_id = auth.uid()
    )
  );

-- Auto-create simulation state when companion is created
CREATE OR REPLACE FUNCTION create_simulation_state()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO simulation_states (companion_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER create_simulation_on_companion_insert
  AFTER INSERT ON companions
  FOR EACH ROW
  EXECUTE FUNCTION create_simulation_state();

-- ============================================================================
-- COMPANION INTERESTS TABLE
-- ============================================================================

CREATE TABLE companion_interests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  companion_id UUID NOT NULL REFERENCES companions(id) ON DELETE CASCADE,
  interest_name TEXT NOT NULL,
  interest_category TEXT NOT NULL,
  interest_level NUMERIC(3, 2) DEFAULT 0.5,
  strength NUMERIC(3, 2) NOT NULL DEFAULT 0.5,
  experience_points INTEGER NOT NULL DEFAULT 0,
  stage TEXT NOT NULL DEFAULT 'curious' CHECK (stage IN ('curious', 'learning', 'practicing', 'skilled', 'mastered')),
  growth_rate NUMERIC(3, 2) DEFAULT 0.5,
  source TEXT,
  source_details TEXT,
  origin TEXT NOT NULL DEFAULT 'initial',
  shared_with_user BOOLEAN NOT NULL DEFAULT FALSE,
  user_interest_level NUMERIC(3, 2),
  times_discussed INTEGER DEFAULT 0,
  conversation_mentions INTEGER NOT NULL DEFAULT 0,
  times_practiced INTEGER NOT NULL DEFAULT 0,
  last_engaged TIMESTAMPTZ,
  related_interests TEXT[] DEFAULT '{}',
  favorite_aspects TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  developed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_companion_interests_companion_id ON companion_interests(companion_id);
CREATE INDEX idx_companion_interests_category ON companion_interests(interest_category);
CREATE INDEX idx_companion_interests_strength ON companion_interests(strength DESC);

CREATE TRIGGER update_companion_interests_updated_at
  BEFORE UPDATE ON companion_interests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE companion_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view interests of own companions"
  ON companion_interests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM companions
      WHERE companions.id = companion_interests.companion_id
      AND companions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage interests of own companions"
  ON companion_interests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM companions
      WHERE companions.id = companion_interests.companion_id
      AND companions.user_id = auth.uid()
    )
  );
