-- ============================================================================
-- MIGRATION 018: API RATE LIMITS
--
-- Adds a per-user, per-route rate limiting table and an atomic increment
-- function used by lib/rate-limit.ts. All writes go through the service-role
-- admin client (SECURITY DEFINER function + service role bypass RLS), so the
-- only user-facing policy is a SELECT so users can inspect their own limits.
--
-- Cleanup: rows are small and low-volume. Old rows (window_start older than
-- 48 hours) are harmless and can be pruned by a maintenance job at any time:
--   DELETE FROM api_rate_limits WHERE window_start < NOW() - INTERVAL '48 hours';
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_rate_limits (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  route_key   TEXT        NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count       INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE api_rate_limits
  ADD CONSTRAINT api_rate_limits_user_route_window_key
  UNIQUE (user_id, route_key, window_start);

CREATE INDEX IF NOT EXISTS idx_api_rate_limits_lookup
  ON api_rate_limits (user_id, route_key, window_start);

ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Users can view their own rate limit counters (read-only transparency)
CREATE POLICY "Users can view own rate limits"
  ON api_rate_limits FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTION: increment_rate_limit
--
-- Atomically upserts a rate limit row for the current time window and returns
-- the new count. Called exclusively by lib/rate-limit.ts via the service-role
-- admin client. SECURITY DEFINER so RLS does not interfere.
-- ============================================================================
CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_user_id       UUID,
  p_route_key     TEXT,
  p_window_seconds INTEGER
) RETURNS INTEGER AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_count        INTEGER;
BEGIN
  v_window_start := TO_TIMESTAMP(
    FLOOR(EXTRACT(EPOCH FROM NOW()) / p_window_seconds) * p_window_seconds
  );

  INSERT INTO api_rate_limits (user_id, route_key, window_start, count)
  VALUES (p_user_id, p_route_key, v_window_start, 1)
  ON CONFLICT (user_id, route_key, window_start) DO UPDATE
    SET count = api_rate_limits.count + 1
  RETURNING api_rate_limits.count INTO v_count;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
