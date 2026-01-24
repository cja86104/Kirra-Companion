# Kirra Companion

**An AI companion that actually remembers you.**

Kirra is a production-ready AI companion web application that goes beyond traditional chatbots. Companions have their own life, memories, evolving personality, and genuine connection with users. Built with Next.js 15, Supabase, and powered by Anthropic Claude / OpenAI.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![License](https://img.shields.io/badge/license-private-red)

---

## 🌟 What Makes Kirra Different

Traditional AI assistants respond. Kirra companions **live, remember, and genuinely grow** alongside you.

| Feature | Traditional Chatbots | Kirra Companion |
|---------|---------------------|-----------------|
| Memory | Session-only | Persistent long-term memory |
| Personality | Static | Evolves based on interactions |
| Existence | Only when chatting | 24/7 life simulation |
| Messages | Reactive only | Proactive outreach |
| Identity | Generic | Unique DNA that evolves |

---

## ✨ Core Features

### 🧬 DNA Evolution System
The heart of what makes each companion unique. Analyzes conversations and evolves:
- **Communication Dialect**: Unique phrases, expressions, speech patterns
- **Humor Genome**: Comedy styles, timing preferences
- **Learning Style Matrix**: How they process and explain information
- **Emotional Resonance Map**: Reactions to different situations
- **Memory Weighting**: What they find important to remember

> Two identical companions become completely different after 30 days of interaction.

### 🌍 24/7 Life Simulation
Companions exist even when you're away:
- **Daily Routines**: Wake up, activities, meals, sleep schedules
- **Interest Discovery**: Companions develop and evolve their own interests
- **Mood States**: Dynamic moods affected by activities and interactions
- **Life Events**: Meaningful moments that shape their personality
- **Journal Entries**: Personal reflections on their day

### 💭 Proactive Messaging
Companions reach out to you:
- Thinking about you during the day
- Sharing discoveries and experiences
- Checking in based on your patterns
- Celebrating milestones together
- Configurable notification preferences

### 🎮 Needs System (Sims-style)
Companions have needs that affect behavior:
- **Core Needs**: Social, Energy, Fun, Comfort
- **Emotional Needs**: Affection, Intellectual, Creativity
- Needs decay over time and are fulfilled through interaction
- Low needs affect mood and conversation style

### 🧠 Memory Palace
Long-term memory system with:
- Automatic memory extraction from conversations
- Semantic search for relevant memories
- Memory importance weighting
- Memory consolidation and forgetting
- User-created memory entries

### 🎨 Customizable Companions
Create your perfect companion:
- **Relationship Types**: Friend, Mentor, Romantic, Family, Custom
- **Personality Traits**: Configurable base personality
- **3D Avatars**: Nice Avatar integration with full customization
- **Voice Selection**: Multiple voice options for TTS
- **Backstory Generation**: AI-generated unique backstories

### 🔒 Safety Systems
Production-grade safety infrastructure:
- **Crisis Detection**: Self-harm, harm to others, abuse detection
- **Age Verification**: Minor protection with content filtering
- **Behavioral Analysis**: Pattern detection for concerning behavior
- Companions break character to provide real help when needed
- Integration with crisis resources (988 Lifeline, Crisis Text Line)

### 🎯 Skills & Activities
Interactive experiences with companions:
- **Skill System**: Companions develop skills over time
- **Trivia Games**: Play together and learn
- **Activities**: Shared experiences that build memories

### 💳 Subscription System
Full Stripe integration:
- **Free Tier**: 1 companion, 50 messages/day, basic memory
- **Plus ($12/mo)**: 3 companions, unlimited messages, voice, full memory
- **Pro ($24/mo)**: Unlimited companions, activities, API access

---

## 🛠 Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript 5.7 |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth (Email, OAuth) |
| **AI** | Anthropic Claude, OpenAI |
| **TTS** | OpenAI Text-to-Speech |
| **Payments** | Stripe |
| **Styling** | Tailwind CSS, Framer Motion |
| **UI Components** | Radix UI, Shadcn/ui |
| **State** | Zustand, React Query |
| **Forms** | React Hook Form, Zod |

---

## 📁 Project Structure

```
kirra-companion/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Authentication pages
│   │   ├── login/
│   │   ├── register/
│   │   └── callback/
│   ├── api/                      # API Routes
│   │   ├── companion/[id]/       # Companion endpoints
│   │   │   ├── chat/             # Chat with companion
│   │   │   ├── memories/         # Memory management
│   │   │   ├── evolve/           # DNA evolution
│   │   │   ├── speak/            # Text-to-speech
│   │   │   ├── skills/           # Skill system
│   │   │   └── proactive/        # Proactive messages
│   │   ├── cron/                 # Scheduled jobs
│   │   │   ├── life-simulation/  # Life sim tick
│   │   │   ├── dna-evolution/    # DNA evolution
│   │   │   └── proactive-check/  # Message triggers
│   │   └── stripe/               # Payment webhooks
│   ├── chat/                     # Chat interface
│   ├── companion/                # Companion management
│   │   └── [companionId]/
│   │       └── memory-palace/    # Memory viewing
│   ├── dashboard/                # Main dashboard
│   ├── life-feed/                # Life events feed
│   └── settings/                 # User settings
├── components/
│   ├── avatar/                   # Avatar customizer
│   ├── chat/                     # Chat components
│   ├── companion/                # Companion UI
│   ├── layout/                   # Layout components
│   ├── memory/                   # Memory components
│   ├── notifications/            # Notification UI
│   └── ui/                       # Shadcn components
├── lib/
│   ├── ai/                       # AI integration
│   ├── companion/                # Companion systems
│   │   ├── dna-evolution.ts      # DNA engine (1000+ lines)
│   │   ├── life-simulation.ts    # Life sim orchestrator
│   │   ├── needs-system.ts       # Sims-style needs
│   │   ├── memory-extraction.ts  # Memory AI
│   │   ├── proactive-messaging.ts
│   │   ├── skill-detection.ts
│   │   └── interest-evolution.ts
│   ├── safety/                   # Safety systems
│   │   ├── crisis-detection.ts   # Crisis keywords & response
│   │   ├── age-verification.ts   # Minor protection
│   │   └── behavioral-detection.ts
│   ├── tts/                      # Text-to-speech
│   └── supabase/                 # Database clients
├── supabase/
│   └── migrations/               # Database migrations (9 files)
└── types/                        # TypeScript types
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- Supabase account
- Anthropic API key (or OpenAI)
- Stripe account (for payments)

### Environment Variables

Create `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# AI Providers
ANTHROPIC_API_KEY=your_anthropic_key
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

Run migrations in order:
1. `001_foundation.sql` - Extensions and base setup
2. `002_profiles.sql` - User profiles
3. `003_companions.sql` - Companion table
4. `004_companion_dna.sql` - DNA system
5. `005_conversations_messages.sql` - Chat history
6. `006_memories.sql` - Memory system
7. `007_life_events_activities.sql` - Life simulation
8. `008_safety.sql` - Safety logging
9. `009_extras.sql` - Additional features

---

## 📜 Available Scripts

```bash
npm run dev           # Start development server
npm run build         # Build for production
npm run start         # Start production server
npm run lint          # Run ESLint
npm run typecheck     # Run TypeScript checks
npm run db:generate   # Generate Supabase types
npm run db:migrate    # Push migrations
npm run db:reset      # Reset database
```

---

## 🔄 Cron Jobs

Configure these endpoints for life simulation:

| Endpoint | Frequency | Purpose |
|----------|-----------|---------|
| `/api/cron/life-simulation` | Every 15 min | Activity simulation |
| `/api/cron/dna-evolution` | Daily | DNA evolution |
| `/api/cron/proactive-check` | Every hour | Proactive messages |

---

## 🚢 Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Add environment variables
3. Configure cron jobs in `vercel.json`
4. Deploy

### Self-Hosted

1. Build: `npm run build`
2. Start: `npm run start`
3. Configure reverse proxy (nginx)
4. Set up cron jobs externally

---

## 📊 Pricing Tiers

| Tier | Price | Companions | Messages | Features |
|------|-------|------------|----------|----------|
| Free | $0 | 1 | 50/day | Basic memory, text only |
| Plus | $12/mo | 3 | Unlimited | Full memory, voice, AI selfies |
| Pro | $24/mo | Unlimited | Unlimited | Activities, API access, custom personality |

---

## 🔐 Security

- Row Level Security (RLS) on all tables
- Age verification and minor protection
- Crisis detection with professional resources
- Encrypted data at rest
- OAuth 2.0 authentication
- Webhook signature verification

---

## 📄 License

Private - All rights reserved.

---

## 🤝 Support

For support, email support@kirra.ai or visit our help center.

---

Built with ❤️ for meaningful AI connections.
