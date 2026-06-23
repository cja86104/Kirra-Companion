-- ============================================================================
-- MIGRATION 024: FIX handle_new_user() search_path (signup error repair)
--
-- ROOT CAUSE
-- ----------
-- Migration 002_profiles.sql created public.handle_new_user() as
-- SECURITY DEFINER but did NOT declare SET search_path. When Supabase Auth
-- inserts a row into auth.users (during supabase.auth.signUp() or the
-- new-user path of supabase.auth.signInWithOtp()), the trigger fires with
-- a restricted search_path that does not include the public schema, so the
-- unqualified reference to "profiles" inside the function fails to resolve.
--
-- supabase-js surfaces this as the generic AuthApiError on the client:
--   "Database error saving new user"
--
-- The same code path is hit by magic-link / password-reset requests when
-- the user does not yet exist, which is why "request link" also failed.
--
-- FIX
-- ---
-- Recreate the function with:
--   * SET search_path = public, auth   — deterministic resolution
--   * Fully-qualified public.profiles  — defense in depth
--   * OWNER = postgres                 — SECURITY DEFINER privilege correct
--   * Explicit EXECUTE grant to supabase_auth_admin (the role that performs
--     the auth.users insert and therefore fires the trigger)
--
-- The trigger on auth.users does NOT need to be re-created to pick up the
-- new function body — triggers bind to functions by name and CREATE OR
-- REPLACE FUNCTION preserves that binding. The trigger is still dropped
-- and recreated below to (a) guarantee a clean state on partially-applied
-- environments and (b) keep this migration self-contained.
--
-- IDEMPOTENCY
-- -----------
-- Safe to re-run. CREATE OR REPLACE FUNCTION + DROP TRIGGER IF EXISTS +
-- CREATE TRIGGER will converge on the desired state from any prior state.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name'
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- SECURITY DEFINER executes with the function owner's privileges. Pin the
-- owner to `postgres` so the function always has rights to INSERT into
-- public.profiles regardless of who originally created it in any given
-- environment (local dev, staging, production).
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- supabase_auth_admin is the role that performs the auth.users insert and
-- therefore fires this trigger. Make the EXECUTE grant explicit so that
-- future schema-permission tightening on the public schema does not
-- silently re-break signup.
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;

-- Re-assert the trigger exists with the correct binding. AFTER INSERT
-- guarantees the auth.users row is fully written before the profile insert,
-- preserving the foreign key public.profiles.id -> auth.users.id.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
