# Claude Code Operating Brief — Activity Depth v1, Phase 1 Sections A–C

**For:** Claude Code (CLI coding agent) working in the Kirra Companion repository.
**From:** Chris Allen (Allen Code Co), via planning session 2026-04-18.
**Scope of THIS brief:** Phase 1 Sections A, B, and C only. Stop after Section C.

---

## 0. Read this entire document before touching any files.

This is your full operating manual for this task. The spec document is the **what**; this brief is the **how, the boundaries, and the rules**. They must both be obeyed.

**Companion spec (authoritative for product/architecture decisions):**
`docs/SPEC-activity-depth-v1.md`

If this brief and the spec ever conflict, stop and ask. Do not silently pick one.

---

## 1. What you are building

Phase 1, Sections A through C of the Activity Depth v1 feature:

- **Section A:** New file `lib/companion/activity-templates.ts` — 100+ personality-gated activity templates (spec §6)
- **Section B:** New file `lib/companion/activity-context.ts` — context loader that gathers backstory, interests, memories, chats, and recent activities (spec §7.1)
- **Section C:** New file `lib/companion/activity-enrichment.ts` — AI enrichment call with prompt, Zod validation, graceful degradation (spec §7.2–§7.5)

**You are NOT doing:**
- Section D (rewriting `activity-generator.ts`)
- Section E (updating `vercel.json` and `DEFAULT_SIMULATION_CONFIG`)
- Section F (smoke test plan)
- Phase 2 (auto-journal) — that comes later, after Phase 1 is stable and Chris approves separately
- ANY file outside the three new files listed in Section A/B/C

Sections A, B, and C are deliberately scoped to **brand new files that do not touch anything currently in production.** This is safe ground. Run straight through.

---

## 2. Chris's standing rules (NON-NEGOTIABLE)

Every rule here takes precedence over perceived shortcuts. Violating any of these is a bug, not an optimization.

### 2.1 No placeholders, no mock data, no TODOs

- No `// TODO:` comments
- No `// FIXME`, no `// stub`, no `any as never`
- No `example.com`, `your_api_key`, `fake_user`, or similar
- No hardcoded demo data except where the spec explicitly defines constants (like the 100+ templates themselves, which ARE the data)
- If you can't complete something correctly, stop and ask. Do NOT leave a placeholder for later.

### 2.2 OpenRouter ONLY for LLM calls

- Use `generateSimpleCompletion` from `@/lib/ai/chat-client`
- Do NOT import `@anthropic-ai/sdk`, `openai` (except the two pre-allowed files at `lib/ai/embeddings.ts` and `lib/tts/openai-tts.ts`), or the Vercel `ai` SDK
- Do NOT change which AI model is being called; use whatever the existing `chat-client.ts` routes to
- If you find yourself wanting to add an LLM dependency: stop and ask

### 2.3 No new npm dependencies

- Do NOT add to `package.json`
- Do NOT `npm install` anything
- Everything needed for Sections A–C is already installed: `zod` is present, `@supabase/supabase-js` is present, React/Next types are present
- If you think you need a new dep, you don't. Stop and ask.

### 2.4 No schema changes

- No migrations
- No DB column adds, drops, or renames
- Do NOT touch `supabase/migrations/`
- If a schema issue blocks your work: stop and ask. Do NOT work around it by removing fields from inserts.

### 2.5 `types/skills.ts` is protected

Do not read, edit, reference, or import from `types/skills.ts`. Chris is protective of this file.

### 2.6 Read before you edit

For every file you create, first list the files in its parent directory so you understand sibling conventions:

```bash
ls lib/companion/
```

For every function you call that you didn't write (e.g. `generateSimpleCompletion`, `getAdminClient`), read its definition at least once before using it.

For every DB table you query, read its schema in `types/database.ts` first. Never guess column names.

### 2.7 Never suppress errors

- Every `try/catch` must `console.error(...)` with context (companion ID, operation, full error)
- Do NOT use empty `catch {}` blocks
- Do NOT swallow failures silently
- Do NOT use `|| null` to mask errors — use explicit error-check + log + return null pattern
- If a caller should know about the failure, it goes in the return value, not lost to void

