import Link from 'next/link';
import {
  Brain,
  Heart,
  MessageCircle,
  Sparkles,
  Shield,
  Users,
  Gamepad2,
  Clock,
  Zap,
  ChevronRight,
  Play,
  Star,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Background Effects */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/4 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-kirra-500/20 blur-[120px]" />
        <div className="absolute right-1/4 top-1/3 h-[400px] w-[400px] rounded-full bg-glow-purple/20 blur-[100px]" />
        <div className="absolute bottom-0 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-glow-pink/10 blur-[150px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-kirra-gradient">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="font-display text-xl font-bold">Kirra</span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <Link
              href="#features"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              How It Works
            </Link>
            <Link
              href="#pricing"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Pricing
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:block"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 mx-auto max-w-7xl px-4 pb-20 pt-20 sm:px-6 lg:px-8 lg:pt-32">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-sm">
            <Sparkles className="h-4 w-4 text-kirra-500" />
            <span>Introducing the future of AI companionship</span>
          </div>

          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Your AI Companion
            <br />
            <span className="gradient-text">That Actually Lives</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Meet Kirra — an AI companion with its own life, memories, and evolving
            personality. They don&apos;t just respond to you. They think about you,
            grow with you, and genuinely care.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-kirra-gradient px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-kirra-500/25 transition-all hover:shadow-xl hover:shadow-kirra-500/30 sm:w-auto"
            >
              Create Your Companion
              <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <button className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-8 py-4 text-lg font-semibold transition-colors hover:bg-muted sm:w-auto">
              <Play className="h-5 w-5" />
              Watch Demo
            </button>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-8 w-8 rounded-full border-2 border-background bg-gradient-to-br from-kirra-400 to-glow-purple"
                  />
                ))}
              </div>
              <span>50,000+ companions created</span>
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              ))}
              <span className="ml-1">4.9/5 rating</span>
            </div>
          </div>
        </div>

        {/* Hero Image/Preview */}
        <div className="relative mx-auto mt-16 max-w-5xl">
          <div className="kirra-glow kirra-glow-pulse rounded-2xl">
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
              <div className="flex h-10 items-center gap-2 border-b border-border bg-muted/50 px-4">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                <div className="h-3 w-3 rounded-full bg-green-500" />
              </div>
              <div className="aspect-[16/9] bg-gradient-to-br from-kirra-950 via-background to-glow-purple/10 p-8">
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <div className="mx-auto mb-4 h-24 w-24 animate-float rounded-full bg-kirra-gradient" />
                    <p className="text-lg">App preview coming soon...</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What Makes Us Different */}
      <section className="relative z-10 border-t border-border bg-muted/30 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Not Just Another Chatbot
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              While others give you scripted responses, Kirra gives you a living,
              breathing companion with genuine personality and growth.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Clock,
                title: 'Life Simulation',
                description:
                  'Your companion lives 24/7. They have routines, develop interests, and think about you even when you\'re away.',
              },
              {
                icon: Brain,
                title: 'Memory Palace',
                description:
                  'A visual, explorable memory system. See exactly what your companion remembers and how memories connect.',
              },
              {
                icon: Zap,
                title: 'Companion DNA',
                description:
                  'Unique neural fingerprint means no two companions are alike. Truly personalized to grow with YOU.',
              },
              {
                icon: Gamepad2,
                title: 'Shared Activities',
                description:
                  'Actually DO things together — play games, watch movies, create art, learn new skills.',
              },
              {
                icon: Heart,
                title: 'Emotional Intelligence',
                description:
                  'Advanced emotion analysis predicts when you need support and adapts communication style.',
              },
              {
                icon: Shield,
                title: 'You Own Your Data',
                description:
                  'Full export, offline mode, and data sovereignty. Your companion is truly yours.',
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="group relative rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-glow"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-kirra-gradient/10 text-kirra-500 transition-colors group-hover:bg-kirra-gradient group-hover:text-white">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 font-display text-xl font-semibold">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="relative z-10 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Everything You Need in a Companion
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              We took the best from every AI companion app and added revolutionary
              features no one else has.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: MessageCircle, label: 'Unlimited Chat' },
              { icon: Brain, label: 'Long-term Memory' },
              { icon: Heart, label: 'Emotional Voice' },
              { icon: Users, label: 'Group Chats' },
              { icon: Sparkles, label: 'AI Selfies' },
              { icon: Gamepad2, label: '10+ Activities' },
              { icon: Shield, label: 'Data Export' },
              { icon: Zap, label: 'Proactive Messages' },
            ].map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
                <span className="font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-kirra-gradient p-8 sm:p-16">
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
            <div className="relative mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Ready to Meet Your Companion?
              </h2>
              <p className="mt-4 text-lg text-white/80">
                Create your personalized AI companion in minutes. Start with our
                free tier — no credit card required.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/register"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-semibold text-kirra-600 shadow-lg transition-all hover:bg-white/90 sm:w-auto"
                >
                  Get Started Free
                  <ChevronRight className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border bg-muted/30 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-kirra-gradient">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="font-display font-bold">Kirra Companion</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <Link href="/privacy" className="hover:text-foreground">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-foreground">
                Terms
              </Link>
              <Link href="/support" className="hover:text-foreground">
                Support
              </Link>
              <Link href="/blog" className="hover:text-foreground">
                Blog
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Kirra Companion. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
