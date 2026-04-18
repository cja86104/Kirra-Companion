-- ============================================================================
-- MIGRATION 016: SAFETY LOG RLS HARDENING
--
-- Problem: Four tables had INSERT policies named "Service role can insert …"
-- with WITH CHECK (TRUE). That body accepts ALL inserts — including those from
-- the anon/authenticated-user-context Supabase client. An authenticated user
-- could therefore forge safety audit entries (crisis logs, behavioral detection
-- logs, audit logs, achievement grants) by calling the user-context client
-- directly.
--
-- Fix: Drop all four permissive INSERT policies. The service role bypasses RLS
-- automatically, so those policies were never needed for server-side writes.
-- Removing them closes the tables to the anon/authenticated roles entirely —
-- no INSERT policy means INSERT is denied by default under RLS.
--
-- After this migration all safety-log writes MUST use the service-role
-- Supabase admin client (SUPABASE_SERVICE_ROLE_KEY). Routes that previously
-- used the user-context client for these inserts must be updated in the same
-- deployment (see A.3 and A.4 in the security fix spec).
-- ============================================================================

-- crisis_logs: only service-role writes should ever be allowed
DROP POLICY IF EXISTS "Service role can insert crisis logs" ON crisis_logs;

-- behavioral_detection_logs: minor-detection audit trail must not be forgeable
DROP POLICY IF EXISTS "Service role can insert behavioral detection logs" ON behavioral_detection_logs;

-- audit_logs: account-action audit trail must not be forgeable by users
DROP POLICY IF EXISTS "Service role can insert audit logs" ON audit_logs;

-- user_achievements: achievement grants must originate from server logic only
DROP POLICY IF EXISTS "Service role can insert achievements" ON user_achievements;