### 2.8 `strict` TypeScript, no `any`, no `eslint-disable`

- `tsconfig.json` has strict mode on. Preserve it.
- No `any` type annotations. Use `unknown` + narrowing, or a proper type.
- No `// eslint-disable` or `// @ts-ignore` or `// @ts-expect-error`
- If TypeScript won't accept something, fix the types, don't silence the compiler
- `as never` is disallowed without a comment explaining exactly why it's needed; prefer `satisfies` for object literal checks

### 2.9 Lint and typecheck between files

After writing each of the three files (A, then B, then C), run:
```bash
npm run lint
npm run typecheck
```

Zero errors on **your new files.** Pre-existing warnings elsewhere are not your problem. If your new file introduces a lint error or type error, fix it before moving to the next file. Do not proceed to Section B until Section A is clean. Do not proceed to Section C until Section B is clean.

### 2.10 No zipping, no batching, one file per deliverable

Deliver each file as its own standalone `.ts` file. Chris's historical experience with zipped multi-file deliveries is that they cause build errors from misplaced imports. Trust him on this.

---

## 3. Workflow rules for this task

### 3.1 Sections A–C can run straight through (no stopping)

These three sections create brand-new files that don't modify existing production code. There's no integration risk during A–C. Run them sequentially without pausing for human approval.

