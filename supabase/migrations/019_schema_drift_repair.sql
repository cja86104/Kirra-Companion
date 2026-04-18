-- ============================================================================
-- MIGRATION 019: SCHEMA DRIFT REPAIR (memories, data_exports)
--
-- Section C.3 (`as never` → `satisfies`) surfaced application code writing to
-- columns that did not exist in the live schema. Those writes were silently
-- being masked by `as never` casts and would have failed at runtime with
-- "column does not exist" errors against PostgREST.
--
-- This migration adds the missing columns so the application code can be
-- corrected in Section D.2 to use them properly. After this migration runs,
-- `npm run db:generate` will pick up the new columns and the related
-- `as never` sites can be replaced with `satisfies`.
--
-- Affected tables:
--   memories      — adds is_pinned, source_type, is_verified
--   data_exports  — adds export_type
--
-- All ALTER statements use IF NOT EXISTS so this migration is idempotent and
-- safe to re-run. NOT NULL columns include sensible DEFAULTs so existing rows
-- backfill cleanly without a separate UPDATE step.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- MEMORIES
-- ----------------------------------------------------------------------------

-- Pin a memory to the top of the memory palace UI.
-- Default FALSE: pinning is an opt-in user action; existing memories are unpinned.
ALTER TABLE memories
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE;

-- How the memory entered the system. Currently written values: 'manual' (user
-- created via memory-palace UI). Reserved future values: 'chat_extraction'
-- (auto-extracted by lib/companion/memory-extraction.ts), 'imported'.
-- Default 'unknown' is honest about backfilled rows where we cannot determine
-- the original source.
ALTER TABLE memories
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'unknown';

-- User has reviewed and confirmed the memory is correct. Manual creations are
-- treated as verified; chat-extracted memories start unverified until reviewed.
-- Default FALSE: most existing rows are chat-extracted (unverified by definition).
ALTER TABLE memories
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Partial index — pinned memories are a UI shortcut filter, low cardinality.
-- Indexing only the TRUE rows keeps the index tiny.
CREATE INDEX IF NOT EXISTS idx_memories_is_pinned
  ON memories (is_pinned)
  WHERE is_pinned = TRUE;

-- ----------------------------------------------------------------------------
-- DATA_EXPORTS
-- ----------------------------------------------------------------------------

-- Discriminator for the source of an export request. Currently written values:
--   'account_deletion' (from app/api/user/delete/route.ts — record kept for
--                       30-day audit trail of deleted accounts)
--   'user_request'     (from app/settings/data/page.tsx — user-requested
--                       data export — applied as the default below)
-- Default 'user_request' covers the dominant case and existing rows.
ALTER TABLE data_exports
  ADD COLUMN IF NOT EXISTS export_type TEXT NOT NULL DEFAULT 'user_request';
