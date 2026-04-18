# Kirra Companion — Security & Bug Fix Master Instructions

You are working in the Kirra Companion production codebase at
`C:\Users\cja86\Documents\Kirra-Companion`. This is the authoritative
document for all outstanding fixes. Read it in full before starting
any work.

---

## Ground Rules — Read Before Starting

1. **Production-grade only.** No placeholders, no mock data, no
   "example" values, no pseudo-code, no TODOs. Every change ships to a
   live paid SaaS. The user's business model explicitly forbids TODOs
   in delivered code — if you find one while working, fix it or flag
   it at the end, do not leave it.
2. **OpenRouter is the only LLM provider.** Do not add or use the
   Anthropic SDK, OpenAI SDK for chat, Vercel AI SDK, or any other LLM
   client library. The existing `openai` package may continue to be
   used **only** in `lib/ai/embeddings.ts` (for text embeddings, which
   DeepSeek does not offer) and `lib/tts/openai-tts.ts` (for TTS). Do
   not extend its usage. All chat/completion calls go through
   `lib/ai/chat-client.ts`, which uses raw `fetch` to OpenRouter.
3. **Work in sections. Stop between each.** After you finish a
   section, stop completely and wait for the user to say "continue"
   before beginning the next. Do not batch sections into one response.
   This is non-negotiable.
4. **Verify before declaring done.** At the end of every section, run:
   ```powershell
   npm run lint
   npm run typecheck
   ```
   Both must pass with zero errors.
5. **Scope discipline.** Do not refactor files that aren't listed in
   the section you're working on. If you notice an issue outside
   scope, flag it at the end of the section and wait for direction —
   do not fix it inline and do not leave TODOs.
6. **No new dependencies.** Everything needed is already installed.
7. **Deliver full files, not snippets.** When asked to show work,
   output complete file contents. No diffs, no "here's the changed
   section" — the full file every time.
8. **Database type regeneration.** `npm run db:generate` uses
   `--project-id znfoftmeggrkpxxvtqey` and writes to
   `types/database.ts`. **Before Section A.5 completes, do not run
   `db:generate` — it will wipe hand-written type exports.** After
   A.5 ships, regens are safe.

---

## Status Summary — What Is Already Done

Do **not** redo any of the items in this section. They have been
verified complete by the user in prior sessions.

### Completed: Zod input validation (all 28 API routes)
All POST/PUT/PATCH/DELETE routes that accept a body validate it with
Zod using `safeParse` and return 400 with structured errors on
failure. Five routes are correctly exempt from Zod:
- `companion/[id]/simulate` — no body
- `stripe/portal` — no body
- `stripe/webhook` — uses `request.text()` for signature
  verification; adding Zod would break the webhook
- `user/delete` — no body
- `companion/[id]/skills/stats` — GET only

### Completed: Supabase types regeneration & script hardening
`types/database.ts` was regenerated against the live schema.
`package.json` was updated so `db:generate` uses
`--project-id znfoftmeggrkpxxvtqey` and runs non-interactively
(`npx -y`).

### Completed: Section A.1 — `generate-scene` auth rewrite
`app/api/companion/[id]/generate-scene/route.ts` POST and GET
handlers now:
- Use a user-context Supabase client for auth verification
- Verify companion ownership via
  `.eq('id', companionId).eq('user_id', user.id)`
- For POST and conversation-scoped GETs, verify conversation
  ownership via
  `.eq('id', conversationId).eq('user_id', user.id).eq('companion_id', companionId)`
- Only instantiate the service-role admin client after all auth
  checks pass
- Write `user_id` from the verified session, never from the request
  body
- The GET handler also includes a `user_id` filter on the
  `generated_scenes` query as defense-in-depth
- The GET catch block returns `{ error: 'Failed to fetch scene' }`
  status 500 on unexpected errors (previously returned
  `{ scene: null }` status 200)

### Completed: Section A.2 — RLS migration 016
`supabase/migrations/016_safety_log_rls_hardening.sql` drops four
permissive `WITH CHECK (TRUE)` INSERT policies on `crisis_logs`,
`behavioral_detection_logs`, `audit_logs`, and `user_achievements`.
Service role bypasses RLS, so removing these policies correctly
closes the tables to the anon/authenticated roles.

### Completed: Section A.3 — Chat route safety-log writes
`app/api/companion/[id]/chat/route.ts` uses a lazily-instantiated
service-role admin client (`getAdminClient()`) for:
- The `crisis_logs` insert in the crisis-detected branch
- The `behavioral_detection_logs` insert in the minor-detection
  branch

