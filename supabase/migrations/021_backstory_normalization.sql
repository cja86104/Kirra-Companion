-- Migration: 021_backstory_normalization
--
-- Adds two nullable columns to the companions table to support register-normalized
-- backstories. Neither column has a default; existing rows remain unaffected until
-- the one-time backfill script (scripts/backfill-backstory-normalization.ts) runs.
--
-- After applying this migration:
--   1. Fill in the system prompt constant in lib/companion/backstory-normalizer.ts (Section 2).
--   2. Run the backfill: npx tsx scripts/backfill-backstory-normalization.ts
--   3. Regenerate Supabase types if your project uses generated types.

ALTER TABLE companions
  ADD COLUMN IF NOT EXISTS backstory_normalized TEXT,
  ADD COLUMN IF NOT EXISTS backstory_normalized_hash TEXT;

COMMENT ON COLUMN companions.backstory_normalized IS
  'Register-normalized version of the raw backstory column. Converted from '
  '3rd-person narrative prose to 2nd-person factual register by '
  'backstory-normalizer.ts (DeepSeek V3 via OpenRouter). Preferred over '
  'backstory in chat system prompts when non-null. Null until normalized.';

COMMENT ON COLUMN companions.backstory_normalized_hash IS
  'SHA-256 hex digest (first 16 chars) of the backstory text that was used '
  'as input during the most recent normalization run. Used at write time to '
  'detect unchanged backstory text and skip redundant re-normalization calls.';
