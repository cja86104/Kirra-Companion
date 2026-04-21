/**
 * Audit: backstory normalization state across all companions.
 *
 * Sections:
 *   1. App-wide stats (totals, null/populated breakdown, stale hashes, null-by-day)
 *   2. Jack deep-dive (diagnostic probe — not the fix target)
 *   3. Normalizer sanity check on 2-3 other companions (in-memory, no DB writes)
 *   4. Quality classification for every companion with backstory_normalized populated
 *   5. Human-readable diagnosis block
 *
 * This script is READ-ONLY. It makes live LLM calls in Sections 2 and 3
 * (normalizer test runs) but never writes to the database.
 *
 * Run:
 *   npx tsx scripts/audit-backstory-normalization.ts
 *
 * Environment variables (auto-loaded from .env.local if present, or set manually):
 *   NEXT_PUBLIC_SUPABASE_URL   = "https://your-project.supabase.co"
 *   SUPABASE_SERVICE_ROLE_KEY  = "your-service-role-key"
 *   OPENROUTER_API_KEY         = "your-openrouter-key"
 *
 * PowerShell manual set:
 *   $env:NEXT_PUBLIC_SUPABASE_URL  = "..."
 *   $env:SUPABASE_SERVICE_ROLE_KEY = "..."
 *   $env:OPENROUTER_API_KEY        = "..."
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { normalizeBackstory, hashBackstory } from '../lib/companion/backstory-normalizer';

// ─── .env.local auto-loader ────────────────────────────────────────────────
// Parses .env.local so the script can be run without manually exporting vars.
// Existing process.env values take precedence (so explicit shell exports win).
function loadEnvFile(): void {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const rawVal = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes (single or double)
    const value = rawVal.replace(/^(['"])(.*)\1$/, '$2');
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

// ─── Constants ────────────────────────────────────────────────────────────

const JACK_ID = 'af65bda6-cf85-4f24-a688-1fd5c45b5698';

// ─── Admin Client ─────────────────────────────────────────────────────────

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    );
  }
  return createAdminClient(url, key);
}

// ─── Signal counters ──────────────────────────────────────────────────────

function count3rdPerson(text: string): number {
  return (text.match(/\b(she|he|her|his|they|them|their)\b/gi) ?? []).length;
}

function count2ndPerson(text: string): number {
  return (text.match(/\b(you|your|yours|yourself)\b/gi) ?? []).length;
}

function countAsteriskBlocks(text: string): number {
  // Counts *...*  gesture blocks (non-greedy, single-line)
  return (text.match(/\*[^*\n]+\*/g) ?? []).length;
}

// ─── Quality classification ───────────────────────────────────────────────

type QualityClass = 'NORMALIZED' | 'UNCHANGED' | 'SUSPICIOUS' | 'EMPTY';

function classifyNormalization(
  raw: string,
  normalized: string | null | undefined
): QualityClass {
  if (!normalized || !normalized.trim()) return 'SUSPICIOUS'; // empty output

  const rawLen = raw.length;
  const normLen = normalized.length;

  // SUSPICIOUS: length dropped > 40%
  if (normLen < rawLen * 0.6) return 'SUSPICIOUS';

  const raw3rd = count3rdPerson(raw);
  const norm3rd = count3rdPerson(normalized);
  const raw2nd = count2ndPerson(raw);
  const norm2nd = count2ndPerson(normalized);

  // SUSPICIOUS: raw had > 3 third-person pronouns and normalized kept > 50% of them
  if (raw3rd > 3 && norm3rd > raw3rd * 0.5) return 'SUSPICIOUS';

  // NORMALIZED: 3rd-person dropped > 50% AND 2nd-person rose or stayed high
  if (raw3rd > 3 && norm3rd < raw3rd * 0.5 && (norm2nd >= raw2nd || norm2nd > 3)) {
    return 'NORMALIZED';
  }

  // UNCHANGED: length delta < 5% — normalizer ran but had little to do
  // (valid for inputs already in 2nd-person factual register)
  const lenDeltaFrac = Math.abs(rawLen - normLen) / rawLen;
  if (lenDeltaFrac < 0.05) {
    const pronounDeltaFrac = raw3rd > 0 ? Math.abs(raw3rd - norm3rd) / raw3rd : 0;
    if (pronounDeltaFrac <= 0.1) return 'UNCHANGED';
    if (raw2nd > raw3rd) return 'UNCHANGED'; // already 2nd-person dominant
  }

  // Catch-all: if register shifted at all in the right direction
  if (raw3rd > norm3rd && norm2nd > raw2nd) return 'NORMALIZED';

  return 'UNCHANGED';
}

