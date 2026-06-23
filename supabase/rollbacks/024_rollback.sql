-- ============================================================================
-- ROLLBACK for migration 024_fix_handle_new_user_search_path.sql
--
-- WARNING
-- -------
-- Applying this rollback RESTORES the broken pre-024 state of
-- public.handle_new_user() and will cause supabase.auth.signUp() and the
-- new-user path of supabase.auth.signInWithOtp() to fail again with:
--   "Database error saving new user"
--
-- Apply only when intentionally reverting to pre-024 behavior (e.g. to
-- reproduce the original bug in a staging environment).
--
-- This file lives in supabase/rollbacks/ and is NOT picked up by
-- `supabase db push`. Run it manually in the Supabase SQL Editor.
-- ============================================================================

-- Restore the original (broken) function body — no search_path, unqualified
-- table reference. This is intentionally a faithful reproduction of the
-- migration 002_profiles.sql definition.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-bind the trigger.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
