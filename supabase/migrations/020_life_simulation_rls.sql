-- ============================================================================
-- MIGRATION 020: DEFENSIVE RLS POLICIES FOR LIFE-SIMULATION TABLES
--
-- Section F audit revealed that `simulation_states` and `proactive_messages`
-- have row-level security enabled but are missing INSERT/UPDATE policies.
-- In practice this has not mattered yet because the only writers are the
-- cron endpoints — after the F.2/F.3 refactor those will use the service
-- role, which bypasses RLS.
--
-- This migration adds the missing policies as **defense in depth** for
-- future user-facing features (e.g. a "reset my simulation" button, a UI
-- that lets users mark proactive messages as dismissed, etc.). Service
-- role operations continue to bypass RLS as before.
--
-- Style matches the existing policies on each table:
--   simulation_states — ownership check via EXISTS over companions table
--                       (matches the existing SELECT policy)
--   proactive_messages — direct auth.uid() = user_id
--                        (matches the existing SELECT and UPDATE policies)
--
-- `companion_journal_entries` already has a FOR ALL policy from migration
-- 011 so it covers its future manual-journal-entry feature path.
-- Intentionally not adding DELETE policies: simulation state rows CASCADE
-- with companions, and proactive messages are history records that users
-- should not be able to delete outright.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- simulation_states — INSERT + UPDATE
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can insert simulation state for own companions"
  ON simulation_states;
CREATE POLICY "Users can insert simulation state for own companions"
  ON simulation_states FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companions
      WHERE companions.id = simulation_states.companion_id
        AND companions.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update simulation state of own companions"
  ON simulation_states;
CREATE POLICY "Users can update simulation state of own companions"
  ON simulation_states FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM companions
      WHERE companions.id = simulation_states.companion_id
        AND companions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companions
      WHERE companions.id = simulation_states.companion_id
        AND companions.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- proactive_messages — INSERT
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can insert own proactive messages"
  ON proactive_messages;
CREATE POLICY "Users can insert own proactive messages"
  ON proactive_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);
