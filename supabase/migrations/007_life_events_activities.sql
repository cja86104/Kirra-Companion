-- ============================================================================
-- MIGRATION 7: LIFE EVENTS AND ACTIVITIES TABLES
-- ============================================================================

-- Life Events table
CREATE TABLE life_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  companion_id UUID NOT NULL REFERENCES companions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  narrative TEXT,
  emoji TEXT,
  significance event_significance NOT NULL DEFAULT 'minor',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  mood_before JSONB,
  mood_after JSONB,
  involves_user BOOLEAN NOT NULL DEFAULT FALSE,
  should_notify_user BOOLEAN NOT NULL DEFAULT FALSE,
  notification_message TEXT,
  notified_at TIMESTAMPTZ,
  shareable BOOLEAN NOT NULL DEFAULT TRUE,
  shared_with_user BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_life_events_companion_id ON life_events(companion_id);
CREATE INDEX idx_life_events_event_type ON life_events(event_type);
CREATE INDEX idx_life_events_occurred_at ON life_events(occurred_at DESC);
CREATE INDEX idx_life_events_significance ON life_events(significance);
CREATE INDEX idx_life_events_should_notify ON life_events(should_notify_user) WHERE should_notify_user = TRUE AND notified_at IS NULL;

-- RLS
ALTER TABLE life_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view life events of own companions"
  ON life_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM companions
      WHERE companions.id = life_events.companion_id
      AND companions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create life events for own companions"
  ON life_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companions
      WHERE companions.id = life_events.companion_id
      AND companions.user_id = auth.uid()
    )
  );

-- ============================================================================
-- ACTIVITIES TABLE
-- ============================================================================

CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  energy_cost INTEGER NOT NULL DEFAULT 10,
  fun_value INTEGER NOT NULL DEFAULT 0,
  social_value INTEGER NOT NULL DEFAULT 0,
  creativity_value INTEGER NOT NULL DEFAULT 0,
  intellectual_value INTEGER NOT NULL DEFAULT 0,
  min_tier subscription_tier NOT NULL DEFAULT 'free',
  is_multiplayer BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default activities
INSERT INTO activities (name, description, category, duration_minutes, energy_cost, fun_value, social_value, creativity_value, intellectual_value, min_tier, is_multiplayer, icon) VALUES
  ('Trivia Game', 'Test your knowledge together!', 'entertainment', 15, 10, 25, 20, 0, 15, 'free', TRUE, 'HelpCircle'),
  ('Story Time', 'Create a story together', 'creative', 30, 15, 20, 15, 30, 10, 'basic', TRUE, 'Book'),
  ('20 Questions', 'Guess what I''m thinking', 'entertainment', 10, 5, 20, 25, 0, 10, 'free', TRUE, 'MessageCircle'),
  ('Would You Rather', 'Make impossible choices', 'social', 15, 5, 25, 30, 0, 5, 'free', TRUE, 'Scale'),
  ('Deep Conversation', 'Explore meaningful topics', 'intellectual', 45, 20, 15, 25, 10, 30, 'basic', TRUE, 'Brain'),
  ('Music Session', 'Listen to music together', 'relaxation', 30, 5, 30, 20, 15, 5, 'free', TRUE, 'Music'),
  ('Meditation', 'Find peace together', 'self_care', 20, -15, 10, 10, 0, 5, 'free', TRUE, 'Flower');

CREATE INDEX idx_activities_category ON activities(category);
CREATE INDEX idx_activities_min_tier ON activities(min_tier);
CREATE INDEX idx_activities_is_active ON activities(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- ACTIVITY SESSIONS TABLE
-- ============================================================================

CREATE TABLE activity_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  companion_id UUID NOT NULL REFERENCES companions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  score INTEGER,
  outcome JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_sessions_activity_id ON activity_sessions(activity_id);
CREATE INDEX idx_activity_sessions_companion_id ON activity_sessions(companion_id);
CREATE INDEX idx_activity_sessions_user_id ON activity_sessions(user_id);
CREATE INDEX idx_activity_sessions_started_at ON activity_sessions(started_at DESC);

ALTER TABLE activity_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity sessions"
  ON activity_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create activity sessions"
  ON activity_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activity sessions"
  ON activity_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- PROACTIVE MESSAGES TABLE
-- ============================================================================

CREATE TABLE proactive_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  companion_id UUID NOT NULL REFERENCES companions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_proactive_messages_companion_id ON proactive_messages(companion_id);
CREATE INDEX idx_proactive_messages_user_id ON proactive_messages(user_id);
CREATE INDEX idx_proactive_messages_created_at ON proactive_messages(created_at DESC);
CREATE INDEX idx_proactive_messages_unread ON proactive_messages(user_id, read) WHERE read = FALSE;

ALTER TABLE proactive_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own proactive messages"
  ON proactive_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own proactive messages"
  ON proactive_messages FOR UPDATE
  USING (auth.uid() = user_id);
