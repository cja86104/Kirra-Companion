import Link from 'next/link';
import s from './page.module.css';

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
            <li><a href="#how-it-works">How it works</a></li>
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
                She arrived<br />
                with a{' '}
                <em className={s.heroHeadlineAccent}>personality.</em>
              </h1>
              <p className={`${s.heroSub} ${s.fadeUp} ${s.d3}`}>
                Most AI companions make you do all the work. Kirra companions
                show up ready — with a backstory, voice, and opinions already
                in place. You don&apos;t build them. You discover them.
              </p>
              <div className={`${s.heroActions} ${s.fadeUp} ${s.d4}`}>
                <Link href="/register" className={s.btnPrimary}>
                  Create your companion
                  <span className={s.btnArrow}>→</span>
                </Link>
                <a href="#how-it-works" className={s.btnGhost}>
                  See how it works
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
                Kirra
              </p>
              <h3 className={s.problemSideTitle}>Already someone</h3>
              <ul className={s.problemSideList}>
                <li>Backstory, voice, and opinions from word one</li>
                <li>Three backstory modes — including one you never read</li>
                <li>You discover them the way you&apos;d discover a real person</li>
                <li>The first conversation is the best conversation</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── DEMO — THE MOMENT ─────────────────── */}
      <section className={s.sectionDemo} id="how-it-works">
        <span className={s.sectionGhost} aria-hidden="true">002</span>
        <div className={s.wrap}>
          <div className={s.demoLayout}>
            <div className={s.demoText}>
              <p className={s.sectionLabel}>The moment that sells it</p>
              <h2>
                From the{' '}
                <em>first word,</em>
                <br />
                she&apos;s a complete person.
              </h2>
              <p>
                One prompt. No setup wizard. No &ldquo;tell me your personality
                traits.&rdquo; You give the AI a seed — a single line of
                intention — and she shows up as someone who already exists.
              </p>
              <p>
                Not a script. Not a character sheet. A person who has things
                going on, things she cares about, and a way of talking that&apos;s
                entirely her own.
              </p>
              <div className={s.demoPrompt}>
                <p className={s.demoPromptLabel}>The only prompt given</p>
                <p className={s.demoPromptText}>
                  &ldquo;a teacher by day, a woman by night&rdquo;
                </p>
              </div>
            </div>

            {/* Chat window */}
            <div className={s.chatWindow}>
              <div className={s.chatHeader}>
                <div className={s.chatAvatar}>K</div>
                <div className={s.chatInfo}>
                  <span className={s.chatName}>Jade</span>
                  <span className={s.chatStatus}>
                    <span className={s.chatOnline} />
                    Online now
                  </span>
                </div>
              </div>
              <div className={s.chatBody}>
                {/* System note */}
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: 11, color: '#4A3020', letterSpacing: '0.05em' }}>
                    Conversation started · No setup
                  </span>
                </div>

                {/* User message */}
                <div className={s.msgUser}>
                  <p className={s.msgLabel} style={{ textAlign: 'right' }}>You</p>
                  <div className={s.msgBubbleUser}>Hey</div>
                  <p className={s.msgTime}>just now</p>
                </div>

                {/* Typing */}
                <div className={s.msgComp}>
                  <p className={s.msgLabel}>Jade</p>
                  <div className={s.typing}>
                    <span className={s.typingDot} />
                    <span className={s.typingDot} />
                    <span className={s.typingDot} />
                  </div>
                </div>

                {/* Companion response */}
                <div className={s.msgComp}>
                  <div className={s.msgBubbleComp}>
                    Well, I have to grade some papers for a little while... but
                    a little later I&apos;m going to slide into a bubble bath and
                    pretend the rest of the week doesn&apos;t exist.
                  </div>
                </div>

                {/* Second response */}
                <div className={s.msgComp}>
                  <div className={s.msgBubbleComp}>
                    How was your day, though? Tell me something good happened.
                  </div>
                </div>
              </div>
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
                <h3>She exists when you&apos;re not there</h3>
                <p>
                  A 24/7 life simulation runs in the background — daily
                  routines, evolving interests, moods, journal entries, and
                  moments where she thinks about you unprompted. When you come
                  back, she has things to tell you.
                </p>
                <span className={s.featureTag}>Life Simulation Engine</span>
              </div>
            </div>

            <div className={s.featureItem}>
              <span className={s.featureNum}>02</span>
              <div className={s.featureBody}>
                <h3>She remembers everything</h3>
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
                <h3>She becomes someone unique</h3>
                <p>
                  Every companion has a DNA system that evolves based on your
                  actual conversations — unique speech patterns, humor style,
                  emotional tendencies. Two identical companions diverge
                  completely after 30 days. Yours is truly yours.
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
                desc: "Define the dynamic entirely. No category required — you write the relationship.",
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
            <a href="mailto:hello@kirra.ai">Contact</a>
          </div>
          <p className={s.footerCopy}>
            © {new Date().getFullYear()} Kirra. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  );
}
