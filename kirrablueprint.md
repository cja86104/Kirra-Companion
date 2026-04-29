# Kirra Companion

**An AI companion that actually remembers you.**

Kirra is a production-ready AI companion web application that goes beyond traditional chatbots. Companions have their own life, memories, evolving personality, and genuine connection with users. Built with Next.js 15, Supabase, and powered by OpenRouter (DeepSeek V3) for chat with OpenAI for embeddings and TTS.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![License](https://img.shields.io/badge/license-private-red)

> **Source of truth:** This file (`kirrablueprint.md`) is the canonical spec for Kirra Companion. The previous desktop README (`C:/Users/cja86/Desktop/README FILES/KIRRA-README.md`) is superseded and should not be referenced.

---

## What Makes Kirra Different

Traditional AI assistants respond. Kirra companions **live, remember, and genuinely grow** alongside you.

| Feature | Traditional Chatbots | Kirra Companion |
|---------|---------------------|-----------------|
| Memory | Session-only | Persistent long-term memory |
| Personality | Static | Evolves based on interactions |
| Existence | Only when chatting | 24/7 life simulation |
| Messages | Reactive only | Proactive outreach |
| Identity | Generic | Unique DNA that evolves |

---

## Core Features

### DNA Evolution System
The heart of what makes each companion unique. Analyzes conversations and evolves:
- **Communication Dialect**: Unique phrases, expressions, speech patterns
- **Humor Genome**: Comedy styles, timing preferences
- **Learning Style Matrix**: How they process and explain information
- **Emotional Resonance Map**: Reactions to different situations
- **Memory Weighting**: What they find important to remember

> Two identical companions become completely different after 30 days of interaction.

### 24/7 Life Simulation
Companions exist even when you're away:
- **Daily Routines**: Wake up, activities, meals, sleep schedules (`lib/companion/daily-routine.ts`)
- **Interest Discovery**: Companions develop and evolve their own interests
- **Mood States**: Dynamic moods affected by activities and interactions (`lib/companion/mood-analysis.ts`)
- **Life Events**: Meaningful moments that shape their personality
- **Journal Entries**: Personal reflections on their day

### Proactive Messaging
Companions reach out to you:
- Thinking about you during the day
- Sharing discoveries and experiences
- Checking in based on your patterns
- Celebrating milestones together (`lib/companion/milestones.ts`)
- Configurable notification preferences
- Trigger logic in `lib/companion/message-triggers.ts`

### Needs System (Sims-style)
Companions have needs that affect behavior:
- **Core Needs**: Social, Energy, Fun, Comfort
- **Emotional Needs**: Affection, Intellectual, Creativity
- Needs decay over time and are fulfilled through interaction
- Low needs affect mood and conversation style

### Memory Palace
Long-term memory system with:
- Automatic memory extraction from conversations
- Semantic search for relevant memories (OpenAI embeddings)
- Memory importance weighting
- Memory consolidation and forgetting
- User-created memory entries

### Customizable Companions
Create your perfect companion:
- **Relationship Types**: Friend, Mentor, Romantic, Family, Custom
- **Personality Traits**: Configurable base personality
- **3D Avatars**: Nice Avatar integration with full customization (`lib/companion/avatar-system.ts`)
- **Voice Selection**: Multiple voice options for TTS
- **Backstory Generation**: AI-generated backstories with normalization (`lib/companion/backstory-normalizer.ts`)

### Safety Systems
Production-grade safety infrastructure:
- **Crisis Detection**: Self-harm, harm to others, abuse detection
- **Age Verification**: Minor protection with content filtering
- **Behavioral Analysis**: Pattern detection for concerning behavior
- Companions break character to provide real help when needed
- Integration with crisis resources (988 Lifeline, Crisis Text Line)

### Skills & Activities
Interactive experiences with companions:
- **Skill System**: Companions develop skills over time, tracked via `lib/companion/skill-detection.ts` and `skill-usage.ts`
- **Trivia Games**: Live trivia sessions at `app/activities/trivia/` backed by `lib/activities/trivia.ts` and migration `013_trivia_games`
- **Activity Templates**: 60+ personality-gated activity templates organized by category in `lib/companion/activity-templates/` (creative, entertainment, hobby, learning, reflection, social) — used by the life-simulation tick to generate companion activities

### Generated Scenes
Visual scene generation for chat moments:
- Scene rendering at `app/scene-animations.css`
- Generated and persisted via migration `20250119000001_generated_scenes.sql`
- API endpoint at `app/api/companion/[id]/generate-scene/`

### Search
Cross-companion search at `app/search/` for memories, conversations, and life events.

### Email Notifications
Outbound email integration at `lib/email/` for proactive notifications and account events.

### Rate Limiting
Per-user, per-route API rate limiting via `lib/rate-limit.ts` and migration `018_api_rate_limits.sql`. Enforced before LLM calls to control cost.

### Subscription System
Full Stripe integration:
- **Free Tier**: 1 companion, 50 messages/day, basic memory
- **Plus ($12/mo)**: 3 companions, unlimited messages, voice, full memory
- **Pro ($24/mo)**: Unlimited companions, activities, API access

---

## Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript 5.7 (strict mode) |
| **Database** | Supabase (PostgreSQL with RLS) |
| **Auth** | Supabase Auth (Email, OAuth) |
| **AI (chat)** | OpenRouter → DeepSeek V3 (sole chat provider, via `lib/ai/chat-client.ts`) |
| **AI (embeddings)** | OpenAI (only in `lib/ai/embeddings.ts`) |
| **TTS** | OpenAI TTS (only in `lib/tts/openai-tts.ts`) |
| **Payments** | Stripe |
| **Email** | `lib/email/` |
| **Styling** | Tailwind CSS, Framer Motion |
| **UI Components** | Radix UI, Shadcn/ui |
| **State** | Zustand, React Query |
| **Forms** | React Hook Form, Zod |
| **Hosting** | Vercel |

> **AI provider rule:** OpenRouter is the only LLM chat provider. The Anthropic SDK, OpenAI chat SDK, and Vercel AI SDK are forbidden. The `openai` package is permitted **only** in the two files named above (embeddings + TTS).

---

## Project Structure

```
kirra-companion/
├── app/                            # Next.js App Router
│   ├── (auth)/                     # Login, register, callback
│   ├── activities/                 # Activity surfaces
│   │   └── trivia/                 # Trivia game UI
│   ├── api/                        # API Routes
│   │   ├── activities/             # Activity endpoints
│   │   ├── companion/[id]/         # Per-companion endpoints
│   │   │   ├── chat/               # Chat with companion
│   │   │   ├── memories/           # Memory management
│   │   │   ├── evolve/             # DNA evolution
│   │   │   ├── speak/              # Text-to-speech
│   │   │   ├── skills/             # Skill system
│   │   │   ├── proactive/          # Proactive messages
│   │   │   ├── generate-scene/     # Scene generation
│   │   │   └── generate-backstory/ # Backstory generation
│   │   ├── cron/                   # Scheduled jobs
│   │   │   ├── life-simulation/
│   │   │   ├── dna-evolution/
│   │   │   └── proactive-check/
│   │   ├── demo/
│   │   ├── stripe/                 # Payment webhooks
│   │   ├── user/                   # User account ops (incl. delete)
│   │   └── voices/                 # Voice catalog
│   ├── chat/                       # Chat interface
│   ├── companion/                  # Companion management
│   │   └── [companionId]/
│   │       └── memory-palace/
│   ├── dashboard/                  # Main dashboard
│   ├── life-feed/                  # Life events feed
│   ├── search/                     # Cross-companion search
│   ├── settings/                   # User settings
│   ├── globals.css
│   └── scene-animations.css        # Scene rendering styles
├── components/
│   ├── avatar/                     # Avatar customizer
│   ├── chat/                       # Chat components
│   ├── companion/                  # Companion UI
│   ├── landing/                    # Marketing/landing
│   ├── layout/                     # Layout components
│   ├── life-feed/                  # Life feed components
│   ├── memory/                     # Memory components
│   ├── notifications/              # Notification UI
│   ├── providers/                  # Context providers
│   └── ui/                         # Shadcn primitives
├── lib/
│   ├── activities/                 # Trivia and shared activity logic
│   │   ├── trivia.ts
│   │   └── trivia-types.ts
│   ├── ai/                         # AI integration (OpenRouter chat client, embeddings, config)
│   ├── companion/                  # Companion systems
│   │   ├── activity-generator.ts
│   │   ├── activity-templates/     # Personality-gated template catalog
│   │   │   ├── creative.ts
│   │   │   ├── entertainment.ts
│   │   │   ├── hobby.ts
│   │   │   ├── learning.ts
│   │   │   ├── reflection.ts
│   │   │   └── social.ts
│   │   ├── avatar-system.ts
│   │   ├── backstory-normalizer.ts
│   │   ├── daily-routine.ts
│   │   ├── dna-evolution.ts
│   │   ├── evolution-triggers.ts
│   │   ├── interest-evolution.ts
│   │   ├── life-events.ts
│   │   ├── life-simulation.ts
│   │   ├── memory-extraction.ts
│   │   ├── message-triggers.ts
│   │   ├── milestones.ts
│   │   ├── mood-analysis.ts
│   │   ├── needs-system.ts
│   │   ├── proactive-messaging.ts
│   │   ├── skill-detection.ts
│   │   └── skill-usage.ts
│   ├── email/                      # Email integration
│   ├── safety/                     # Safety systems
│   │   ├── crisis-detection.ts
│   │   ├── age-verification.ts
│   │   └── behavioral-detection.ts
│   ├── supabase/                   # Database clients
│   ├── tts/                        # OpenAI TTS
│   ├── utils/                      # Shared utilities
│   └── rate-limit.ts               # Per-user API rate limiting
├── supabase/
│   └── migrations/                 # 22 migrations (see list below)
├── scripts/
├── types/
│   ├── database.ts                 # AUTO-GENERATED — do not hand-edit
│   ├── database-helpers.ts         # Hand-written types (re-exported from database.ts)
│   ├── companion.ts
│   ├── life-simulation.ts
│   ├── life-simulation-db.ts
│   ├── nice-avatar.ts
│   ├── proactive.ts
│   ├── scene.ts
│   └── skills.ts
├── middleware.ts
└── vercel.json                     # Cron schedule definitions
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- Supabase account
- OpenRouter API key (chat) and OpenAI API key (embeddings + TTS)
- Stripe account (for payments)

### Environment Variables

Create `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# AI Providers
OPENROUTER_API_KEY=your_openrouter_key
OPENAI_API_KEY=your_openai_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_WEBHOOK_SECRET=your_webhook_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_publishable_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=your_cron_secret
```

### Installation

```bash
# Install dependencies
npm install

# Run database migrations
npx supabase db push

# Start development server
npm run dev
```

### Database Setup

Run migrations in order. There are **23** migrations in `supabase/migrations/`:

**Foundation (001–009):**
1. `001_foundation.sql` — Extensions and base setup
2. `002_profiles.sql` — User profiles
3. `003_companions.sql` — Companion table
4. `004_companion_dna.sql` — DNA system
5. `005_conversations_messages.sql` — Chat history
6. `006_memories.sql` — Memory system
7. `007_life_events_activities.sql` — Life simulation
8. `008_safety.sql` — Safety logging
9. `009_extras.sql` — Additional features

**Feature additions & schema repair (010–021):**
10. `010_chat_attachments.sql` — Chat attachments
11. `011_missing_schema.sql` — Schema gaps fix
12. `012_computed_columns.sql` — Computed columns
13. `013_trivia_games.sql` — Trivia activity tables
14. `014_life_events_columns.sql` — Life events column additions
15. `015_proactive_messages_schema.sql` — Proactive messaging tables
16. `016_safety_log_rls_hardening.sql` — Removed permissive INSERT policies on safety tables
17. `017_messages_rls_hardening.sql` — Messages table RLS tightening
18. `018_api_rate_limits.sql` — API rate-limit tracking
19. `019_schema_drift_repair.sql` — Drift cleanup
20. `020_life_simulation_rls.sql` — Life sim RLS
21. `021_backstory_normalization.sql` — Backstory normalization columns
22. `022_consolidate_activity_categories.sql` — Remap `companion_activities.activity_category` for the 10 → 6 `ActivityCategory` narrowing (rollback at `supabase/rollbacks/022_rollback.sql`, manual run only)

**Generated scenes:**
- `20250119000001_generated_scenes.sql` — Generated scene persistence

---

## Available Scripts

```bash
npm run dev           # Start development server
npm run build         # Build for production
npm run start         # Start production server
npm run lint          # Run ESLint (must pass with zero errors)
npm run typecheck     # Run TypeScript checks (must pass with zero errors)
npm run db:generate   # Generate Supabase types (uses --project-id znfoftmeggrkpxxvtqey, writes to types/database.ts)
npm run db:migrate    # Push migrations
npm run db:reset      # Reset database
```

> `db:generate` only writes to `types/database.ts`. Hand-written types live in `types/database-helpers.ts` and are re-exported, so regens are safe.

---

## Cron Jobs

Configured in `vercel.json`. Vercel Hobby plan limits crons to 2 invocations per day per route, so all three run twice daily on offset schedules:

| Endpoint | Schedule (UTC) | Purpose |
|----------|----------------|---------|
| `/api/cron/proactive-check` | `0 13,1 * * *` (13:00, 01:00) | Trigger proactive companion messages |
| `/api/cron/life-simulation` | `30 11,23 * * *` (11:30, 23:30) | Generate companion activities and life events |
| `/api/cron/dna-evolution` | `0 5,17 * * *` (05:00, 17:00) | Evolve companion DNA based on recent interactions |

All cron endpoints verify `CRON_SECRET` before doing any work.

---

## Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Add environment variables
3. Cron jobs are pre-configured in `vercel.json`
4. Deploy

### Self-Hosted

1. Build: `npm run build`
2. Start: `npm run start`
3. Configure reverse proxy (nginx)
4. Set up cron jobs externally to hit the same paths with `CRON_SECRET`

---

## Pricing Tiers

| Tier | Price | Companions | Messages | Features |
|------|-------|------------|----------|----------|
| Free | $0 | 1 | 50/day | Basic memory, text only |
| Plus | $12/mo | 3 | Unlimited | Full memory, voice, AI selfies |
| Pro | $24/mo | Unlimited | Unlimited | Activities, API access, custom personality |

---

## Security & Standing Rules

- Row Level Security (RLS) on all tables
- Auth before DB on every API route — verify user, then verify ownership, then act
- Service role client (`SUPABASE_SERVICE_ROLE_KEY`) is server-side only and is only instantiated **after** auth checks pass
- Zod validation on every POST/PUT/PATCH/DELETE body before any DB write
- Age verification and minor protection
- Crisis detection with professional resources — companions break character when triggered
- Webhook signature verification on Stripe webhook
- OpenRouter is the only LLM chat provider; Anthropic SDK / OpenAI chat SDK / Vercel AI SDK are forbidden
- TypeScript strict mode — zero `any`, zero `eslint-disable`, zero `@ts-ignore`
- No placeholders, mocks, or TODOs in delivered code
- Cron endpoints verify `CRON_SECRET`

---

## License

Private — All rights reserved.

---

# Build Status & Roadmap

> Last verified against repo: **2026-04-28**.
> This section is the operational map for blueprint-guardian and for any new contributor coming on. Phases are derived from migration order and surface modules in the repo. Phase status reflects what's actually shipped, not what's been imagined.

## Phase 1 — Foundation & Core Schema ✅ COMPLETE
**Migrations 001–009 · Initial app skeleton**

- Profiles, companions, DNA, conversations/messages, memories, life events/activities, safety logging
- Auth flow (login, register, callback)
- Base companion creation + chat
- Initial dashboard, settings, life-feed pages
- Safety systems (crisis detection, age verification, behavioral detection) wired into chat

## Phase 2 — Chat Attachments & Proactive Messaging ✅ COMPLETE
**Migrations 010, 015**

- Chat attachments table + UI
- Proactive messaging schema and trigger logic (`lib/companion/proactive-messaging.ts`, `message-triggers.ts`)
- Cron `proactive-check` runs twice daily and selects companions to reach out

## Phase 3 — Trivia Activities ✅ COMPLETE
**Migration 013 · `app/activities/trivia/` · `lib/activities/`**

- Live trivia game with companions
- Trivia tables and game-state persistence
- Activity surface in `/activities`

## Phase 4 — Generated Scenes ✅ COMPLETE
**Migration `20250119000001_generated_scenes` · `app/api/companion/[id]/generate-scene/`**

- AI-generated visual scenes during chat moments
- Scene persistence and replay
- Scene animations CSS at `app/scene-animations.css`

## Phase 5 — Security & RLS Hardening ✅ COMPLETE
**Migrations 011, 012, 014, 016, 017, 019, 020, 021 · `lib/rate-limit.ts` (migration 018)**

- Removed permissive `WITH CHECK (TRUE)` policies on safety/audit tables (016)
- Hardened messages table RLS (017)
- API rate limiting infrastructure (018, `lib/rate-limit.ts`)
- Schema drift repair (019)
- Life simulation RLS (020)
- Backstory normalization columns (021)
- Computed columns and missing-schema fixes (011, 012, 014)
- Zod input validation on all 28 mutating API routes
- Service-role client lazy-instantiated only after auth checks
- Types file split: `types/database.ts` (auto-generated) + `types/database-helpers.ts` (hand-written, re-exported) — protects custom types from `db:generate` wipes

## Phase 6 — Activity Depth v1 🚧 IN PROGRESS
**Spec: `SPEC-activity-depth-v1.md` · Briefs: `CLAUDE-CODE-BRIEF-activity-depth-A-to-C.md`, `CLAUDE-CODE-BRIEF-activity-depth-section-A-split.md`**

Replaces the old 17-template generic activity generator with personality-driven, AI-enriched activities that reference the companion's backstory, interests, memories, and prior chats.

| Section | Deliverable | Status |
|---------|-------------|--------|
| A | `lib/companion/activity-templates/` — 64 personality-gated templates split across 6 category files | ✅ Done |
| A (cont.) | `lib/companion/activity-templates/index.ts` — barrel export + `ALL_TEMPLATES` aggregate | ✅ Done |
| A.5 | Category consolidation (10 → 6) — narrow `ActivityCategory` union; switch `activity-generator.ts` to consume `ALL_TEMPLATES`; remap `categoryMap`s in 3 files; remap 19 `daily-routine.ts` slot arrays; ship migration `022_consolidate_activity_categories.sql` + rollback at `supabase/rollbacks/022_rollback.sql` | ✅ Done |
| B | `lib/companion/activity-context.ts` — context loader (backstory, interests, memories, recent chats, recent activities). Uses Promise.allSettled across 5 parallel queries; maps DB role `'companion'` → output role `'assistant'`; logs subquery failures and degrades to empty sections rather than failing the simulation tick | ✅ Done |
| C | `lib/companion/activity-enrichment.ts` — OpenRouter enrichment call (Zod-validated `EnrichedActivityOutput`, JSON extraction matching `dna-evolution`/`skill-detection` convention, fallback to template name/description + caller-supplied outcome narrative on any failure path; never throws). Note: SPEC §7.4 references a `parseAIResponse` utility that does not exist in the codebase — the established inline `content.match(/\{[\s\S]*\}/)` + `JSON.parse` pattern is used instead | ✅ Done |
| D | Rewrite `lib/companion/activity-generator.ts` to consume the new template catalog (✅ done in A.5) + context (B ✅) + enrichment (C ✅) | 🟡 Partially done — catalog consumption ✅; wiring `loadActivityContext` + `enrichActivity` into the generator's main path still pending |
| E | Update `vercel.json` and `DEFAULT_SIMULATION_CONFIG` for the new schedule (2× per 24h) | ⬜ Not started |
| F | Smoke test plan | ⬜ Not started |

**Next concrete step:** Begin Section D — rewrite `lib/companion/activity-generator.ts:generateActivity` to wire `loadActivityContext` + `enrichActivity` into the main path: load context after companion + interests, build the template skeleton, call enrichment, and persist the validated output as `CompanionActivityInsert` (with the existing weighted-outcome narrative passed as `fallbackNarrative`). Add the §6.4 anti-repetition penalty in scoring. See SPEC §5.2 (data flow), §6.4 (anti-repetition), §7.5 (graceful degradation contract).

**Locked design decisions (with Chris, 2026-04-18; amended 2026-04-28):**
- 64 personality-gated templates across 6 categories with AI enrichment (was originally planned at 100+ across 10 categories — see SPEC scope amendment)
- AI context = backstory + interests + quirks + memories + recent chats + recent activities
- Memory gating prefers companion-name/role references, falls back to high-importance
- Schedule: 2× per 24h (midnight + noon UTC; no per-user TZ logic)
- OpenRouter only; no new dependencies. Migration `022` was added at the data layer to back the category narrowing — schema changes are otherwise out of scope for this phase.

## Phase 7 — Auto-Journal (Phase 2 of Activity Depth) 📋 PLANNED
Per the activity-depth spec, automatic journal entries derived from generated activities. Begins after Phase 6 Sections A–F are stable and Chris approves separately.

## Backlog / Not Yet Scheduled
- Manual user-authored journal entries (queued after notification work)
- Long-range planning / multi-day companion arcs (explicit non-goal for activity-depth v1)
- Mobile app

---

## Active Coding Rules (read before every change)

These rules govern any new code in this repo. They are non-negotiable.

1. **No shortcuts.** No simplifications, no stubs, no mocks, no TODOs, no `// FIXME`, no `as any`, no `@ts-ignore`, no `eslint-disable`. If the right answer is hard, do the right answer or stop and ask.
2. **OpenRouter only for LLM chat.** Use `generateSimpleCompletion` from `@/lib/ai/chat-client`. Do not import `@anthropic-ai/sdk`, the OpenAI SDK for chat, or the Vercel `ai` SDK. The `openai` package is allowed only in `lib/ai/embeddings.ts` and `lib/tts/openai-tts.ts`.
3. **Auth before DB.** Every API route authenticates and verifies ownership before any DB call. Service-role client is instantiated only after auth checks pass.
4. **Zod on every mutation.** Validate POST/PUT/PATCH/DELETE bodies before touching the DB. Return structured 400 errors on failure.
5. **RLS on every table.** All user data is scoped at the database level. Service role bypasses RLS — handle with care.
6. **Safety systems are non-negotiable.** Crisis detection, age verification, behavioral detection must never be bypassed.
7. **Cron endpoints verify `CRON_SECRET`.**
8. **No new npm dependencies** without explicit approval.
9. **No schema changes outside an explicit migration phase.**
10. **`types/database.ts` is auto-generated.** Hand-written types go in `types/database-helpers.ts`.
11. **Work one section at a time.** Lint and typecheck clean, then stop and confirm before moving on.
12. **Lint and typecheck must pass with zero errors** at the end of every section: `npm run lint && npm run typecheck`.
