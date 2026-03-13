# Kirra Companion — Claude Code Instructions

## Blueprint Guardian (MANDATORY)

**At the start of every session, invoke the blueprint-guardian agent before writing any code:**
```
/agent blueprint-guardian
```

**After completing any phase or batch, invoke it again to verify completion and get the next step.**

The blueprint guardian will:
- Read the full project reference (`C:/Users/cja86/Desktop/README FILES/KIRRA-README.md`)
- Confirm current position in the build sequence
- Flag any deviations from the specification
- Deliver the next steps and active rules

Do not write code, create files, or make architectural decisions until the guardian has run.

## Project Reference

All project decisions, architecture, and specifications are defined in:
```
C:/Users/cja86/Desktop/README FILES/KIRRA-README.md
```

This is the single source of truth. If anything in conversation conflicts with it, the README wins.

## Tech Stack (Summary)

| Category | Technology |
|----------|------------|
| Framework | Next.js 15 (App Router), TypeScript 5.7 |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth (Email, OAuth) |
| AI | Anthropic Claude, OpenAI |
| TTS | OpenAI Text-to-Speech |
| Payments | Stripe |
| Styling | Tailwind CSS, Framer Motion |
| UI | Radix UI, Shadcn/ui |
| State | Zustand, React Query |
| Forms | React Hook Form, Zod |
| Deployment | Vercel |

## Critical Rules

- **TypeScript strict mode** — zero `any`, zero `eslint-disable`
- **Auth before DB** — every API route authenticates first, no exceptions
- **Zod on every mutation** — validate all POST/PATCH bodies before DB writes
- **Service role scope** — `SUPABASE_SERVICE_ROLE_KEY` server-side only, never in client components
- **RLS on all tables** — all data must be user-scoped at the DB level
- **Safety systems are non-negotiable** — crisis detection, age verification, behavioral detection must never be bypassed
- **Cron secret required** — all cron endpoints must verify `CRON_SECRET`

## Subscription Tiers

| Tier | Price | Companions | Messages |
|------|-------|------------|----------|
| Free | $0 | 1 | 50/day |
| Plus | $12/mo | 3 | Unlimited |
| Pro | $24/mo | Unlimited | Unlimited |
