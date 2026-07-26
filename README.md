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

Kirra Companion Source Available License
Version 1.0 — 2026

Copyright (c) 2026 Allen Code Co
Chris Allen — Winchester, Virginia

================================================================================
PLAIN ENGLISH SUMMARY (not a substitute for the full terms below)

You are free to use, run, and modify Kirra Companion for personal,
non-commercial purposes. You may not use it — or any substantial part of it —
to build, power, or operate any product or service that generates revenue,
is offered commercially, or competes with Kirra Companion. If you want to
do any of those things, contact us first.
================================================================================


1. DEFINITIONS

   "Software" means the Kirra Companion source code, documentation, assets,
   and all associated files in this repository, including but not limited to:
   the companion intelligence systems (seed character generation, DNA evolution
   engine, life simulation, needs system, proactive messaging, memory
   extraction), safety infrastructure, and all supporting libraries,
   components, and configuration files.

   "Core Engine" means, specifically, the companion intelligence systems
   located in lib/companion/, lib/ai/, lib/safety/, lib/tts/, lib/stt/,
   and the API routes in app/api/ that power those systems. The Core Engine
   is the primary subject of the commercial restrictions in Section 3.

   "Personal Use" means use by an individual for private, non-commercial
   purposes — running the Software for yourself, for learning, or for
   non-revenue-generating personal projects. Personal Use does not include
   use within any organization, company, or group that operates commercially,
   even if your individual role within that entity is unpaid.

   "Commercial Use" means any use of the Software, in whole or in part, that:
   (a) generates revenue directly or indirectly;
   (b) is offered as a product or service to third parties, whether free or
       paid;
   (c) is used internally by a for-profit organization to support its
       operations; or
   (d) is used to build, train, or improve any competing AI companion product
       or service.

   "You" means the individual or legal entity exercising the rights granted
   under this License.


2. GRANT OF RIGHTS — PERSONAL USE

   Subject to the terms and conditions of this License, Allen Code Co grants
   You a worldwide, royalty-free, non-exclusive, non-transferable license to:

   (a) Use and run the Software for Personal Use;
   (b) Copy and modify the Software for Personal Use; and
   (c) Share unmodified copies of the Software with others, provided this
       License is included in full and no fees are charged for the copy.

   No other rights are granted.


3. RESTRICTIONS

   3.1 No Commercial Use. You may not engage in Commercial Use of the
   Software or any portion of it without a separate written commercial
   license from Allen Code Co.

   3.2 No Competing Products. You may not use the Software, the Core Engine,
   or any substantial portion of either to build, operate, power, or improve
   any AI companion platform, product, or service — whether commercial or not
   — that is made available to third parties.

   3.3 No Sublicensing. You may not sublicense, sell, rent, lease, or
   otherwise transfer rights to the Software or any portion of it.

   3.4 No Removal of Notices. You may not remove or alter any copyright,
   license, or attribution notices contained in the Software.

   3.5 Modifications. If You modify the Software for Personal Use, your
   modifications are subject to this same License. Modified versions may not
   be distributed under a different license, and this License must be
   included with any distribution.

   3.6 No Extraction of the Core Engine. You may not extract, isolate, or
   repackage the Core Engine — or any substantial portion of the companion
   intelligence systems — for use in any separate project, product, or
   codebase, whether or not that use is commercial.


4. COMMERCIAL LICENSING

   If you wish to use Kirra Companion or its Core Engine for any purpose not
   permitted by Section 2, including Commercial Use, integration into another
   product, or use within an organization, you must obtain a separate
   commercial license.

   Contact: chris@allencodeco.com
   Website: https://www.allencodeco.com


5. CONTRIBUTIONS

   Any contribution intentionally submitted to this project by You shall be
   subject to this License. By submitting a contribution, You represent that
   You have the right to do so and that Allen Code Co may use, modify, and
   distribute Your contribution under the terms of this License.


6. DISCLAIMER OF WARRANTIES

   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
   OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. IN NO EVENT SHALL
   ALLEN CODE CO OR CHRIS ALLEN BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER
   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
   FROM, OUT OF, OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
   DEALINGS IN THE SOFTWARE.


7. LIMITATION OF LIABILITY

   TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL
   ALLEN CODE CO OR CHRIS ALLEN BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
   SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
   TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
   PROFITS; OR BUSINESS INTERRUPTION) ARISING IN ANY WAY OUT OF THE USE OF
   OR INABILITY TO USE THE SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
   SUCH DAMAGE.


8. TERMINATION

   Your rights under this License terminate automatically if You fail to
   comply with any of its terms. Upon termination, You must destroy all
   copies of the Software in your possession. Sections 3, 6, 7, and 9
   survive termination.


9. GOVERNING LAW

   This License shall be governed by and construed in accordance with the
   laws of the Commonwealth of Virginia, United States, without regard to
   its conflict of law provisions. Any legal action arising under this
   License shall be brought exclusively in the state or federal courts
   located in Virginia.


10. ENTIRE AGREEMENT

    This License constitutes the entire agreement between You and Allen Code Co
    with respect to the Software and supersedes all prior or contemporaneous
    understandings, agreements, representations, and warranties. No waiver of
    any provision shall be effective unless in writing and signed by Allen
    Code Co.


================================================================================
For licensing inquiries: chris@allencodeco.com
================================================================================

---

## About

Built by [Allen Code Co](https://www.allencodeco.com) · Winchester, VA