**HOWEVER:** Stop (with proposed answer) if any of these situations arise:
- A type exists in the spec that doesn't exist in `types/database.ts` or `types/life-simulation.ts`
- A column, table, or enum value the spec references doesn't exist in the actual schema
- `generateSimpleCompletion` or another utility behaves differently than the spec assumes
- You find an obvious spec mistake (wrong file path, typo'd column name, etc.)
- You encounter a TypeScript error that requires a type change elsewhere in the codebase to fix
- Anything feels like it needs a judgment call about how Chris's product should work

When you stop, follow the "propose-and-wait" pattern (§3.3). Don't cold-stop without a proposal.

### 3.2 What "done" means for each section

**Section A — `lib/companion/activity-templates.ts`**
Done when:
- [ ] File exists at the exact path above
- [ ] Exports `ACTIVITY_TEMPLATES: ActivityTemplate[]` (the extended type defined in §6.1 of spec)
- [ ] Contains at least 100 templates (spec targets 114; aim for 100+; Chris will not count, but the variety must be there across all 10 categories)
- [ ] Every category from spec §6.2 has at least 6 templates, except `relaxation` (6 is its target too)
- [ ] Every template has a `personalityGate` (or explicit `personalityGate: undefined` with comment explaining why universal)
- [ ] Every template has an `enrichmentHint` with `specific_type` and `first_person_verb`
- [ ] Every template preserves the existing required fields: `id`, `name`, `description`, `category`, `intensity`, `durationMinutes`, `moodEffects`, `possibleOutcomes`, optionally `timeOfDayPreference`
- [ ] No duplicate `id` values
- [ ] `npm run lint` clean for this file
- [ ] `npm run typecheck` clean for this file
- [ ] `ActivityTemplate` type in `types/life-simulation.ts` has been **extended** (not replaced) with the new optional fields — see §3.4 below

**Section B — `lib/companion/activity-context.ts`**
Done when:
- [ ] File exists at the exact path above
- [ ] Exports `ActivityEnrichmentContext` interface matching spec §7.1 shape
- [ ] Exports `loadActivityContext(companionId: string): Promise<ActivityEnrichmentContext>` async function
- [ ] Uses the service-role admin client pattern from `lib/companion/life-simulation.ts` (NOT `createClient` from `@/lib/supabase/server`)
- [ ] All four context queries run in `Promise.all` (parallelized)
- [ ] Memory filtering logic handles the "companion-referencing preferred, high-importance fallback" rule from spec §7.1
- [ ] Character budgets from spec §7.2 are respected (600 chars backstory, 200 chars per memory, 300 chars per message, etc.) — implement as explicit slice/truncate with comments citing the budget
- [ ] Tail-biased truncation for chat messages (keep the end of a long message, not the start — it's usually the meat)
- [ ] Returns a valid `ActivityEnrichmentContext` even if queries return empty (companion with no chats yet must not break)
- [ ] All errors logged with `console.error` and companion ID
- [ ] `npm run lint` clean for this file
- [ ] `npm run typecheck` clean for this file

**Section C — `lib/companion/activity-enrichment.ts`**
Done when:
- [ ] File exists at the exact path above
- [ ] Exports `EnrichedActivityOutput` type (matches the Zod schema in spec §7.4)
- [ ] Exports `enrichActivity(context: ActivityEnrichmentContext, template: ActivityTemplate): Promise<EnrichedActivityOutput | null>` function
- [ ] Uses the system prompt and user prompt templates EXACTLY as specified in spec §7.3 (structure, not the example values — build the prompt dynamically from `context` and `template`)
- [ ] Calls `generateSimpleCompletion` from `@/lib/ai/chat-client` (no other AI path)
- [ ] Zod schema from spec §7.4 is defined in this file and used to validate response
- [ ] On Zod failure: log the raw response + companion ID and return `null` (NOT throw — caller handles null fallback)
- [ ] On any caught error: log with context, return `null`
- [ ] JSON extraction uses the project's existing `parseAIResponse` utility if it exists; if it doesn't, look for alternatives in `lib/ai/` or `lib/utils/` — do NOT write a new JSON extractor unless none exists (ask first)
- [ ] Temperature set to ~0.85 per existing `activity-generator.ts` pattern
- [ ] maxTokens set to 400 (spec budget)
- [ ] `npm run lint` clean for this file
- [ ] `npm run typecheck` clean for this file

### 3.3 The "propose-and-wait" pattern

When you hit ambiguity, don't stop cold with "need clarification." Do this instead:

1. State the issue in one paragraph.
2. State your proposed answer with reasoning.
3. Ask for approval/redirect.
4. Wait.

Example of the RIGHT way to stop:

> I'm about to write the `creative_cooking_for_them` template and the spec example has `relationshipTypes: ['romantic', 'family']`. The `relationship_type` enum in `types/database.ts` line 698 has values `'friend', 'mentor', 'romantic', 'family', 'custom'`. I'm going to use `['romantic', 'family']` as spec'd. For templates where I need to include "close friend" scenarios, I'll use `'friend'` with a `minAffection: 60` gate. Does that match your intent? I'll proceed in 2 minutes if no reply.

Example of the WRONG way to stop:

> Need clarification on relationship types. Please advise.

Chris works better when you propose a specific answer. If he disagrees, he'll redirect. If he agrees, a thumbs-up is enough to unblock.

### 3.4 Extending `ActivityTemplate` in types/life-simulation.ts

Section A requires adding two optional fields (`personalityGate` and `enrichmentHint`) to the `ActivityTemplate` interface at `types/life-simulation.ts`.

This is the **only pre-existing file you're allowed to modify** in Sections A–C, and only for this specific purpose.

Requirements:
- **EXTEND**, do not replace. Existing fields stay exactly as they are. New fields are added alongside.
- Both new fields are OPTIONAL (`?:`). This preserves backward compatibility with the existing 17 templates that don't have them set.
- Read the existing file before editing. Preserve formatting style (2-space indent, single quotes, etc.).
- Update the Zod schema (if there is one — check) that validates `ActivityTemplate` at runtime, if applicable.

If extending this type causes TypeScript errors anywhere else in the repo: stop and ask. Don't paper over the errors.

---

## 4. Environment & tooling

- **Node.js:** 20+ (per package.json)
- **Package manager:** npm (use `npm run`, not `yarn` or `pnpm`)
- **TypeScript:** ~5.x, strict mode
- **Linter:** `next lint` with eslint.config.mjs
- **Typechecker:** `tsc --noEmit` via `npm run typecheck`
- **Supabase CLI:** installed but DO NOT run migrations, `db push`, `db reset`, `db seed`, or any `supabase ...` command during this task
- **Test:** the project does not currently have a test runner. Don't add one. Smoke testing happens after Section D ships (Chris's call, later).

---

## 5. File organization and naming

- New files go in `lib/companion/` following the existing kebab-case filename pattern
- Use named exports, not default exports (matches project convention)
- Top of file: JSDoc block explaining what the file does, consistent with other `lib/companion/*.ts` files
- Imports order: Node/npm packages first, then `@/...` aliases, blank line, then types
- Explicit return types on all exported functions

---

## 6. What to deliver at the end

When all three sections are done and both `lint` + `typecheck` pass with zero errors on your new files, your final message should include:

1. **Three file blocks** — full contents of each of the three new files (or instructions to find them in the repo)
2. **One small diff** — the lines you added to `types/life-simulation.ts` (should be the interface extension only)
3. **Lint output** — the actual shell output from `npm run lint`
4. **Typecheck output** — the actual shell output from `npm run typecheck`
5. **A short summary** — one paragraph per section describing what's in the file, plus any judgment calls you made and why
6. **Anything you had to stop and ask about** — a list of any propose-and-wait moments

Do NOT run deployments. Do NOT commit to git. Do NOT push to Vercel. Chris handles that.

---

## 7. What specifically NOT to do

| Don't | Why |
|---|---|
| Touch `lib/companion/activity-generator.ts` | That's Section D |
| Touch `lib/companion/life-simulation.ts` | That's Section D |
| Change `vercel.json` or cron schedule | That's Section E |
| Add new columns to the DB | Spec §5.4 — zero schema changes |
| Install new npm packages | Rule 2.3 |
| Use Anthropic SDK, OpenAI SDK (outside the two allowed files), or Vercel AI SDK | Rule 2.2 |
| Modify `types/skills.ts` | Rule 2.5 |
| Write placeholder templates ("TODO: add 50 more here") | Rule 2.1 — do all 100+ or ask |
| Batch all three files into one commit/message | Chris historically hates this — he wants to see each file in its clean final form |
| Run `npm audit fix`, `npm update`, or upgrade anything | Out of scope |
| "Improve" the existing 17 templates while you're there | Out of scope for A–C |
| Add unit tests | Out of scope — no test runner exists |
| Change formatting of files you're not creating/extending | Leave them alone |

---

## 8. Context you might not have

### 8.1 Recent production history (last 24 hours, pre-this-task)

- Section F (separate feature) fixed a service-role client bug in the life-simulation libraries. The cron now works end-to-end and is generating activities every 2 hours. Do not re-break that.
- Notification bell wiring was just added (`should_notify_user: true` on moderate/major life events in `lib/companion/life-simulation.ts`). Do not touch.
- Dashboard page was just updated with new stats, real streak, Journal/Milestones links. Do not touch.

### 8.2 The current `activity-generator.ts` has 17 templates

You are NOT removing them or editing them in Sections A–C. Section D (later, not you) will replace the import so the generator pulls from your new `activity-templates.ts` file. The 17 existing templates should be **re-expressed** in your new file (with personality gates and enrichment hints added) as part of the 100+ total. Do not lose any of them.

### 8.3 The spec is your north star for §6.2 (template distribution)

Hit the distribution targets in spec §6.2. Aim for the counts listed. A few over is fine; multiple under is a red flag. If you can't reach a target for a specific category without writing repetitive templates, write fewer and explain why in your summary.

### 8.4 Common naming collisions to avoid

- Don't name a template `'social_thinking_of_user'` if the existing 17 already uses that ID. Read the current file first.
- Template IDs should be `{category}_{distinctive_noun}` format (e.g. `hobby_fishing`, `creative_zine_making`, `reflection_evening_pages`)

---

## 9. Summary

You're building three isolated new files that don't touch production code paths. Run A through C sequentially. Lint and typecheck between each. Stop (with proposal) only if something in the spec doesn't match reality. Deliver all three files as standalone outputs for Chris's review.

Start with reading the spec. Then read the existing `lib/companion/activity-generator.ts` (for reference, not modification). Then read `types/life-simulation.ts` (you'll be extending it). Then start Section A.

Production standards, every line. This code will be deployed.

— Chris Allen, Allen Code Co
