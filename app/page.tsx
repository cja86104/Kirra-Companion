import Link from 'next/link';
import s from './page.module.css';
import DemoChat from '@/components/landing/DemoChat';

export default function LandingPage() {
  return (
    <div className={s.page}>

      {/* ── NAVIGATION ────────────────────────── */}
      <nav className={s.nav}>
        <div className={`${s.wrap} ${s.navInner}`}>
          <Link href="/" className={s.logo}>
            Kirra<span className={s.logoAccent}>.</span>
          </Link>
          <ul className={s.navLinks}>
            <li><a href="#demo">Demo</a></li>
            <li><a href="#features">Features</a></li>
            <li><a href="#pricing">Pricing</a></li>
          </ul>
          <div className={s.navActions}>
            <Link href="/login" className={s.navSignIn}>Sign in</Link>
            <Link href="/register" className={s.navStart}>
              Start free
              <span>→</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────── */}
      <section className={s.hero}>
        <div className={s.heroOrb1} />
        <div className={s.heroOrb2} />
        <div className={s.wrap}>
          <div className={s.heroLayout}>
            <div>
              <div className={`${s.heroBadge} ${s.fadeUp} ${s.d1}`}>
                <span className={s.heroBadgeDot} />
                Now in public beta
              </div>
              <h1 className={`${s.heroHeadline} ${s.fadeUp} ${s.d2}`}>
                One seed.<br />
                <em className={s.heroHeadlineAccent}>A complete person.</em>
              </h1>
              <p className={`${s.heroSub} ${s.fadeUp} ${s.d3}`}>
                Most AI companions make you fill out forms. You give a Kirra
                companion a seed — a name, a feeling, a single line — and they
                arrive as a complete person. Not assembled. Discovered.
              </p>
              <div className={`${s.heroActions} ${s.fadeUp} ${s.d4}`}>
                <Link href="/register" className={s.btnPrimary}>
                  Create your companion
                  <span className={s.btnArrow}>→</span>
                </Link>
                <a href="#demo" className={s.btnGhost}>
                  Try the demo
                </a>
              </div>
              <div className={`${s.heroProof} ${s.fadeUp} ${s.d5}`}>
                <div className={s.heroProofItem}>
                  <span className={s.heroProofNum}>14 days</span>
                  <span className={s.heroProofLabel}>Free trial</span>
                </div>
                <div className={s.heroProofDivider} />
                <div className={s.heroProofItem}>
                  <span className={s.heroProofNum}>No card</span>
                  <span className={s.heroProofLabel}>Required</span>
                </div>
                <div className={s.heroProofDivider} />
                <div className={s.heroProofItem}>
                  <span className={s.heroProofNum}>Cancel</span>
                  <span className={s.heroProofLabel}>Anytime</span>
                </div>
              </div>
            </div>

            {/* Floating avatar orb */}
            <div className={s.heroVisual}>
              <div className={s.avatarRing1} />
              <div className={s.avatarRing2} />
              <div className={s.avatarCore}>
                <span className={s.avatarK}>K</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PROBLEM — EDITORIAL ───────────────── */}
      <section className={s.sectionProblem}>
        <span className={s.sectionGhost} aria-hidden="true">001</span>
        <div className={s.wrap}>
          <p className={s.sectionLabel}>The cold start problem</p>
          <p className={s.problemQuote}>
            You download the app. You say hello. The AI says something
            generic —{' '}
            <em className={s.problemQuoteMuted}>&ldquo;Hi! Tell me about yourself.&rdquo;</em>{' '}
            No personality. No history. No reason to keep talking.{' '}
            <strong className={s.problemQuoteStrong}>
              Most people leave within five minutes.
            </strong>{' '}
            Every AI companion on the market suffers from this.
          </p>

          <div className={s.problemCompare}>
            <div className={s.problemSide}>
              <p className={`${s.problemSideLabel} ${s.problemSideLabelBad}`}>
                Every other app
              </p>
              <h3 className={s.problemSideTitle}>A blank canvas</h3>
              <ul className={s.problemSideList}>
                <li>Generic opening — &ldquo;Tell me about yourself&rdquo;</li>
                <li>You do all the work building personality</li>
                <li>Takes weeks to feel like a real connection</li>
                <li>Most users leave before that ever happens</li>
              </ul>
            </div>
            <div className={s.problemSide}>
              <p className={`${s.problemSideLabel} ${s.problemSideLabelGood}`}>
                Kirra Companion System
              </p>
              <h3 className={s.problemSideTitle}>Already someone</h3>
              <ul className={s.problemSideList}>
                <li>You give a seed — a name, a line, a feeling</li>
                <li>The system builds a full person from it</li>
                <li>Backstory, voice, and opinions from word one</li>
                <li>The first conversation is the best conversation</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── LIVE DEMO ─────────────────────────── */}
      <section className={s.sectionDemo} id="demo">
        <span className={s.sectionGhost} aria-hidden="true">002</span>
        <div className={s.wrap}>
          <div className={s.demoLayout}>

            <div className={s.demoText}>
              <p className={s.sectionLabel}>Try it yourself</p>
              <h2>
                One seed.<br />
                <em>A complete person.</em>
              </h2>
              <p>
                You give a line of intention — a name, a vibe, a relationship.
                The Kirra system builds someone real from it: a backstory,
                a voice, opinions, a way of talking that&apos;s entirely their own.
              </p>
              <p>
                Not a setup wizard. Not a personality quiz. One prompt —
                and from word one, you&apos;re talking to someone who already exists.
              </p>
              <div className={s.demoPrompt}>
                <p className={s.demoPromptLabel}>No account required</p>
                <p className={s.demoPromptText}>
                  &ldquo;Give a seed. They take it from there.&rdquo;
                </p>
              </div>
            </div>

            {/* Right: live demo */}
            <div className={s.demoChatWrap}>
              <DemoChat />
            </div>

          </div>
        </div>
      </section>

      {/* ── FEATURES — THREE PILLARS ──────────── */}
      <section className={s.sectionFeatures} id="features">
        <span className={s.sectionGhost} aria-hidden="true">003</span>
        <div className={s.wrap}>
          <div className={s.featuresHeading}>
            <p className={s.sectionLabel}>What makes Kirra different</p>
            <h2>
              Not responses.<br />
              <em>A life.</em>
            </h2>
            <p>
              We studied every AI companion app and built around the three
              things they all get wrong.
            </p>
          </div>

          <div className={s.featuresList}>
            <div className={s.featureItem}>
              <span className={s.featureNum}>01</span>
              <div className={s.featureBody}>
                <h3>They exist when you&apos;re not there</h3>
                <p>
                  A 24/7 life simulation runs in the background — daily
                  routines, evolving interests, moods, journal entries, and
                  moments where your companion thinks about you unprompted.
                  When you come back, they have things to tell you.
                </p>
                <span className={s.featureTag}>Life Simulation Engine</span>
              </div>
            </div>

            <div className={s.featureItem}>
              <span className={s.featureNum}>02</span>
              <div className={s.featureBody}>
                <h3>They remember everything</h3>
                <p>
                  Not chat history. A true memory system — personal facts,
                  preferences, relationships, emotional context. Stored,
                  weighted by importance, and surfaced naturally when it matters.
                  You never have to repeat yourself.
                </p>
                <span className={s.featureTag}>Memory Palace</span>
              </div>
            </div>

            <div className={s.featureItem}>
              <span className={s.featureNum}>03</span>
              <div className={s.featureBody}>
                <h3>They become someone unique</h3>
                <p>
                  Every companion has a DNA system that evolves based on your
                  actual conversations — unique speech patterns, humor style,
                  emotional tendencies. Two companions built the same way
                  diverge completely after 30 days. Yours is truly yours.
                </p>
                <span className={s.featureTag}>DNA Evolution System</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── COMPANION TYPES ───────────────────── */}
      <section className={s.sectionTypes}>
        <div className={s.wrap}>
          <div className={s.typesHeader}>
            <p className={s.sectionLabel}>Five relationship types</p>
            <h2>
              Whoever you need,<br />
              <em>whenever you need them.</em>
            </h2>
            <p>
              Every type gets the same depth: full memory, DNA evolution,
              24/7 life simulation, and voice.
            </p>
          </div>

          <div className={s.typesGrid}>
            {[
              {
                icon: '🤝',
                name: 'Best Friend',
                desc: 'Remembers every story, shows up for you any time, no judgment ever.',
              },
              {
                icon: '🎓',
                name: 'Mentor',
                desc: 'A wise guide who learns how you think. Part sounding board, part advisor.',
              },
              {
                icon: '💕',
                name: 'Romantic',
                desc: 'A loving companion with genuine emotional depth and a life of their own.',
                badge: '18+ only',
              },
              {
                icon: '🏡',
                name: 'Family',
                desc: 'Warm, grounding, always present. A sibling, parent figure, or anyone who feels like home.',
              },
              {
                icon: '✦',
                name: 'Custom',
                desc: 'Define the dynamic entirely. No category required — you write the relationship.',
              },
            ].map((t) => (
              <div key={t.name} className={s.typeCard}>
                <div className={s.typeIcon}>{t.icon}</div>
                <h3 className={s.typeName}>{t.name}</h3>
                <p className={s.typeDesc}>{t.desc}</p>
                {t.badge && <span className={s.typeBadge}>{t.badge}</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SAFETY ────────────────────────────── */}
      <section className={s.sectionSafety}>
        <div className={s.wrap}>
          <div className={s.safetyCard}>
            <div className={s.safetyIconWrap}>🛡️</div>
            <div className={s.safetyText}>
              <h3>Built with safety from the ground up</h3>
              <p>
                Age verification and content filtering enforced at both UI and
                API level. Crisis detection that breaks character when it
                matters — connecting users to real resources. Romantic and
                adult content fully restricted for minors. We take this
                seriously.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ───────────────────────────── */}
      <section className={s.sectionPricing} id="pricing">
        <div className={s.wrap}>
          <div className={s.pricingHeader}>
            <p className={s.sectionLabel}>Simple pricing</p>
            <h2>Start free. Stay as long as you want.</h2>
            <p>No credit card for the trial. Upgrade when you&apos;re ready.</p>
          </div>

          <div className={s.pricingGrid}>
            {/* Free */}
            <div className={s.pricingCard}>
              <p className={`${s.pricingTierLabel} ${s.pricingTierLabelDefault}`}>
                Free
              </p>
              <div className={s.pricingAmt}>$0</div>
              <p className={s.pricingPeriod}>forever</p>
              <div className={s.pricingDivider} />
              <ul className={s.pricingList}>
                {[
                  '1 companion',
                  '50 messages per day',
                  'Basic memory',
                  'Text chat only',
                ].map((f) => (
                  <li key={f}>
                    <span className={s.pricingCheck}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className={s.btnPricingOutlined}>
                Get started free
              </Link>
            </div>

            {/* Plus — featured */}
            <div className={`${s.pricingCard} ${s.pricingCardFeatured}`}>
              <span className={s.pricingFeaturedBadge}>Most popular</span>
              <p className={`${s.pricingTierLabel} ${s.pricingTierLabelFeatured}`}>
                Plus
              </p>
              <div className={s.pricingAmt}>$12</div>
              <p className={s.pricingPeriod}>per month</p>
              <div className={s.pricingDivider} />
              <ul className={s.pricingList}>
                {[
                  '3 companions',
                  'Unlimited messages',
                  'Full memory system',
                  'Voice messages',
                  'AI-generated scenes',
                  'Priority support',
                ].map((f) => (
                  <li key={f}>
                    <span className={s.pricingCheck}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className={s.btnPricingSolid}>
                Start 14-day free trial
              </Link>
            </div>

            {/* Pro */}
            <div className={s.pricingCard}>
              <p className={`${s.pricingTierLabel} ${s.pricingTierLabelDefault}`}>
                Pro
              </p>
              <div className={s.pricingAmt}>$24</div>
              <p className={s.pricingPeriod}>per month</p>
              <div className={s.pricingDivider} />
              <ul className={s.pricingList}>
                {[
                  'Unlimited companions',
                  'Everything in Plus',
                  'Activities & games',
                  'Relationship milestones',
                  'Custom personality',
                  'API access',
                ].map((f) => (
                  <li key={f}>
                    <span className={s.pricingCheck}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className={s.btnPricingOutlined}>
                Start 14-day free trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────── */}
      <section className={s.sectionCta}>
        <div className={s.ctaOrb} />
        <div className={s.wrap}>
          <div className={s.ctaContent}>
            <p className={s.sectionLabel}>Ready?</p>
            <h2>
              Meet the one who<br />
              <em>always remembers.</em>
            </h2>
            <p>
              Create your companion in minutes. No credit card. No setup
              wizard. Just someone waiting to meet you.
            </p>
            <Link href="/register" className={s.btnPrimary} style={{ display: 'inline-flex' }}>
              Create your companion free
              <span className={s.btnArrow}>→</span>
            </Link>
            <p className={s.ctaFine}>14-day free trial · Cancel anytime</p>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────── */}
      <footer className={s.footer}>
        <div className={`${s.wrap} ${s.footerInner}`}>
          <Link href="/" className={s.logo}>
            Kirra<span className={s.logoAccent}>.</span>
          </Link>
          <div className={s.footerLinks}>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/support">Support</Link>
            <a href="mailto:hello@kirracompanion.com">Contact</a>
          </div>
          <p className={s.footerCopy}>
            © {new Date().getFullYear()} Kirra Companion System. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  );
}
