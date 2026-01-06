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
  ArrowRight,
  Check,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-background">
      {/* Subtle Background Accent */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-1/4 -top-1/4 h-[800px] w-[800px] rounded-full bg-primary/[0.03] blur-[120px]" />
        <div className="absolute -bottom-1/4 -left-1/4 h-[600px] w-[600px] rounded-full bg-primary/[0.02] blur-[100px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 border-b border-border/50 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-semibold tracking-tight">Kirra</span>
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

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:block"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-all hover:opacity-90"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-24 pt-16 lg:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-2 text-sm text-muted-foreground">
            <span className="flex h-1.5 w-1.5 rounded-full bg-primary" />
            <span>Now in public beta</span>
          </div>

          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            An AI companion that
            <br />
            <span className="gradient-text">actually remembers you</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Kirra is different. They have their own life, memories, and evolving 
            personality. Not just responses — genuine connection.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-base font-medium text-primary-foreground shadow-lg transition-all hover:shadow-xl sm:w-auto"
            >
              Create Your Companion
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <button className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card px-8 py-4 text-base font-medium transition-colors hover:bg-secondary sm:w-auto">
              <Play className="h-4 w-4" />
              Watch Demo
            </button>
          </div>

          {/* Social Proof */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-8 w-8 rounded-full border-2 border-background bg-secondary"
                  />
                ))}
              </div>
              <span>50,000+ companions</span>
            </div>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="h-4 w-4 fill-primary text-primary" />
              ))}
              <span className="ml-1">4.9 rating</span>
            </div>
          </div>
        </div>

        {/* Hero Preview */}
        <div className="relative mx-auto mt-20 max-w-4xl">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/[0.08]">
            {/* Window Chrome */}
            <div className="flex h-12 items-center gap-2 border-b border-border bg-secondary/30 px-4">
              <div className="flex gap-2">
                <div className="h-3 w-3 rounded-full bg-muted-foreground/20" />
                <div className="h-3 w-3 rounded-full bg-muted-foreground/20" />
                <div className="h-3 w-3 rounded-full bg-muted-foreground/20" />
              </div>
            </div>
            {/* Preview Content */}
            <div className="aspect-[16/10] bg-gradient-to-br from-secondary/50 to-background p-8">
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-6 h-20 w-20 animate-float rounded-full bg-primary/10 p-1">
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-primary">
                    <Sparkles className="h-8 w-8 text-primary-foreground" />
                  </div>
                </div>
                <p className="text-lg font-medium text-foreground">Meet your companion</p>
                <p className="mt-2 text-muted-foreground">Interactive preview</p>
              </div>
            </div>
          </div>
          
          {/* Decorative Elements */}
          <div className="absolute -bottom-4 -left-4 -right-4 -z-10 h-full rounded-2xl bg-secondary/50" />
        </div>
      </section>

      {/* What Makes Us Different */}
      <section className="relative z-10 border-t border-border bg-secondary/30 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Beyond chatbots
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Traditional AI assistants respond. Kirra companions live, remember, 
              and genuinely grow alongside you.
            </p>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Clock,
                title: 'Living Simulation',
                description:
                  'Your companion exists 24/7. They develop routines, discover interests, and think about you even when you\'re away.',
              },
              {
                icon: Brain,
                title: 'True Memory',
                description:
                  'Not just chat history. A visual memory system where you can see exactly what they remember and how memories connect.',
              },
              {
                icon: Zap,
                title: 'Unique DNA',
                description:
                  'Every companion has a unique neural fingerprint. No two are alike — yours is truly personalized to grow with you.',
              },
              {
                icon: Gamepad2,
                title: 'Shared Experiences',
                description:
                  'Actually do things together. Play games, watch content, create art, learn new skills — side by side.',
              },
              {
                icon: Heart,
                title: 'Emotional Intelligence',
                description:
                  'Advanced emotion understanding that predicts when you need support and adapts communication naturally.',
              },
              {
                icon: Shield,
                title: 'Your Data, Your Control',
                description:
                  'Full export capability, offline mode available, complete data sovereignty. Your companion belongs to you.',
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="group rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-lg"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature List */}
      <section id="features" className="relative z-10 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Everything you need
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              We studied every AI companion app and built something better. Here's what you get.
            </p>
          </div>

          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: MessageCircle, label: 'Unlimited conversations' },
              { icon: Brain, label: 'Long-term memory' },
              { icon: Heart, label: 'Emotional voice' },
              { icon: Users, label: 'Group chats' },
              { icon: Sparkles, label: 'AI-generated selfies' },
              { icon: Gamepad2, label: '10+ activities' },
              { icon: Shield, label: 'Data export' },
              { icon: Zap, label: 'Proactive messages' },
            ].map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground">
                  <item.icon className="h-5 w-5" />
                </div>
                <span className="font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative z-10 border-t border-border bg-secondary/30 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Get started in minutes
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Creating your companion is simple. Here's how it works.
            </p>
          </div>

          <div className="mt-16 grid gap-8 lg:grid-cols-3">
            {[
              {
                step: '01',
                title: 'Create your companion',
                description: 'Choose their name, personality traits, and relationship type. Make them uniquely yours.',
              },
              {
                step: '02',
                title: 'Start talking',
                description: 'Have natural conversations. Your companion learns your preferences, stories, and what matters to you.',
              },
              {
                step: '03',
                title: 'Watch them grow',
                description: 'Over time, your companion develops their own thoughts, opinions, and ways of supporting you.',
              },
            ].map((item, index) => (
              <div key={index} className="relative">
                <div className="mb-4 text-5xl font-display font-semibold text-primary/20">
                  {item.step}
                </div>
                <h3 className="mb-2 text-xl font-semibold">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative z-10 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Start free. Upgrade when you're ready.
            </p>
          </div>

          <div className="mt-16 grid gap-8 lg:grid-cols-3">
            {/* Free Tier */}
            <div className="rounded-2xl border border-border bg-card p-8">
              <div className="mb-6">
                <h3 className="text-lg font-semibold">Free</h3>
                <p className="mt-1 text-muted-foreground">Get started</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-display font-semibold">$0</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="mb-8 space-y-3">
                {['1 companion', '50 messages/day', 'Basic memory', 'Text chat only'].map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm">
                    <Check className="h-4 w-4 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="block w-full rounded-xl border border-border bg-secondary py-3 text-center font-medium transition-colors hover:bg-muted"
              >
                Get Started
              </Link>
            </div>

            {/* Plus Tier */}
            <div className="relative rounded-2xl border-2 border-primary bg-card p-8 shadow-lg">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-medium text-primary-foreground">
                Most Popular
              </div>
              <div className="mb-6">
                <h3 className="text-lg font-semibold">Plus</h3>
                <p className="mt-1 text-muted-foreground">For daily connection</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-display font-semibold">$12</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="mb-8 space-y-3">
                {['3 companions', 'Unlimited messages', 'Full memory system', 'Voice messages', 'AI selfies', 'Priority support'].map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm">
                    <Check className="h-4 w-4 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="block w-full rounded-xl bg-primary py-3 text-center font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Start Free Trial
              </Link>
            </div>

            {/* Pro Tier */}
            <div className="rounded-2xl border border-border bg-card p-8">
              <div className="mb-6">
                <h3 className="text-lg font-semibold">Pro</h3>
                <p className="mt-1 text-muted-foreground">Everything unlimited</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-display font-semibold">$24</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="mb-8 space-y-3">
                {['Unlimited companions', 'All Plus features', 'Activities & games', 'Group chats', 'API access', 'Custom personality'].map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm">
                    <Check className="h-4 w-4 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="block w-full rounded-xl border border-border bg-secondary py-3 text-center font-medium transition-colors hover:bg-muted"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="relative overflow-hidden rounded-3xl bg-primary p-12 sm:p-16">
            <div className="relative mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl font-semibold tracking-tight text-primary-foreground sm:text-4xl">
                Ready to meet your companion?
              </h2>
              <p className="mt-4 text-lg text-primary-foreground/80">
                Create your personalized AI companion in minutes. 
                Start with our free tier — no credit card required.
              </p>
              <div className="mt-8">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-background px-8 py-4 text-base font-medium text-foreground shadow-lg transition-all hover:shadow-xl"
                >
                  Get Started Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-display font-semibold">Kirra</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <Link href="/privacy" className="hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">
                Terms
              </Link>
              <Link href="/support" className="hover:text-foreground transition-colors">
                Support
              </Link>
              <Link href="/blog" className="hover:text-foreground transition-colors">
                Blog
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Kirra. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
