# Kirra Companion — Claude Code Instructions

## Blueprint Guardian (MANDATORY)

**At the start of every session, invoke the blueprint-guardian agent before writing any code:**
```
/agent blueprint-guardian
```

**After completing any phase or batch, invoke it again to verify completion and get the next step.**

The blueprint guardian will:
- Read the full project blueprint (`./kirrablueprint.md` at the project root)
- Confirm current position in the build sequence (see "Build Status & Roadmap" section)
- Flag any deviations from the specification
- Deliver the next steps and active rules

Do not write code, create files, or make architectural decisions until the guardian has run.

## Project Reference

All project decisions, architecture, and specifications are defined in:
```
./kirrablueprint.md
```
(absolute path: `C:/Users/cja86/Documents/Kirra-Companion/kirrablueprint.md`)

This is the single source of truth. If anything in conversation conflicts with it, the blueprint wins. The previous desktop README at `C:/Users/cja86/Desktop/README FILES/KIRRA-README.md` is **superseded and stale** — do not reference it.

In-flight work has additional spec/brief documents at the project root:
- `SPEC-activity-depth-v1.md` — current Phase 6 spec
- `CLAUDE-CODE-BRIEF-activity-depth-A-to-C.md` — original Phase 6 Sections A–C brief
- `CLAUDE-CODE-BRIEF-activity-depth-section-A-split.md` — current Section A working brief
- `CLAUDE_CODE_FIX_INSTRUCTIONS.md` — security & bug-fix master instructions

## Tech Stack (Summary)

| Category | Technology |
|----------|------------|
| Framework | Next.js 15 (App Router), TypeScript 5.7 |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth (Email, OAuth) |
| AI (chat) | OpenRouter → DeepSeek V3 (sole chat provider, via `lib/ai/chat-client.ts`) |
| AI (embeddings) | OpenAI (only in `lib/ai/embeddings.ts`) |
| TTS | OpenAI TTS (only in `lib/tts/openai-tts.ts`) |
| Payments | Stripe |
| Email | `lib/email/` |
| Styling | Tailwind CSS, Framer Motion |
| UI | Radix UI, Shadcn/ui |
| State | Zustand, React Query |
| Forms | React Hook Form, Zod |
| Deployment | Vercel |

## Critical Rules

- **TypeScript strict mode** — zero `any`, zero `eslint-disable`, zero `@ts-ignore`
- **OpenRouter only for LLM chat** — Anthropic SDK, OpenAI chat SDK, and Vercel AI SDK are forbidden. The `openai` package is permitted **only** in `lib/ai/embeddings.ts` and `lib/tts/openai-tts.ts`. All chat goes through `generateSimpleCompletion` in `@/lib/ai/chat-client`.
- **Auth before DB** — every API route authenticates and verifies ownership first, no exceptions. Service-role client is instantiated only after auth checks pass.
- **Zod on every mutation** — validate all POST/PUT/PATCH/DELETE bodies before DB writes
- **Service role scope** — `SUPABASE_SERVICE_ROLE_KEY` server-side only, never in client components
- **RLS on all tables** — all data must be user-scoped at the DB level
- **Safety systems are non-negotiable** — crisis detection, age verification, behavioral detection must never be bypassed
- **Cron secret required** — all cron endpoints must verify `CRON_SECRET`
- **No new npm dependencies** without explicit approval
- **`types/database.ts` is auto-generated** by `npm run db:generate`. Hand-written types live in `types/database-helpers.ts` and are re-exported.
- **Work one section at a time.** Lint + typecheck clean, then stop and confirm before moving on.
- **No placeholders, mocks, stubs, or TODOs** in delivered code.

## Subscription Tiers

| Tier | Price | Companions | Messages |
|------|-------|------------|----------|
| Free | $0 | 1 | 50/day |
| Plus | $12/mo | 3 | Unlimited |
| Pro | $24/mo | Unlimited | Unlimited |
