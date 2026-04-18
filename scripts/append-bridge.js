#!/usr/bin/env node

/**
 * scripts/append-bridge.js
 *
 * Appends the database-helpers re-export bridge to types/database.ts
 * after `npm run db:generate` has overwritten it with fresh Supabase
 * type output.
 *
 * Without this bridge, every import from `@/types/database` that
 * resolves to a hand-written type (Profile, Companion, MoodState,
 * VoiceConfig, CompanionWithDNA, etc.) breaks across the codebase.
 *
 * The script is idempotent — it checks for the existing bridge marker
 * before appending, so it's safe to run repeatedly or manually. It
 * also validates that types/database.ts contains a real Supabase
 * dump before touching it, to avoid corrupting the file if
 * `db:generate` failed mid-flight.
 *
 * Wired into package.json as the second half of `db:generate`:
 *   "db:generate": "npx -y supabase gen types ... > types/database.ts
 *                   && node scripts/append-bridge.js"
 */

const fs = require('fs');
const path = require('path');

const TYPES_FILE = path.join(__dirname, '..', 'types', 'database.ts');
const BRIDGE_MARKER = "from './database-helpers'";
const BRIDGE = [
  '',
  '// Re-export hand-written helpers so existing imports from',
  '// @/types/database continue to resolve.',
  "export * from './database-helpers';",
  '',
].join('\n');

function fail(message) {
  console.error('append-bridge: ' + message);
  process.exit(1);
}

function main() {
  if (!fs.existsSync(TYPES_FILE)) {
    fail('types/database.ts not found. Run `npm run db:generate` first.');
  }

  const current = fs.readFileSync(TYPES_FILE, 'utf8');

  if (!current.includes('export type Database')) {
    fail(
      'types/database.ts does not contain `export type Database`. ' +
        'The Supabase generation step likely failed — refusing to ' +
        'append a bridge to an invalid file.'
    );
  }

  if (current.includes(BRIDGE_MARKER)) {
    console.log('append-bridge: bridge already present, no append needed.');
    return;
  }

  fs.appendFileSync(TYPES_FILE, BRIDGE);
  console.log('append-bridge: bridge appended to types/database.ts.');
}

main();