User-context client remains for all other writes in the route.

### Completed: Section A.4 — user/delete audit log
`app/api/user/delete/route.ts` audit_logs insert now uses the
existing `supabaseAdmin` client instead of the user-context
`supabase` client.

### Completed: Dead code removal — `lib/supabase/types.ts`
The file had 17 wrapper functions with zero callers, including
wrappers for the four tables hardened in migration 016 which would
have silently failed against the new RLS. File was deleted entirely.

---

## Section A.5 — Split the types file

**Do this before Section B.** The current `types/database.ts` holds
both auto-generated Supabase output and ~172 lines of hand-written
named type exports. Running `npm run db:generate` overwrites the
entire file, wiping the hand-written section. This has happened twice
and each recovery has been expensive.

The fix: split the hand-written section into its own file that
imports `Database` from `types/database.ts`, then re-export from the
original path so no callers need to change.

### Step 1 — Create `types/database-helpers.ts`

1. Open `types/database.ts`. Find the line that reads `} as const`
   near the end of the auto-generated Supabase output. Everything
   from the first blank line after it through the end of the file is
   the hand-written section (approximately 172 lines).
2. Copy that block into a new file at `types/database-helpers.ts`.
3. At the top of the new file, add:
   ```typescript
   // Hand-written types for the Kirra Companion schema. This file is
   // NOT touched by `npm run db:generate` — add all custom type
   // aliases, interfaces, and helper types here.

   import type { Database } from './database';
   ```
   The relative import matters — both files live in `types/`.
4. Keep the existing `type PublicSchema = Database["public"]` line
   inside the helpers file exactly as it was. It resolves through the
   new import.
5. Keep every `export type` and `export interface` exactly as it is.
   Do not rename, reorder, or regroup. Preserve the section comments
   (`// ROW TYPES (Read)`, `// CUSTOM TYPES (Application-specific)`,
   etc.) verbatim.
6. Do **not** re-export `Database` or `Json` from this file — those
   belong to `database.ts` and stay there.

### Step 2 — Remove the hand-written block from `types/database.ts`

1. Delete everything from the first blank line after `} as const`
   through the current end of the file.
2. The file should now end exactly at the `} as const` line.
3. Do not touch the auto-generated portion above.

### Step 3 — Add self-documenting comments and the re-export

1. At the very top of `types/database.ts`, above the existing
   `export type Json =` line, add:
   ```typescript
   // AUTO-GENERATED by `npm run db:generate`. Hand-written types live
   // in ./database-helpers.ts — do not add custom types here, they
   // will be wiped on regeneration.
   ```
2. At the bottom of `types/database.ts`, after the `} as const` line,
   add a blank line followed by:
   ```typescript
   // Re-export hand-written helpers so existing imports from
   // @/types/database continue to resolve.
   export * from './database-helpers';
   ```

### Step 4 — Verify with a regen test

1. `npm run typecheck` — must pass with zero errors.
2. `npm run lint` — must pass.
3. `npm run db:generate` — runs clean.
4. `npm run typecheck` again — must still pass.

If step 4 fails with missing exports, something from the hand-written
section leaked back into `database.ts` during the regen and got
wiped. Move whatever is missing into `database-helpers.ts`.

### Optional cleanup during A.5
There is a stale file `types/database.broken.ts` in the working
directory left over from a diagnostic session. Safe to delete while
doing this work.

### Stop after Section A.5

Stop and report back. Wait for "continue" before starting Section B.

---

## Section B — Chat route hardening

Everything in this section except B.5 is in
`app/api/companion/[id]/chat/route.ts`. Do all five items in one
section (they are small, cohesive, and touch the same file), then
verify and stop.

### B.1 — Verify `conversationId` ownership

Currently the chat route verifies companion ownership but not
conversation ownership. An authenticated user can inject messages
into a conversation by passing a `conversationId` from a different
companion or a different user's conversation (RLS limits the
attacker's ability to *read* the poisoned message, but the INSERT
with `auth.uid() = user_id` still succeeds — the rows land in the
victim's conversation with the attacker's `user_id`).

Immediately after the existing companion ownership check (around
line 248 where `companion` is resolved), and before any writes, AI
calls, or fire-and-forget background processing, add:

```typescript
const { data: ownedConversation, error: conversationError } = await supabase
  .from('conversations')
  .select('id')
  .eq('id', conversationId)
  .eq('user_id', user.id)
  .eq('companion_id', companionId)
  .maybeSingle();

if (conversationError || !ownedConversation) {
  return NextResponse.json(
    { error: 'Conversation not found' },
    { status: 404 }
  );
}
```

