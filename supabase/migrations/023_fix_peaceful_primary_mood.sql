-- 023_fix_peaceful_primary_mood.sql
--
-- Production data fix for the 'peaceful' primary mood bug surfaced during
-- Phase 6D-cleanup-1.
--
-- Background:
--   `MOOD_TRANSITIONS.calm` in lib/companion/life-simulation.ts contained the
--   string 'peaceful' (cast `as PrimaryMood` to silence the compiler), but
--   'peaceful' is NOT a member of the `PrimaryMood` union. When the random
--   transition selector picked 'peaceful', it was written to
--   companions.current_mood->>'primary' and
--   life_events.mood_after->>'primary' as a free-text JSONB value. Once on
--   that value, downstream lookups against `MOOD_TRANSITIONS[currentMood.primary]`
--   returned undefined, breaking the drift logic.
--
-- This migration unsticks any row currently parked on 'peaceful' by
-- substituting 'calm' (the parent mood whose transition list produced the
-- bug — semantically the most honest unstick). The companion code change
-- in 6D-cleanup-1b removes 'peaceful' from MOOD_TRANSITIONS.calm, so once
-- this migration is applied no new rows can land on 'peaceful' from the
-- simulation path.
--
-- Verification queries (must all return 0 after this migration runs):
--   SELECT COUNT(*) FROM companions WHERE current_mood->>'primary' = 'peaceful';
--   SELECT COUNT(*) FROM life_events WHERE mood_after->>'primary' = 'peaceful';
--   SELECT COUNT(*) FROM life_events WHERE mood_before->>'primary' = 'peaceful';

-- 1. Unstick any companion currently on 'peaceful'.
UPDATE companions
SET current_mood = jsonb_set(
  current_mood,
  '{primary}',
  '"calm"'::jsonb
)
WHERE current_mood->>'primary' = 'peaceful';

-- 2. Clean any historical life_events.mood_after row that captured 'peaceful'.
UPDATE life_events
SET mood_after = jsonb_set(
  mood_after,
  '{primary}',
  '"calm"'::jsonb
)
WHERE mood_after->>'primary' = 'peaceful';

-- 3. Clean any life_events.mood_before row defensively. Audit at section
--    6D-cleanup-1b time showed 0 such rows, but the column is JSONB-typed
--    and could absorb 'peaceful' through any path that snapshots a stale
--    mood, so we cover it.
UPDATE life_events
SET mood_before = jsonb_set(
  mood_before,
  '{primary}',
  '"calm"'::jsonb
)
WHERE mood_before->>'primary' = 'peaceful';
