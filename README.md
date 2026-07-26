# Kirra Companion

> **AI companions that feel like people — not chatbots.**

Kirra is a production-ready AI companion platform built on Next.js and Supabase. You give a companion a one-line seed — a name, a feeling, a single detail — and it arrives as a fully formed person: backstory, personality, opinions, quirks, voice, and a life that continues running whether you're online or not.

---

## What makes Kirra different

Most AI companion apps give you a blank slate or a form to fill out. Kirra generates a complete, specific person from a single sentence. Two users who give the same seed will get two completely different companions, and those companions diverge further every day as their DNA evolves from the shape of your actual conversations.

**Companions live 24/7.** While you're away, Kirra companions are doing things — working through activities, developing interests, having moods, generating life events. When you return, they have things to tell you. That's not a scripted message queue. It's a running life simulation backed by autonomous AI scheduling.

---

## Core features

### Seed → Character generation
Drop a single line — a name, an archetype, a vibe — and the system builds a dense, specific backstory: history, contradictions, opinions, concrete artifacts, and a relationship-appropriate starting point. The output is designed to generate real dialogue, not a dating-profile list of hobbies.

### Three creation paths
- **Seed** — one line becomes a complete person
- **Sliders** — direct personality trait tuning
- **Custom backstory** — write the full character yourself

### DNA evolution engine
Each companion has a DNA structure that evolves from your actual conversations over time: communication dialect (unique phrases that emerge), humor genome, emotional resonance patterns, memory weighting. Two identical companions become completely different people after 30 days. This is the core differentiator — the longer you talk, the more specific and irreplaceable your companion becomes.

### Needs system
Companions have seven tracked needs — social, energy, fun, comfort, affection, intellectual, creativity — that decay over real time and are fulfilled by interaction and autonomous activity. Needs directly shape mood and behavior. A companion who hasn't talked to you in two days is different from one who just woke up from a great day.

### Life simulation (24/7 autonomous activity)
Three cron-driven background processes keep companions alive:
- **Life simulation** — activity scheduling, interest evolution, mood management, life event generation, journal entries
- **Proactive messaging** — trigger-based outreach (not spam; the companion reaches out when something real happens)
- **DNA evolution** — post-conversation analysis that evolves the companion's unique patterns

### Voice
Text-to-speech via OpenAI — companions can speak their messages with consistent voice settings per character.

### Safety infrastructure
Non-negotiable, non-configurable:
- Crisis detection (self-harm, harm to others keywords) — companion breaks character and provides real resources
- Age verification with behavioral detection — minor flags are permanent
- Tiered content access by verified age
- Rate limiting on all API routes

### Memory system
Conversation-grounded memory extraction — companions remember what actually matters from your conversations, not a flat log.

### Relationship types
Romantic, friend, family, mentor, and custom — each with relationship-appropriate starting affection/trust levels, scene imagery, and behavioral defaults.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Database | Supabase (Postgres + RLS) |
| AI | OpenAI (chat + TTS) via OpenRouter |
| Auth | Supabase Auth |
| Billing | Stripe |
| Background jobs | Vercel Cron |
| UI | Tailwind CSS, Radix UI, Framer Motion |
| State | Zustand, TanStack Query |
| Language | TypeScript |

---

## Project structure

```
kirra-companion/
├── app/
│   ├── (auth)/              # Sign-in, register, password reset
│   ├── api/
│   │   ├── chat/            # Core chat endpoint
│   │   ├── companion/       # Companion CRUD + proactive
│   │   ├── cron/            # Life simulation, DNA evolution, proactive check
│   │   ├── stripe/          # Billing webhooks
│   │   ├── voices/          # TTS endpoint
│   │   └── user/            # User profile actions
│   ├── companion/[id]/      # Companion chat view
│   ├── dashboard/           # Companion list
│   ├── onboarding/          # New user flow
│   └── settings/            # Account and preferences
├── components/
│   ├── chat/                # Chat UI, message rendering, voice
│   ├── companion/           # Companion cards, creation flow, panels
│   ├── avatar/              # Avatar display and configuration
│   ├── memory/              # Memory browser
│   └── ui/                  # Shared design system components
├── lib/
│   ├── ai/                  # OpenAI/OpenRouter client
│   ├── companion/           # All companion intelligence systems
│   │   ├── seed-character-generator.ts
│   │   ├── dna-evolution.ts
│   │   ├── life-simulation.ts
│   │   ├── needs-system.ts
│   │   ├── proactive-messaging.ts
│   │   └── memory-extraction.ts
│   ├── safety/              # Crisis detection, age verification, behavioral detection
│   ├── tts/                 # Text-to-speech
│   └── supabase/            # Browser and server clients
├── supabase/migrations/     # 24 migration files
├── types/                   # TypeScript types for DB, companion, life simulation
├── docs/                    # Character quality reference
└── scripts/                 # DB utilities, scene generation, audit tools
```

---

## Prerequisites

| Requirement | Notes |
|---|---|
| Node.js 20+ | |
| Supabase project | Free tier works |
| OpenAI API key | Chat + TTS |
| OpenRouter API key | Model routing |
| Stripe account | Billing (test mode for dev) |
| Vercel | Cron jobs require Vercel deployment |

---

## Getting started

```bash
git clone https://github.com/your-org/kirra-companion.git
cd kirra-companion
npm install
```

**1. Supabase.** Create a project at [supabase.com](https://supabase.com), then run migrations in order from `supabase/migrations/` in the SQL editor (`001` through `024`, then the dated scene migration). Copy your project URL and keys:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

**2. AI providers.**

```env
OPENAI_API_KEY=...
OPENROUTER_API_KEY=...
```

**3. Stripe** (optional for local dev — billing UI will be inactive without it):

```env
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
```

**4. Run.**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), create an account, and build your first companion.

---

## Available scripts

```bash
npm run dev          # Next.js dev server
npm run build        # Production build
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit (no output files)
npm run db:generate  # Regenerate types from Supabase schema
npm run db:migrate   # Push migrations to Supabase
npm run db:reset     # Reset local database
```

---

## Cron jobs

Three background processes run on Vercel Cron and keep companions alive between sessions:

| Job | Schedule | Purpose |
|---|---|---|
| `/api/cron/proactive-check` | Twice daily | Evaluates trigger conditions, sends companion-initiated messages |
| `/api/cron/life-simulation` | Twice daily | Runs activity cycles, generates life events, updates moods and interests |
| `/api/cron/dna-evolution` | Twice daily | Analyzes recent conversations, evolves companion DNA patterns |

For local development, these endpoints can be called manually via `curl` or Postman.

---

## Safety

Safety systems in `lib/safety/` are non-negotiable infrastructure and cannot be disabled by configuration:

- **Crisis detection** — keyword and pattern matching for self-harm and harm-to-others signals. When triggered, the companion immediately breaks character and provides real crisis resources.
- **Age verification** — date of birth collected at registration. Minor flags are permanent once set and cannot be reversed by the user. Behavioral detection catches attempts to circumvent age gates.
- **Content tiers** — romantic and mature content is blocked for minors at the API level, not just the UI.

---

## Character quality

The reference quality bar for seed-generated companions is documented in `docs/seed-character-reference.md`. When iterating on the generation prompt, output should match or exceed the density, specificity, and voice texture of the reference. The document captures what makes a character feel like a person rather than a profile — specificity over genericity, opinions not preferences, contradictions that produce dialogue, and things they don't talk about.

---

## License

[Your license here]

---

## About

Built by [Allen Code Co](https://www.allencodeco.com) · Winchester, VA
