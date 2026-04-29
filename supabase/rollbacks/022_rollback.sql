-- Rollback for migration 022_consolidate_activity_categories.sql
--
-- This file is intentionally located in supabase/rollbacks/, NOT in
-- supabase/migrations/, so it is NOT auto-applied by `supabase db push`.
-- Run it manually (e.g. via the Supabase SQL editor or `psql`) only if you
-- intend to revert the 10 → 6 ActivityCategory consolidation. Reverting the
-- data is necessary but not sufficient — you must also revert the matching
-- code changes shipped in the same release:
--   * types/life-simulation.ts            — restore the 4 dropped categories on the union
--   * lib/companion/activity-generator.ts — restore the exploration branch in scoreTemplate, restore 4 categoryMap keys
--   * lib/companion/interest-evolution.ts — restore 4 categoryMap keys
--   * lib/companion/life-simulation.ts    — restore 4 ACTIVITY_CATEGORY_EMOJI keys + doc comment
--   * lib/companion/daily-routine.ts      — restore 19 preferredCategories arrays
--   * lib/companion/activity-templates/   — restore the 4 dropped-category templates inline in activity-generator.ts (or move them out of the new files)
--
-- Recoverable rows (template_id identifies the original category):
--   exploration_discovery       — was 'exploration'
--   exploration_virtual_travel  — was 'exploration'
--   relaxation_nap              — was 'relaxation'
--   relaxation_daydreaming      — was 'relaxation'
--
-- Non-recoverable rows (information lost by migration 022):
--   Rows formerly in 'physical'     — no historical templates ever wrote this category
--   Rows formerly in 'productivity' — no historical templates ever wrote this category
--   Rows in 'exploration' or 'relaxation' with template_ids outside the four
--     listed above — original category cannot be inferred from template_id alone
-- These rows stay in their post-022 category. If you need them back, restore
-- from a pre-022 database backup.

UPDATE companion_activities
   SET activity_category = 'exploration'
 WHERE template_id IN ('exploration_discovery', 'exploration_virtual_travel');

UPDATE companion_activities
   SET activity_category = 'relaxation'
 WHERE template_id IN ('relaxation_nap', 'relaxation_daydreaming');
