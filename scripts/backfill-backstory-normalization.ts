/**
 * Backfill: backstory_normalized + backstory_normalized_hash
 *
 * Reads every companion row where backstory IS NOT NULL and backstory_normalized IS NULL,
 * runs each through the normalizer, and writes the result back. Idempotent — safe to
 * re-run; only rows with a null backstory_normalized are processed.
 *
 * Prerequisites:
 *   1. Migration 021_backstory_normalization.sql must be applied.
 *   2. The NORMALIZATION_SYSTEM_PROMPT sentinel in lib/companion/backstory-normalizer.ts
 *      must be replaced with the real prompt (Section 2). The normalizer throws at call
 *      time if the sentinel is still in place, which will abort this script immediately.
 *
 * Required environment variables (set in PowerShell before running):
 *   $env:NEXT_PUBLIC_SUPABASE_URL    = "https://your-project.supabase.co"
 *   $env:SUPABASE_SERVICE_ROLE_KEY   = "your-service-role-key"
 *   $env:OPENROUTER_API_KEY          = "your-openrouter-key"
 *
 * Run:
 *   npx tsx scripts/backfill-backstory-normalization.ts
 */

import { createClient as createAdminClient } from '@supabase/supabase-js';
import { normalizeBackstory } from '../lib/companion/backstory-normalizer';

interface CompanionRow {
  id: string;
  name: string;
  backstory: string;
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing Supabase admin credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    );
  }
  return createAdminClient(url, key);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const adminClient = getAdminClient();

  console.log('Fetching companions with un-normalized backstories...');

  const { data, error } = await adminClient
    .from('companions')
    .select('id, name, backstory')
    .not('backstory', 'is', null)
    .is('backstory_normalized', null);

  if (error) {
    console.error('Failed to fetch companions:', error.message);
    process.exit(1);
  }

  const companions = (data ?? []) as CompanionRow[];

  if (companions.length === 0) {
    console.log('No companions need normalization. Nothing to do.');
    return;
  }

  console.log(`Found ${companions.length} companion(s) to normalize.\n`);

  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < companions.length; i++) {
    const companion = companions[i];
    const label = `[${i + 1}/${companions.length}] "${companion.name}" (${companion.id})`;

    process.stdout.write(`${label} — normalizing... `);

    try {
      const result = await normalizeBackstory(companion.backstory);

      const { error: updateError } = await adminClient
        .from('companions')
        .update({
          backstory_normalized: result.normalized,
          backstory_normalized_hash: result.hash,
        })
        .eq('id', companion.id);

      if (updateError) {
        throw new Error(`DB update failed: ${updateError.message}`);
      }

      console.log(`done (${result.tokens} tokens)`);
      successCount++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`FAILED`);
      console.error(`  Error: ${message}`);
      failureCount++;
    }

    if (i < companions.length - 1) {
      await sleep(250);
    }
  }

  console.log(`\nBackfill complete. ${successCount} succeeded, ${failureCount} failed.`);

  if (failureCount > 0) {
    console.log('Re-run this script to retry failed companions (idempotent).');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
