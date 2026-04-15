-- ============================================================================
-- MIGRATION 13: TRIVIA GAME STATE
--
-- Replaces the in-memory Map<gameId, TriviaGameState> in the API route, which
-- breaks on Vercel because each serverless invocation is an isolated process.
-- Game state is now persisted in Supabase and expires after 1 hour.
-- ============================================================================

CREATE TABLE trivia_games (
  id            TEXT        PRIMARY KEY,
  user_id       UUID        NOT NULL,
  companion_id  UUID        NOT NULL,
  game_state    JSONB       NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trivia_games_user_id    ON trivia_games(user_id);
CREATE INDEX idx_trivia_games_expires_at ON trivia_games(expires_at);

ALTER TABLE trivia_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own trivia games"
  ON trivia_games
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION cleanup_expired_trivia_games()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM trivia_games WHERE expires_at < NOW();
$$;
