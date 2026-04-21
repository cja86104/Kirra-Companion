/**
 * Audit: companion needs system health check.
 *
 * Sections:
 *   1. System reference — decay rates, fulfillment amounts, bounds, trigger paths
 *   2. DB state snapshot — current stored values for every companion
 *   3. Expected-vs-actual comparison — what decay math says vs what DB has
 *   4. Fulfillment trail — message/activity counts, indirect fulfillment evidence
 *   5. Cron health check — simulation_states, recent activity/event counts
 *   6. Code-path sanity check — findings from reading the write-path code
 *   7. Diagnosis block — plain-language verdict
 *
 * READ-ONLY. No DB writes. No LLM calls.
 *
 * Run:
 *   npx tsx scripts/audit-companion-needs.ts
 *
 * Environment (auto-loaded from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL   = "https://your-project.supabase.co"
 *   SUPABASE_SERVICE_ROLE_KEY  = "your-service-role-key"
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import {
  DEFAULT_DECAY_RATES,
  INITIAL_NEEDS,
  type CompanionNeeds,
  type NeedDecayRates,
} from '../lib/companion/needs-system';

// ─── .env.local auto-loader ───────────────────────────────────────────────

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
    const value = rawVal.replace(/^(['"])(.*)\1$/, '$2');
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile();

// ─── Admin client ──────────────────────────────────────────────────────────

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

// ─── Helpers ───────────────────────────────────────────────────────────────

function hr(char = '═', width = 72) {
  return char.repeat(width);
}

function hoursAgo(isoTimestamp: string | null | undefined): number | null {
  if (!isoTimestamp) return null;
  return (Date.now() - new Date(isoTimestamp).getTime()) / (1000 * 60 * 60);
}

function fmt(n: number): string {
  return n.toFixed(1);
}

const NEED_KEYS = [
  'social',
  'energy',
  'fun',
  'comfort',
  'affection',
  'intellectual',
  'creativity',
] as const;

type NeedKey = (typeof NEED_KEYS)[number];

// Seed values from INITIAL_NEEDS — used for FROZEN detection
const SEED: Record<NeedKey, number> = {
  social:       INITIAL_NEEDS.social,
  energy:       INITIAL_NEEDS.energy,
  fun:          INITIAL_NEEDS.fun,
  comfort:      INITIAL_NEEDS.comfort,
  affection:    INITIAL_NEEDS.affection,
  intellectual: INITIAL_NEEDS.intellectual,
  creativity:   INITIAL_NEEDS.creativity,
};

// ─── Decay math (mirrors calculateNeedsDecay in needs-system.ts) ──────────

function expectedAfterDecay(
  storedValue: number,
  hoursElapsed: number,
  rate: number
): number {
  return Math.max(0, storedValue - rate * hoursElapsed);
}

// ─── Need classification ───────────────────────────────────────────────────

type NeedClass = 'FRESH' | 'STALE' | 'FROZEN' | 'UNEXPECTED';

function classifyNeed(
  needKey: NeedKey,
  storedValue: number,
  expectedValue: number,
  needsLastUpdatedHoursAgo: number,
  companionCreatedHoursAgo: number
): NeedClass {
  const delta = storedValue - expectedValue;

  // FROZEN: at seed value AND needs.lastUpdated is very close to created_at
  // (means the needs object has literally never been written since creation)
  const atSeed = Math.abs(storedValue - SEED[needKey]) < 1;
  const neverUpdated = Math.abs(needsLastUpdatedHoursAgo - companionCreatedHoursAgo) < 0.1; // within 6 min
  if (atSeed && neverUpdated) return 'FROZEN';

  // UNEXPECTED: value outside valid bounds, or stored is meaningfully lower
  // than even decay can explain (decay only goes down to 0, not negative)
  if (storedValue < 0 || storedValue > 100) return 'UNEXPECTED';
  if (delta < -2) return 'UNEXPECTED'; // stored lower than decay predicts

  // STALE: stored is meaningfully higher than expected (decay hasn't run)
  if (delta > 2) return 'STALE';

  // FRESH: within ±2 of expected
  return 'FRESH';
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const admin = getAdminClient();
  const now = new Date();

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 1 — SYSTEM REFERENCE
  // ══════════════════════════════════════════════════════════════════════════

  console.log('\n' + hr());
  console.log('SECTION 1 — SYSTEM REFERENCE (from source code)');
  console.log(hr());

  console.log('\nNeed names (7 total):');
  console.log('  social, energy, fun, comfort, affection, intellectual, creativity');

  console.log('\nBounds: 0–100 (integer-ish floats). Min enforced at 0. Max enforced at 100.');

  console.log('\nDecay rates (points lost per HOUR, from DEFAULT_DECAY_RATES):');
  for (const k of NEED_KEYS) {
    const rate = DEFAULT_DECAY_RATES[k as keyof NeedDecayRates];
    const hrsToZero = fmt((SEED[k] / rate));
    console.log(`  ${k.padEnd(14)} ${String(rate).padEnd(4)} pts/hr   (hits 0 from seed in ~${hrsToZero}h)`);
  }

  console.log('\nSeed values (INITIAL_NEEDS, used at companion creation):');
  for (const k of NEED_KEYS) {
    console.log(`  ${k.padEnd(14)} ${SEED[k]}`);
  }

  console.log('\nFulfillment amounts by activity (from ACTIVITY_FULFILLMENT):');
  console.log('  chat:              social +15, fun +5');
  console.log('  deep_conversation: social +20, intellectual +15');
  console.log('  flirting:          social +10, affection +20, fun +10');
  console.log('  compliment:        affection +10, social +5');
  console.log('  game_together:     social +15, fun +25');
  console.log('  creative_together: social +10, creativity +25, fun +15');
  console.log('  (solo activities also exist — reading, music, nap, sleep, etc.)');

  console.log('\nDecay trigger:');
  console.log('  LAZY — decay is computed and written ONLY when a chat message is sent.');
  console.log('  Triggered inside: app/api/companion/[id]/chat/route.ts (lines ~330–345).');
  console.log('  There is NO background decay cron. The life-simulation cron does NOT');
  console.log('  touch companions.needs at all.');

  console.log('\nFulfillment trigger:');
  console.log('  Chat route only. Each message applies ACTIVITY_FULFILLMENT.chat');
  console.log('  (+15 social, +5 fun) after applying decay. Other fulfillment types');
  console.log('  (deep_conversation, flirting, etc.) are defined but there is no code');
  console.log('  path in the audit scope that applies them automatically.');

  console.log('\nStorage: companions.needs JSONB column. Contains the full CompanionNeeds');
  console.log('  object including lastUpdated and lastInteraction timestamps.');
  console.log('  calculateNeedsDecay() uses needs.lastUpdated to compute elapsed time.');

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 2 — DB STATE SNAPSHOT
  // ══════════════════════════════════════════════════════════════════════════

  console.log('\n' + hr());
  console.log('SECTION 2 — DB STATE SNAPSHOT');
  console.log(hr());

  const { data: companions, error: companionsError } = await admin
    .from('companions')
    .select('id, name, created_at, last_interaction, updated_at, needs, is_active')
    .order('created_at', { ascending: true });

  if (companionsError || !companions) {
    console.error('\nFailed to fetch companions:', companionsError?.message);
    process.exit(1);
  }

  console.log(`\nTotal companions: ${companions.length}\n`);

  for (const c of companions) {
    const needs = c.needs as CompanionNeeds | null;
    const createdHoursAgo = hoursAgo(c.created_at) ?? 0;
    const lastInteractionHoursAgo = hoursAgo(c.last_interaction);
    const needsLastUpdatedHoursAgo = hoursAgo(needs?.lastUpdated);
    const needsLastInteractionHoursAgo = hoursAgo(needs?.lastInteraction);

    console.log(hr('─'));
    console.log(`Companion: "${c.name}" (${c.id})`);
    console.log(`  created_at:                    ${c.created_at} (${fmt(createdHoursAgo)}h ago)`);
    console.log(`  is_active:                     ${c.is_active}`);
    console.log(
      `  companions.last_interaction:   ${c.last_interaction ?? 'NULL'}` +
      (lastInteractionHoursAgo !== null ? ` (${fmt(lastInteractionHoursAgo)}h ago)` : '')
    );
    console.log(`  companions.updated_at:         ${c.updated_at}`);

    if (!needs) {
      console.log('  companions.needs:              NULL — needs system not initialized!');
      continue;
    }

    console.log(`  needs.lastUpdated:             ${needs.lastUpdated}` +
      (needsLastUpdatedHoursAgo !== null ? ` (${fmt(needsLastUpdatedHoursAgo)}h ago)` : ''));
    console.log(`  needs.lastInteraction:         ${needs.lastInteraction}` +
      (needsLastInteractionHoursAgo !== null ? ` (${fmt(needsLastInteractionHoursAgo)}h ago)` : ''));

    console.log('\n  Stored need values:');
    for (const k of NEED_KEYS) {
      const val = needs[k];
      const seed = SEED[k];
      const atSeed = Math.abs(val - seed) < 1 ? '  ← AT SEED' : '';
      console.log(`    ${k.padEnd(14)} ${String(Math.round(val * 10) / 10).padStart(5)}${atSeed}`);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 3 — EXPECTED-VS-ACTUAL COMPARISON
  // ══════════════════════════════════════════════════════════════════════════

  console.log('\n' + hr());
  console.log('SECTION 3 — EXPECTED-VS-ACTUAL COMPARISON');
  console.log(hr());
  console.log('\nExpected values computed from needs.lastUpdated → now using DEFAULT_DECAY_RATES.');
  console.log('Tolerance for FRESH: ±2 pts.\n');

  const classificationTotals: Record<NeedClass, number> = {
    FRESH: 0, STALE: 0, FROZEN: 0, UNEXPECTED: 0,
  };
  const frozenCompanionIds: string[] = [];
  const staleCompanionIds: string[] = [];

  for (const c of companions) {
    const needs = c.needs as CompanionNeeds | null;
    const createdHoursAgo = hoursAgo(c.created_at) ?? 0;

    console.log(hr('─'));
    console.log(`"${c.name}" (${c.id})`);

    if (!needs) {
      console.log('  SKIP — needs is NULL, cannot compare.');
      continue;
    }

    const needsLastUpdatedHoursAgo = hoursAgo(needs.lastUpdated) ?? 0;
    console.log(
      `  Elapsed since needs.lastUpdated: ${fmt(needsLastUpdatedHoursAgo)}h` +
      ` | Elapsed since created_at: ${fmt(createdHoursAgo)}h`
    );

    let companionHasFrozen = false;
    let companionHasStale = false;

    console.log(`\n  ${'Need'.padEnd(14)} ${'Stored'.padStart(7)} ${'Expected'.padStart(9)} ${'Delta'.padStart(7)}   Class`);
    console.log(`  ${'─'.repeat(58)}`);

    for (const k of NEED_KEYS) {
      const stored = needs[k];
      const rate = DEFAULT_DECAY_RATES[k as keyof NeedDecayRates];
      const expected = expectedAfterDecay(stored, needsLastUpdatedHoursAgo, rate);
      // Note: expected here is decay FROM current stored value going forward.
      // For detecting STALE, we need to check: should stored be lower by now?
      // i.e. compute what stored SHOULD be = stored_at_lastUpdated - decay since then.
      // But we only have the current stored value, not what it was at lastUpdated.
      // We compute: expected_now = stored - 0 (no time has passed since last update,
      // by definition stored IS the value at lastUpdated). So delta should be ~0 for FRESH.
      // The real question is: was stored ever updated, or is it still at seed?
      //
      // Re-framing: if needs.lastUpdated = creation time, then no chat has ever happened.
      // The stored value IS the seed. Expected now = seed - decay(since_creation).
      // If stored = seed AND created hours ago > 0, then delta = stored - expected_now
      // = seed - (seed - decay*hours) = decay*hours > 0 → STALE/FROZEN.
      //
      // If needs.lastUpdated is RECENT (e.g. 1h ago), then stored = value at that time,
      // and expected_now = stored - decay*1h. Delta should be ~0 (we can't verify
      // the value AT lastUpdated without history, but at least the timestamp moved).

      // For the comparison: expected = what the value should be RIGHT NOW given
      // time elapsed since needs.lastUpdated (which is when the value was written).
      // If lastUpdated is recent, expected ≈ stored - small_decay → delta ≈ small_decay.
      // If lastUpdated is creation and stored is seed, expected is much lower.
      const expectedNow = expectedAfterDecay(stored, needsLastUpdatedHoursAgo, rate);
      const delta = stored - expectedNow;

      const cls = classifyNeed(
        k,
        stored,
        expectedNow,
        needsLastUpdatedHoursAgo,
        createdHoursAgo
      );

      classificationTotals[cls]++;
      if (cls === 'FROZEN') companionHasFrozen = true;
      if (cls === 'STALE') companionHasStale = true;

      const clsLabel = cls === 'FROZEN' ? '*** FROZEN ***' : cls === 'STALE' ? '** STALE **' : cls;
      console.log(
        `  ${k.padEnd(14)} ${String(Math.round(stored * 10) / 10).padStart(7)} ` +
        `${String(Math.round(expectedNow * 10) / 10).padStart(9)} ` +
        `${String('+' + Math.round(delta * 10) / 10).padStart(7)}   ${clsLabel}`
      );
    }

    if (companionHasFrozen && !frozenCompanionIds.includes(c.id)) {
      frozenCompanionIds.push(c.id);
    }
    if (companionHasStale && !staleCompanionIds.includes(c.id)) {
      staleCompanionIds.push(c.id);
    }
  }

  console.log('\n' + hr('─'));
  console.log('\nClassification totals across all companions × all needs:');
  for (const [cls, count] of Object.entries(classificationTotals)) {
    console.log(`  ${cls.padEnd(12)} ${count}`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 4 — FULFILLMENT TRAIL
  // ══════════════════════════════════════════════════════════════════════════

  console.log('\n' + hr());
  console.log('SECTION 4 — FULFILLMENT TRAIL');
  console.log(hr());
  console.log('\nChecking messages and activities logged in the last 7 days per companion.');

  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  for (const c of companions) {
    const needs = c.needs as CompanionNeeds | null;
    console.log(`\n  "${c.name}" (${c.id})`);

    // Count messages in last 7 days
    const { count: msgCount7d } = await admin
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('companion_id', c.id)
      .gte('created_at', sevenDaysAgo);

    // Count user-role messages specifically (chats that would trigger fulfillment)
    const { count: userMsgCount7d } = await admin
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('companion_id', c.id)
      .eq('role', 'user')
      .gte('created_at', sevenDaysAgo);

    // Count total messages ever
    const { count: totalMsgCount } = await admin
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('companion_id', c.id);

    // Count companion_activities in last 7 days
    const { count: actCount7d } = await admin
      .from('companion_activities')
      .select('id', { count: 'exact', head: true })
      .eq('companion_id', c.id)
      .gte('started_at', sevenDaysAgo);

    console.log(`    Total messages ever:          ${totalMsgCount ?? 0}`);
    console.log(`    Messages (last 7d, all):       ${msgCount7d ?? 0}`);
    console.log(`    User messages (last 7d):       ${userMsgCount7d ?? 0}  ← each triggers chat fulfillment`);
    console.log(`    Companion activities (7d):     ${actCount7d ?? 0}`);

    // Cross-reference: if companion has been chatted with, social should have
    // been pushed up by +15 per user message, then decayed between sessions.
    if (needs && (userMsgCount7d ?? 0) > 0) {
      const storedSocial = needs.social;
      const needsAge = hoursAgo(needs.lastUpdated) ?? 0;
      const decayedSinceLastChat = Math.min(storedSocial, DEFAULT_DECAY_RATES.social * needsAge);
      console.log(
        `    Social cross-check: stored=${fmt(storedSocial)}, ` +
        `${fmt(needsAge)}h since last needs write, ` +
        `decay since then ≈${fmt(decayedSinceLastChat)} pts → ` +
        `value at last write was ~${fmt(storedSocial + decayedSinceLastChat)}`
      );
      if (storedSocial + decayedSinceLastChat > SEED.social) {
        console.log('    → Social was above seed at last write — fulfillment has fired at least once.');
      } else {
        console.log('    → Social at or below seed at last write — fulfillment may not have fired.');
      }
    } else if ((userMsgCount7d ?? 0) === 0) {
      console.log('    → No user messages in last 7 days. Fulfillment path has not been exercised recently.');
    }

    // Note on history: we only have current snapshot, not a history of needs values.
    if (totalMsgCount === 0) {
      console.log('    → NO MESSAGES EVER. This companion has never been chatted with.');
      console.log('       Needs have only decayed from seed on paper; no fulfillment has occurred.');
    }
  }

  console.log('\n  NOTE: No needs history table exists. We can only compare current snapshot');
  console.log('  to decay math. A re-run of this script tomorrow would provide a second');
  console.log('  data point to confirm whether needs are actually moving between runs.');

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 5 — CRON HEALTH CHECK
  // ══════════════════════════════════════════════════════════════════════════

  console.log('\n' + hr());
  console.log('SECTION 5 — CRON HEALTH CHECK');
  console.log(hr());

  console.log('\nCron schedule (from vercel.json):');
  console.log('  /api/cron/life-simulation  → 11:30 UTC and 23:30 UTC daily');
  console.log('  /api/cron/dna-evolution    → 05:00 UTC and 17:00 UTC daily');
  console.log('  /api/cron/proactive-check  → 13:00 UTC and 01:00 UTC daily');

  console.log('\nIMPORTANT: life-simulation cron does NOT update companions.needs.');
  console.log('It only touches: companion_activities, life_events, simulation_states, current_mood.');
  console.log('Needs decay has no cron trigger — it is lazy, fired only on chat.');

  // Check simulation_states for last run time
  const { data: simStates } = await admin
    .from('simulation_states')
    .select('companion_id, last_simulation_at, activities_today, next_scheduled_at, is_sleeping')
    .order('last_simulation_at', { ascending: false });

  if (!simStates || simStates.length === 0) {
    console.log('\n  simulation_states table: EMPTY — life-simulation has never run (or no state rows created).');
  } else {
    console.log(`\n  simulation_states rows: ${simStates.length}`);
    const mostRecent = simStates[0];
    const lastSimHoursAgo = hoursAgo(mostRecent?.last_simulation_at);
    console.log(
      `  Most recent last_simulation_at: ${mostRecent?.last_simulation_at}` +
      (lastSimHoursAgo !== null ? ` (${fmt(lastSimHoursAgo)}h ago)` : '')
    );

    for (const s of simStates) {
      const compName = companions.find(c => c.id === s.companion_id)?.name ?? 'unknown';
      const hoursAgoVal = hoursAgo(s.last_simulation_at);
      console.log(
        `    "${compName}": last_sim ${s.last_simulation_at}` +
        (hoursAgoVal !== null ? ` (${fmt(hoursAgoVal)}h ago)` : '') +
        `, activities_today=${s.activities_today}, sleeping=${s.is_sleeping}`
      );
    }
  }

  // Check recent life_events count (proxy for cron firing)
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

  const { count: events24h } = await admin
    .from('life_events')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', twentyFourHoursAgo);

  const { count: events48h } = await admin
    .from('life_events')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', fortyEightHoursAgo);

  const { count: activities24h } = await admin
    .from('companion_activities')
    .select('id', { count: 'exact', head: true })
    .gte('started_at', twentyFourHoursAgo);

  const { count: activities48h } = await admin
    .from('companion_activities')
    .select('id', { count: 'exact', head: true })
    .gte('started_at', fortyEightHoursAgo);

  console.log('\n  Activity proxy for cron execution:');
  console.log(`    life_events     (last 24h): ${events24h ?? 0}`);
  console.log(`    life_events     (last 48h): ${events48h ?? 0}`);
  console.log(`    companion_activities (24h): ${activities24h ?? 0}`);
  console.log(`    companion_activities (48h): ${activities48h ?? 0}`);

  if ((events24h ?? 0) === 0 && (activities24h ?? 0) === 0) {
    console.log('\n  WARNING: Zero life_events and activities in last 24h.');
    console.log('  Either the life-simulation cron has not run, or no companions are active.');
    console.log('  Recommend: check Vercel dashboard → Functions → life-simulation cron logs.');
  } else {
    console.log('\n  Life-simulation cron appears to be running (events/activities present).');
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 6 — CODE-PATH SANITY CHECK
  // ══════════════════════════════════════════════════════════════════════════

  console.log('\n' + hr());
  console.log('SECTION 6 — CODE-PATH SANITY CHECK (from source audit)');
  console.log(hr());

  console.log(`
WRITE PATH 1: Chat route needs update
  File:    app/api/companion/[id]/chat/route.ts
  Lines:   ~330–345
  Logic:   1. Reads companion.needs from DB
           2. Calls calculateNeedsDecay(needs) — applies time-based decay
           3. Calls fulfillNeeds(needs, ACTIVITY_FULFILLMENT.chat) — +15 social, +5 fun
           4. Sets needs.lastInteraction = now
           5. Writes: supabase.update({ needs }).eq('id', companionId)
  Issues:
    [FLAG] The .update() call has NO error handling. If this write silently fails
           (RLS mismatch, column type error, transient DB error), needs are not
           persisted but the rest of the chat succeeds. There is no log entry,
           no throw, no retry. This is a silent failure path.
    [FLAG] The guard is: if (companionNeeds) { ... }. If companions.needs is NULL,
           the entire needs block is skipped with no log. Chat succeeds but needs
           are never initialized or updated.
    [NOTE] Uses supabase (user-auth RLS client), not admin client. RLS allows
           the owner to update their own companions, so this is correct — but
           only if the user's session cookie is valid for the duration of the request.
    [NOTE] A second .update() runs later (total_messages, last_interaction, mood).
           That update does NOT include needs. The two updates are separate, serial,
           awaited. No race condition, but two round-trips to the DB per message.

WRITE PATH 2: Decay cron
  Result:  DOES NOT EXIST as a standalone path.
  The life-simulation cron (/api/cron/life-simulation) calls runSimulationTick()
  which reads and updates: current_mood, companion_activities, life_events,
  simulation_states. It does NOT read or write companions.needs at any point.
  Decay is purely lazy — applied at the start of the next chat message.

WRITE PATH 3: Activity completion needs fulfillment
  Result:  NOT WIRED UP.
  ACTIVITY_FULFILLMENT defines fulfillment amounts for 'reading', 'music', 'nap',
  'sleep', etc. But runSimulationTick() in life-simulation.ts does not import
  fulfillNeeds or ACTIVITY_FULFILLMENT. When a solo activity completes, needs are
  NOT updated. The fulfillment constants exist but the solo-activity write path
  is missing.

SUMMARY OF CODE-PATH FINDINGS:
  - Chat needs update: EXISTS and is WIRED UP, but has a silent failure risk.
  - Background decay: NOT IMPLEMENTED (lazy only, on next chat).
  - Solo activity fulfillment: DEFINED but NOT WIRED UP in life-simulation.ts.
  - Needs initialization: Done at companion creation via create/page.tsx (client-side).
    If creation succeeds but needs JSON is malformed, the chat route silently skips.
`);

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 7 — DIAGNOSIS BLOCK
  // ══════════════════════════════════════════════════════════════════════════

  console.log(hr());
  console.log('SECTION 7 — DIAGNOSIS BLOCK');
  console.log(hr());

  const allFrozen = frozenCompanionIds.length === companions.length;
  const someFrozen = frozenCompanionIds.length > 0;
  const someStale = staleCompanionIds.length > 0;
  const noFrozenOrStale = !someFrozen && !someStale;
  const totalNeeds = companions.filter(c => c.needs !== null).length * NEED_KEYS.length;
  const frozenPct = totalNeeds > 0 ? Math.round((classificationTotals.FROZEN / totalNeeds) * 100) : 0;

  let verdict: string;
  if (allFrozen) {
    verdict = 'NOT WORKING';
  } else if (classificationTotals.FROZEN + classificationTotals.STALE > classificationTotals.FRESH) {
    verdict = 'PARTIALLY WORKING';
  } else if (noFrozenOrStale && classificationTotals.FRESH > 0) {
    verdict = 'WORKING';
  } else {
    verdict = 'INCONCLUSIVE';
  }

  console.log(`\nNeeds system verdict: ${verdict}`);
  console.log(`\nClassification summary (${totalNeeds} total need-slots):`)
  console.log(`  FRESH:      ${classificationTotals.FRESH}  (decay math checks out)`);
  console.log(`  STALE:      ${classificationTotals.STALE}  (stored higher than decay predicts)`);
  console.log(`  FROZEN:     ${classificationTotals.FROZEN}  (at seed, never updated — ${frozenPct}% of all slots)`);
  console.log(`  UNEXPECTED: ${classificationTotals.UNEXPECTED}  (out of bounds or below expected)`);

  if (someFrozen) {
    console.log('\nFROZEN companions (needs have never moved since creation):');
    for (const id of frozenCompanionIds) {
      const c = companions.find(x => x.id === id);
      console.log(`  ${id}  — "${c?.name ?? '?'}"  (created: ${c?.created_at ?? '?'})`);
    }
  }

  if (someStale) {
    console.log('\nSTALE companions (needs higher than decay math predicts):');
    for (const id of staleCompanionIds) {
      const c = companions.find(x => x.id === id);
      console.log(`  ${id}  — "${c?.name ?? '?'}"  (last_interaction: ${c?.last_interaction ?? 'NULL'})`);
    }
  }

  console.log('\nCode paths flagged:');
  console.log('  1. Chat route needs write: no error handling — silent failure possible.');
  console.log('  2. Background decay cron: does not exist — decay is lazy-only (on chat).');
  console.log('  3. Solo activity fulfillment: ACTIVITY_FULFILLMENT constants defined but');
  console.log('     never applied in life-simulation.ts. Activities do not update needs.');

  console.log('\nWhat Section B would need to address:');
  if (allFrozen) {
    console.log('  A. The needs write in the chat route is failing silently for all companions.');
    console.log('     Inspect the Vercel function logs for the /chat route for supabase update errors.');
    console.log('  B. Add error logging to the needs .update() call in chat/route.ts.');
    console.log('  C. Decide whether background decay is a requirement. Currently none exists —');
    console.log('     if users want to see needs drain when they go offline, a decay cron or');
    console.log('     lazy-on-read pattern is needed.');
    console.log('  D. Wire up solo activity fulfillment in life-simulation.ts if that behavior');
    console.log('     is required.');
  } else if (someFrozen) {
    console.log('  A. Some companions are frozen — their first chat has not happened yet, OR');
    console.log('     the chat needs write is failing for those specific companions.');
    console.log('     Check if those companions have any messages at all (Section 4 data).');
    console.log('  B. Add error logging to the needs .update() call.');
    console.log('  C. Solo activity fulfillment is not wired up — low priority but a gap.');
  } else if (noFrozenOrStale) {
    console.log('  No critical fixes identified from this audit.');
    console.log('  Consider: adding error logging to the needs write path (currently silent on failure).');
    console.log('  Consider: wiring up solo activity fulfillment in life-simulation.ts.');
  }

  console.log('\nConfidence level: MEDIUM');
  console.log('  We have a single point-in-time snapshot. To raise confidence:');
  console.log('  - Re-run this script after sending a chat message to one companion.');
  console.log('    needs.lastUpdated should advance and social should reflect +15 fulfillment.');
  console.log('  - Check Vercel function logs for the /chat route for any supabase update errors.');
  console.log('  - A second run of this script tomorrow would confirm whether decay is progressing.');

  console.log('\n' + hr() + '\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
