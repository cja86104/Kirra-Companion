-- Migration 022 — Consolidate activity categories (10 → 6)
--
-- Drops 'exploration', 'physical', 'relaxation', and 'productivity' from the set
-- of valid activity_category values used by companion_activities.activity_category.
-- ActivityCategory in types/life-simulation.ts was narrowed to 6 values in the
-- same release; this migration brings existing data in line with the type.
--
-- Bulk mapping (applied second, catch-all):
--   exploration  → learning
--   physical     → hobby
--   relaxation   → reflection
--   productivity → reflection
--
-- Template-precise overrides (applied first, before bulk catch-all):
-- The four templates that originally lived in dropped categories now live as
-- follows in lib/companion/activity-templates/:
--   * exploration_discovery       → learning.ts        (matches bulk rule, no override needed)
--   * exploration_virtual_travel  → entertainment.ts   (does NOT match bulk rule — override below)
--   * relaxation_daydreaming      → reflection.ts      (matches bulk rule, no override needed)
--   * relaxation_nap              → REMOVED from catalog; rows preserved with bulk-mapped 'reflection'
--
-- The override for exploration_virtual_travel ensures historical rows land in
-- the same category their template currently writes to, preventing same-template
-- rows from ending up in two different categories in the DB.
--
-- Reversible only for rows whose template_id identifies the original category.
-- See supabase/rollbacks/022_rollback.sql.
--
-- activity_category is TEXT NOT NULL with no CHECK constraint, so these UPDATEs
-- are unconstrained. The supporting btree index on the column
-- (idx_companion_activities_category) is automatically maintained by Postgres.

-- Step 1: Template-precise overrides (must run BEFORE the bulk updates).
-- Without this, the bulk WHERE activity_category = 'exploration' rule would
-- sweep these rows into 'learning' before the override can move them.
UPDATE companion_activities
   SET activity_category = 'entertainment'
 WHERE template_id = 'exploration_virtual_travel';

-- Step 2: Bulk catch-all remaps. By the time these run, any template_id that
-- needed a non-bulk destination has already been moved out of the source
-- category, so these UPDATEs only sweep the rows that genuinely match the
-- bulk rule.
UPDATE companion_activities
   SET activity_category = 'learning'
 WHERE activity_category = 'exploration';

UPDATE companion_activities
   SET activity_category = 'hobby'
 WHERE activity_category = 'physical';

UPDATE companion_activities
   SET activity_category = 'reflection'
 WHERE activity_category IN ('relaxation', 'productivity');