// ─── Helper: divider ─────────────────────────────────────────────────────

function hr(char = '═', width = 70) {
  return char.repeat(width);
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  const admin = getAdminClient();

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 1 — APP-WIDE AUDIT
  // ════════════════════════════════════════════════════════════════════════

  console.log('\n' + hr());
  console.log('SECTION 1 — APP-WIDE AUDIT');
  console.log(hr());

  const { data: allCompanions, error: fetchAllError } = await admin
    .from('companions')
    .select(
      'id, name, created_at, backstory, backstory_normalized, backstory_normalized_hash, relationship_type'
    )
    .order('created_at', { ascending: true });

  if (fetchAllError || !allCompanions) {
    console.error('\nFailed to fetch companions:', fetchAllError?.message);
    console.error(
      'If this is a column-not-found error, migration 021 may not have been applied.'
    );
    process.exit(1);
  }

  const totalCount = allCompanions.length;

  const populatedCompanions = allCompanions.filter(
    (c) => c.backstory_normalized && c.backstory_normalized.trim().length > 0
  );
  const nullCompanions = allCompanions.filter(
    (c) => !c.backstory_normalized || c.backstory_normalized.trim().length === 0
  );

  // Hash freshness check: does the stored hash match the current raw backstory?
  let freshCount = 0;
  let staleCount = 0;
  for (const c of populatedCompanions) {
    if (!c.backstory) {
      staleCount++;
      continue;
    }
    const expectedHash = hashBackstory(c.backstory);
    if (expectedHash === c.backstory_normalized_hash) {
      freshCount++;
    } else {
      staleCount++;
    }
  }

  // Group NULL cases by creation date (YYYY-MM-DD) to spot timing of breakage
  const nullByDay: Record<string, number> = {};
  for (const c of nullCompanions) {
    const day = c.created_at.slice(0, 10);
    nullByDay[day] = (nullByDay[day] ?? 0) + 1;
  }

  console.log(`\nTotal companions:            ${totalCount}`);
  console.log(`With backstory_normalized:   ${populatedCompanions.length}`);
  console.log(`NULL or empty:               ${nullCompanions.length}`);
  if (populatedCompanions.length > 0) {
    console.log(`  → Hash matches (fresh):    ${freshCount}`);
    console.log(`  → Hash mismatch (stale):   ${staleCount}`);
  }

  console.log('\nNULL companions by creation date:');
  if (Object.keys(nullByDay).length === 0) {
    console.log('  (none — every companion has backstory_normalized populated)');
  } else {
    for (const [day, count] of Object.entries(nullByDay).sort()) {
      const names = nullCompanions
        .filter((c) => c.created_at.startsWith(day))
        .map((c) => `"${c.name}"`)
        .join(', ');
      console.log(`  ${day}: ${count} companion(s) — ${names}`);
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 2 — JACK DEEP-DIVE
  // ════════════════════════════════════════════════════════════════════════

  console.log('\n' + hr());
  console.log('SECTION 2 — JACK DEEP-DIVE (diagnostic probe)');
  console.log(hr());

  const jack = allCompanions.find((c) => c.id === JACK_ID) ?? null;
  let jackDnaExists: boolean | null = null;

  if (!jack) {
    console.log(`\nJack (${JACK_ID}) NOT FOUND in companions table.`);
    console.log('He may have been deleted, or the id specified in this script is wrong.');
  } else {
    console.log(`\nCompanion row: FOUND — "${jack.name}"`);
    console.log(`  id:                        ${jack.id}`);
    console.log(`  created_at:                ${jack.created_at}`);
    console.log(`  relationship_type:         ${jack.relationship_type}`);
    console.log(`  backstory length:          ${jack.backstory?.length ?? 0} chars`);
    const backstoryPreview = (jack.backstory ?? '').slice(0, 200);
    console.log(`  backstory (first 200):     "${backstoryPreview}${jack.backstory && jack.backstory.length > 200 ? '...' : ''}"`);
    console.log(
      `  backstory_normalized:      ${
        jack.backstory_normalized
          ? `POPULATED (${jack.backstory_normalized.length} chars)`
          : 'NULL'
      }`
    );
    console.log(
      `  backstory_normalized_hash: ${jack.backstory_normalized_hash ?? 'NULL'}`
    );

    // companion_dna existence check (report only, do not fix)
    const { data: jackDna, error: dnaError } = await admin
      .from('companion_dna')
      .select('id, companion_id, created_at, personality_version')
      .eq('companion_id', JACK_ID)
      .maybeSingle();

    if (dnaError) {
      jackDnaExists = null;
      console.log(`\n  companion_dna:             ERROR — ${dnaError.message}`);
    } else if (!jackDna) {
      jackDnaExists = false;
      console.log(`\n  companion_dna:             MISSING (no row for this companion_id)`);
    } else {
      jackDnaExists = true;
      console.log(`\n  companion_dna:             PRESENT`);
      console.log(`    id:                      ${jackDna.id}`);
      console.log(`    created_at:              ${jackDna.created_at}`);
      console.log(`    personality_version:     ${jackDna.personality_version}`);
    }

    // Live normalizer call — read-only, no DB write
    if (!jack.backstory) {
      console.log('\n  Cannot test normalizer: Jack has no raw backstory text.');
    } else {
      console.log('\n  Testing normalizer on Jack\'s raw backstory (live LLM call, no DB write)...');
      try {
        const result = await normalizeBackstory(jack.backstory);
        console.log(`  Result:                    SUCCESS`);
        console.log(`  Tokens used:               ${result.tokens}`);
        console.log(`  Output length:             ${result.normalized.length} chars`);
        console.log(`  Hash of current raw:       ${result.hash}`);
        console.log(
          `  Stored hash matches:       ${result.hash === jack.backstory_normalized_hash ? 'YES' : 'NO'}`
        );
        console.log('\n  Full normalized output:');
        console.log(hr('─'));
        console.log(result.normalized);
        console.log(hr('─'));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.log(`  Result:                    FAILED — ${message}`);
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 3 — NORMALIZER SANITY CHECK (2-3 other companions, no DB writes)
  // ════════════════════════════════════════════════════════════════════════

  console.log('\n' + hr());
  console.log('SECTION 3 — NORMALIZER SANITY CHECK');
  console.log(hr());
  console.log('Confirming the normalizer itself is functional across varied input shapes.');
  console.log('(Read-only. No DB writes.)');

  // Pick companions with backstory set, excluding Jack, sorted by length
  const sanityPool = allCompanions
    .filter((c) => c.id !== JACK_ID && c.backstory && c.backstory.trim().length > 20)
    .sort((a, b) => (a.backstory?.length ?? 0) - (b.backstory?.length ?? 0));

  // Sample: shortest, middle, longest (deduplicated)
  const sanityTargets: typeof sanityPool = [];
  if (sanityPool.length >= 3) {
    const midIdx = Math.floor(sanityPool.length / 2);
    const candidates = [
      sanityPool[0],
      sanityPool[midIdx],
      sanityPool[sanityPool.length - 1],
    ];
    const seen = new Set<string>();
    for (const c of candidates) {
      if (!seen.has(c.id)) {
        sanityTargets.push(c);
        seen.add(c.id);
      }
    }
  } else {
    sanityTargets.push(...sanityPool);
  }

  let sanityPassCount = 0;
  let sanityFailCount = 0;

  if (sanityTargets.length === 0) {
    console.log('\nNo other companions with backstories available. Sanity check skipped.');
  } else {
    console.log(`\nRunning normalizer on ${sanityTargets.length} companion(s):\n`);
    for (const target of sanityTargets) {
      const rawLen = target.backstory!.length;
      console.log(`  "${target.name}" (${target.id})`);
      console.log(`    relationship_type: ${target.relationship_type}`);
      console.log(`    input length:      ${rawLen} chars`);
      try {
        const result = await normalizeBackstory(target.backstory!);
        const lenChange = result.normalized.length - rawLen;
        const lenChangePct = Math.round((lenChange / rawLen) * 100);
        console.log(
          `    output length:     ${result.normalized.length} chars (${lenChangePct >= 0 ? '+' : ''}${lenChangePct}%)`
        );
        console.log(`    tokens:            ${result.tokens}`);
        console.log(`    result:            PASS`);
        sanityPassCount++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.log(`    result:            FAIL — ${message}`);
        sanityFailCount++;
      }
      console.log();
    }
  }

  const sanitySummary =
    sanityTargets.length === 0
      ? 'SKIPPED'
      : sanityFailCount === 0
      ? 'PASS'
      : `FAIL (${sanityFailCount} of ${sanityTargets.length} failed)`;

  console.log(`Normalizer sanity: ${sanitySummary}`);

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 4 — NORMALIZATION QUALITY REPORT
  // ════════════════════════════════════════════════════════════════════════

  console.log('\n' + hr());
  console.log('SECTION 4 — NORMALIZATION QUALITY REPORT');
  console.log(hr());

  const withNormalized = allCompanions.filter(
    (c) => c.backstory_normalized && c.backstory_normalized.trim().length > 0
  );

  const qualityCounts: Record<QualityClass, number> = {
    NORMALIZED: 0,
    UNCHANGED: 0,
    SUSPICIOUS: 0,
    EMPTY: 0,
  };

  const suspiciousIds: string[] = [];

  if (withNormalized.length === 0) {
    console.log(
      '\nNo companions have backstory_normalized populated. Quality report is empty.'
    );
  } else {
    console.log(`\nAnalyzing ${withNormalized.length} companion(s) with populated backstory_normalized...\n`);
  }

  for (const c of withNormalized) {
    const raw = c.backstory ?? '';
    const normalized = c.backstory_normalized!;

    const rawLen = raw.length;
    const normLen = normalized.length;
    const lenDeltaPct =
      rawLen > 0 ? Math.round(((normLen - rawLen) / rawLen) * 100) : 0;

    const raw3rd = count3rdPerson(raw);
    const norm3rd = count3rdPerson(normalized);
    const raw2nd = count2ndPerson(raw);
    const norm2nd = count2ndPerson(normalized);
    const rawAsterisk = countAsteriskBlocks(raw);
    const normAsterisk = countAsteriskBlocks(normalized);

    const classification = classifyNormalization(raw, normalized);
    qualityCounts[classification]++;
    if (classification === 'SUSPICIOUS') {
      suspiciousIds.push(c.id);
    }

    console.log(hr('─'));
    console.log(`Companion: "${c.name}" (${c.id})`);
    console.log(`Created:   ${c.created_at}    Relationship: ${c.relationship_type}`);
    console.log(`Classification: ${classification}`);

    console.log('\n  LENGTH:');
    console.log(
      `    Raw: ${rawLen} chars  →  Normalized: ${normLen} chars  (${lenDeltaPct >= 0 ? '+' : ''}${lenDeltaPct}%)`
    );

    console.log('\n  REGISTER SIGNALS:');
    console.log(`    3rd-person (she/he/her/his/they/them/their): raw=${raw3rd}  normalized=${norm3rd}`);
    console.log(`    2nd-person (you/your/yours/yourself):        raw=${raw2nd}  normalized=${norm2nd}`);
    console.log(`    Asterisk gesture blocks (*...*):             raw=${rawAsterisk}  normalized=${normAsterisk}`);

    console.log('\n  RAW BACKSTORY:');
    console.log(raw || '(empty)');

    console.log('\n  NORMALIZED BACKSTORY:');
    console.log(normalized);

    console.log();
  }

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 5 — HUMAN-READABLE DIAGNOSIS BLOCK
  // ════════════════════════════════════════════════════════════════════════

  console.log('\n' + hr());
  console.log('SECTION 5 — DIAGNOSIS BLOCK');
  console.log(hr());

  const nullPct =
    totalCount > 0 ? Math.round((nullCompanions.length / totalCount) * 100) : 0;
  console.log(
    `\nApp-wide null rate:  ${nullCompanions.length} of ${totalCount} companions (${nullPct}%)`
  );

  console.log('\nNormalization quality breakdown (for populated companions):');
  console.log(`  NORMALIZED:  ${qualityCounts.NORMALIZED}`);
  console.log(`  UNCHANGED:   ${qualityCounts.UNCHANGED}`);
  console.log(`  SUSPICIOUS:  ${qualityCounts.SUSPICIOUS}`);
  console.log(`  EMPTY:       ${qualityCounts.EMPTY} (should be 0 — EMPTY means null, handled above)`);

  console.log('\nJack-specific findings:');
  if (!jack) {
    console.log('  Jack NOT FOUND in companions table.');
  } else {
    console.log(`  Companion row:             PRESENT — "${jack.name}" (${jack.created_at})`);
    console.log(
      `  backstory_normalized:      ${jack.backstory_normalized ? 'POPULATED' : 'NULL'}`
    );
    console.log(
      `  backstory_normalized_hash: ${jack.backstory_normalized_hash ?? 'NULL'}`
    );
    if (jackDnaExists === false) {
      console.log(`  companion_dna row:         MISSING — pre-existing issue, out of scope for this session`);
    } else if (jackDnaExists === true) {
      console.log(`  companion_dna row:         PRESENT`);
    } else {
      console.log(`  companion_dna row:         ERROR fetching`);
    }
  }

  console.log(`\nNormalizer sanity across sampled companions: ${sanitySummary}`);

  if (suspiciousIds.length > 0) {
    console.log('\nSUSPICIOUS companion ids flagged for manual eyeball review:');
    for (const id of suspiciousIds) {
      const c = allCompanions.find((x) => x.id === id);
      console.log(`  ${id}  —  "${c?.name ?? '?'}"  (created: ${c?.created_at ?? '?'})`);
    }
  } else {
    console.log('\nNo companions flagged SUSPICIOUS.');
  }

  console.log('\nPRELIMINARY HYPOTHESIS:');
  const jackIsNull = jack && !jack.backstory_normalized;
  const nullIsOnlyJack =
    nullCompanions.length === 1 && jackIsNull;
  const nullDates = Object.keys(nullByDay).sort();

  if (nullCompanions.length === 0) {
    console.log(
      '  All companions have backstory_normalized populated — no active write-path failure.'
    );
    console.log(
      '  If Jack was previously NULL, he was resolved by a prior backfill run or a manual fix.'
    );
  } else if (nullIsOnlyJack) {
    console.log('  ISOLATED: Only Jack is missing normalization (1 companion).');
    console.log('  Not a systemic write-path failure — other companions normalized cleanly.');
    console.log(
      '  Most likely cause: transient error during Jack\'s create flow (network blip,'
    );
    console.log(
      '  OpenRouter timeout, rate limit spike, or race between DNA upsert and normalize fetch).'
    );
    console.log('  Resolution: run the backfill script.');
  } else if (nullDates.length === 1) {
    const [onlyDate] = nullDates;
    console.log(
      `  ALL NULLS ON ONE DAY (${onlyDate}): ${nullCompanions.length} companions missing normalization.`
    );
    console.log(
      '  Suggests a regression introduced on or around that date — possibly a deploy that'
    );
    console.log(
      '  broke the normalize-backstory route, an env var that went missing, or a migration'
    );
    console.log('  that was rolled back. Review deploys and logs for that date.');
  } else if (nullDates.length > 1) {
    const [earliest, latest] = [nullDates[0], nullDates[nullDates.length - 1]];
    const hasPreShipNulls = nullDates.some((d) => d < '2026-04-20');
    console.log(
      `  MULTI-DAY NULLS: ${nullCompanions.length} companions across ${nullDates.length} days`
    );
    console.log(`  (${earliest} to ${latest}).`);
    if (hasPreShipNulls) {
      console.log(
        '  Pre-2026-04-20 nulls are historical gaps — companions that existed before'
      );
      console.log('  normalization was shipped. Backfill will resolve them.');
      const postShipNulls = nullCompanions.filter((c) => c.created_at >= '2026-04-20');
      if (postShipNulls.length > 0) {
        console.log(
          `  POST-SHIP NULLS (${postShipNulls.length}): created after feature ship — indicates`
        );
        console.log('  the create-flow normalize call is failing silently for some users.');
        console.log('  Candidates: rate limit hit, client-side fetch error, route auth failure.');
      }
    } else {
      console.log('  All nulls are post-ship — the write path has an intermittent failure.');
      console.log(
        '  Check: rate limit exhaustion, OpenRouter timeouts, client-side fetch error handling.'
      );
    }
  }

  console.log('\n' + hr() + '\n');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