`maybeSingle()` (not `single()`) so a missing row returns `null`
rather than throwing. Variable name `ownedConversation` avoids
shadowing any existing `conversation` in scope.

### B.2 — Fix the `humor_style` string-vs-number bug

**The bug:** around line 338 the outer type cast declares
`humor_style?: string`, but at line 350 a nested IIFE recasts the
entire `communication_dialect` object as `Record<string, number>`.
Line 356 then compares `dialect.humor_style` (which the narrower type
says is `number`) against the string `'playful'`:

```typescript
humorLevel:  dialect.humor_style  !== undefined ? (dialect.humor_style as unknown === 'playful' ? 0.7 : 0.4) : undefined,
```

A number is never equal to `'playful'`, so `humorLevel` is always
`0.4` when `humor_style` is set. The `as unknown` is a silencer that
tells you somebody knew the types didn't line up.

**What to do:**

1. First inspect the DNA evolution engine in `lib/companion/`
   (especially `dna-evolution.ts` and anything that writes to
   `communication_dialect`) to determine the real shape of
   `humor_style` and its actual value set. Read the code — do not
   guess.
2. Change the nested IIFE cast at line 350 to a proper mixed type
   that respects the actual shape. Something like:
   ```typescript
   const dialect = companion.companion_dna![0].communication_dialect as {
     formality?: number;
     emoji_frequency?: number;
     verbosity?: number;
     humor_style?: string;
   } | null;
   ```
3. Remove the `as unknown` and compare `humor_style` as a string
   directly:
   ```typescript
   humorLevel: dialect.humor_style !== undefined
     ? (dialect.humor_style === 'playful' ? 0.7 : 0.4)
     : undefined,
   ```
4. If the evolution engine emits more than just `'playful'` vs
   not-playful (e.g., `'dry'`, `'witty'`, `'gentle'`), expand the
   mapping to match — produce the humor level value that each
   specific style was originally intended to produce. Again, read
   the code first.

### B.3 — Fix stale comment

Line 433 reads `// Call Anthropic Claude`. The actual call on line
434 is to OpenRouter with DeepSeek V3 via `createChatCompletion`.

Replace with:
```typescript
// Generate companion response via OpenRouter (DeepSeek V3)
```

### B.4 — Sanitize error responses

The final `catch` block in the POST handler (around line 619)
returns `error.message` directly to the client, which leaks
OpenRouter API error text, Supabase error text, and any other
internal exception string. The 429 message-limit response and the
Zod 400 responses are already user-friendly and stay as-is — this
change applies only to the unhandled-catch path.

Change the final catch block so the server still logs the full error
but the client only sees a generic message:

```typescript
} catch (error) {
  console.error('Chat error:', error);
  return NextResponse.json(
    { error: 'Failed to process message' },
    { status: 500 }
  );
}
```

Do not remove the `console.error` — server logs remain valuable.

### B.5 — Defense-in-depth RLS on `messages`

**New file:** `supabase/migrations/017_messages_rls_hardening.sql`

The current INSERT policy on `messages` checks `auth.uid() = user_id`
but does not verify that the submitted `conversation_id` belongs to
the authenticated user. B.1 closes this gap at the application
layer; B.5 closes it at the database layer so a future regression
cannot reopen it.

Migration content:

```sql
-- ============================================================================
-- MIGRATION 017: MESSAGES RLS HARDENING
--
-- The existing "Users can create messages" policy on messages checks only
-- auth.uid() = user_id. It does not verify that the submitted
-- conversation_id belongs to the authenticated user. A compromised or
-- regressed application layer could therefore write messages into
-- conversations the caller does not own (though RLS on SELECT would still
-- hide the result from the victim's UI).
--
-- This migration replaces that policy with one that also requires the
-- conversation_id to resolve to a conversation owned by auth.uid(). The
-- app-layer check added in B.1 remains the first line of defense; this is
-- belt-and-braces at the database layer.
-- ============================================================================

DROP POLICY IF EXISTS "Users can create messages" ON messages;

CREATE POLICY "Users can create messages in own conversations"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );
```

### Section B — Verification

1. `npm run lint` — passes.
2. `npm run typecheck` — passes.
3. `npm run db:migrate` to apply migration 017.
4. `npm run db:generate` to refresh types after the migration.
5. Smoke test: send a chat message normally as a user — still works.
   Manually POST to the chat endpoint with a `conversationId` that
   belongs to a different user — returns 404. Temporarily break the
   OpenRouter URL to simulate an error and confirm the client sees
   only the generic message.

### Stop after Section B

Stop and report back. Wait for confirmation before Section C.

---

## Section C — Follow-up hardening

Quality and hardening items, not live exploits. Do these one
sub-section at a time with a stop between each.

### C.1 — Shared rate-limit helper

Five routes let an authenticated user burn OpenRouter / OpenAI /
Segmind budget without per-user cost caps:

- `app/api/companion/generate-backstory/route.ts`
- `app/api/companion/[id]/generate-scene/route.ts`
- `app/api/companion/[id]/evolve/route.ts` (especially with
  `force=true`)
- `app/api/companion/[id]/speak/route.ts`
- `app/api/voices/preview/route.ts` POST

Build a shared helper at `lib/rate-limit.ts` backed by a new
Postgres table `api_rate_limits` with columns `(user_id, route_key,
window_start, count)` and appropriate indices.

Helper signature:
```typescript
export async function checkRateLimit(
  userId: string,
  routeKey: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number; resetsAt: string }>
```

Routes call it before doing expensive work. If `allowed` is false,
return HTTP 429 with the `remaining` and `resetsAt` metadata in the
response body.

Starting limits per user:
- `generate-backstory`: 20 per 24h
- `generate-scene`: 30 per 24h (already has a per-companion
  cooldown; this is an additional per-user ceiling)
- `evolve`: 10 per 24h
- `speak`: 500 per 24h (loop protection, not normal usage)
- `voices/preview` POST: 50 per 24h

Deliverables:
- `lib/rate-limit.ts` (new)
- `supabase/migrations/018_api_rate_limits.sql` (new) with the
  table, indices, and RLS (users can SELECT only their own rows,
  service role handles all writes)
- Integration edits in the 5 routes

Use the service-role admin client for the helper's writes so RLS
does not block the rate-limit counter itself. Same lazy-factory
pattern already used in the chat route for safety-log writes.

### C.2 — Middleware matcher fix

`middleware.ts` line 18 excludes `api/webhooks` from the matcher,
but the actual Stripe webhook lives at `api/stripe/webhook`. Change
the exclusion from `api/webhooks` to `api/stripe/webhook`. Stripe
verifies its own signature so there is no security impact — just
wasted Supabase session lookups on every webhook event.

### C.3 — Replace `as never` casts with `satisfies`

There are currently 64 `as never` casts across 20 files in `app/`
and `lib/`. These were a blanket workaround for Supabase +
TypeScript insert type mismatches (string literals not narrowing to
Postgres enums, generic inference failures on joined selects, etc.).
They silence the compiler rather than fix the type.

The correct modern fix is `satisfies`:

```typescript
// Before
.insert({ role: 'user', content: msg, ... } as never)

// After
.insert({ role: 'user', content: msg, ... } satisfies MessageInsert)
```

`satisfies` keeps the compile-time check (the object must be
assignable to `MessageInsert`) while letting Supabase's generics
resolve correctly at the call site. Unlike `as never`, it does not
turn off type safety.

Work file-by-file:
1. Identify a file with `as never` casts.
2. At the top of the file, add imports for the appropriate `*Insert`
   or `*Update` types from `@/types/database` (these resolve through
   `database-helpers.ts` after A.5).
3. Replace each `as never` with `satisfies <TypeName>`.
4. Run `npm run typecheck`.
5. If new errors appear, the object is genuinely missing a required
   field or has a wrong literal — fix the object. Do not revert to
   `as never`.

In the extremely rare case where an insert genuinely cannot be typed
(dynamic columns unknown at compile time), document it with a single
one-line `//` comment explaining why. That is the one case where a
comment explaining a deliberate decision is acceptable — it's
documenting an intentional exception, not postponing a fix.

### Section C — Verification

After each sub-section, `npm run lint` and `npm run typecheck` must
pass. No test framework is in use in Kirra — manual smoke tests are
the verification standard.

---

## Stop rules — repeat, because this matters

- After **A.5** completes and verifies, stop and wait.
- After **B** completes and verifies, stop and wait.
- Section **C** sub-sections stop individually (C.1, then C.2, then
  C.3).
- If you find an issue outside the current section's scope, flag it
  at the end of the section and wait for direction. Do not fix it
  inline. Do not leave a `// TODO:` in the code.
- If any step here is ambiguous, ask before guessing.
