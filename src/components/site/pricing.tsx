'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

type Cycle = 'monthly' | 'yearly'

const tiers = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'For solo sellers testing the waters.',
    monthly: 0,
    yearly: 0,
    cta: 'Start free',
    features: [
      '1 creative campaign / month',
      '25 image generations / month',
      '5 competitors per campaign',
      '200 reviews analyzed / campaign',
      '5 GB cloud storage',
      'Core templates',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For brands shipping every week.',
    monthly: 89,
    yearly: 81,
    cta: 'Start 7-day free trial',
    features: [
      '10 creative campaigns / month',
      '400 image generations / month',
      '10 competitors per campaign',
      '1,000 reviews analyzed / campaign',
      'Premium A+ content and variations',
      'UGC video ads (VideoLab)',
      'Built-in A/B testing',
      '30 GB storage · 5 team seats',
      'Priority rendering',
    ],
  },
  {
    id: 'agency',
    name: 'Agency',
    description: 'For agencies and high-volume teams.',
    monthly: 449,
    yearly: 414,
    cta: 'Talk to sales',
    features: [
      '50 creative campaigns / month',
      '3,000 image generations / month',
      '20 competitors per campaign',
      '2,000 reviews analyzed / campaign',
      'Everything in Pro, plus:',
      '100 GB storage · 20 seats',
      'White-label client workspaces',
      'Custom brand brains per client',
      'Dedicated account manager',
    ],
  },
]

export function Pricing() {
  const [cycle, setCycle] = useState<Cycle>('yearly')

  return (
    <section id="pricing" className="py-20 lg:py-32">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="grid gap-8 pb-12 hairline-b lg:grid-cols-[1fr_2fr] lg:gap-16">
          <div>
            <div className="label-mono">§ 09 · Pricing</div>
          </div>
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="font-display text-4xl font-light leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
            >
              Pricing that scales with
              <br />
              <span className="font-display-italic text-gradient">your catalog.</span>
            </motion.h2>

            <div className="mt-8 flex items-center gap-4">
              <div className="inline-flex items-center rounded-full border border-border bg-secondary/60 p-1">
                <button
                  onClick={() => setCycle('yearly')}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                    cycle === 'yearly' ? 'btn-gradient' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Yearly
                </button>
                <button
                  onClick={() => setCycle('monthly')}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                    cycle === 'monthly' ? 'btn-gradient' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Monthly
                </button>
              </div>
              <span className="rounded-full bg-brand-gradient px-3 py-1 text-[11px] font-semibold text-white">Save 2 months</span>
            </div>
          </div>
        </div>

        <div className="mt-16 grid items-start gap-5 lg:grid-cols-3">
          {tiers.map((tier, i) => {
            const price = cycle === 'monthly' ? tier.monthly : tier.yearly
            const isPro = i === 1
            const isAgency = i === 2

            // Per-tier surface + text theming
            const shell = isPro
              ? 'bg-brand-gradient text-white card-glow lg:-translate-y-4 lg:scale-[1.03]'
              : isAgency
                ? 'surface-agency text-white'
                : 'surface-violet ring-gradient text-foreground'

            const sub = isPro || isAgency ? 'text-white/70' : 'text-muted-foreground'
            const priceSub = isPro || isAgency ? 'text-white/60' : 'text-muted-foreground'
            const dot = isPro ? 'bg-white' : isAgency ? 'bg-brand-gradient' : 'bg-brand-gradient'
            const featText = isPro || isAgency ? 'text-white/90' : 'text-foreground/90'
            const rule = isPro || isAgency ? 'border-white/15' : 'border-black/10'

            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className={`relative flex flex-col rounded-[24px] p-8 ${shell}`}
              >
                {isPro && (
                  <span className="absolute -top-3 left-8 rounded-full bg-white px-3 py-1 text-[11px] font-semibold tracking-wide text-[color:var(--grad-2)] shadow-lg">
                    MOST POPULAR
                  </span>
                )}

                <div className="flex items-center justify-between">
                  <h3 className="font-display text-2xl font-semibold tracking-tight">{tier.name}</h3>
                  <span className={`label-mono ${isPro || isAgency ? 'text-white/50' : ''}`}>0{i + 1}</span>
                </div>
                <p className={`mt-2 text-sm ${sub}`}>{tier.description}</p>

                <div className="mt-7 flex items-baseline gap-1.5">
                  <span className="font-display text-6xl font-semibold tracking-tight tabular">$0</span>
                  <span className={`text-sm ${priceSub}`}>for 7 days</span>
                </div>
                <div className={`mt-1.5 label-mono ${isPro || isAgency ? 'text-white/55' : ''}`}>
                  {price === 0
                    ? 'then free forever'
                    : cycle === 'yearly'
                      ? `then $${price}/mo · billed annually`
                      : `then $${price}/mo · billed monthly`}
                </div>

                <div
                  className={`mt-4 inline-flex items-center gap-2 self-start rounded-full px-3 py-1 text-[11px] font-semibold ${
                    isPro
                      ? 'bg-white/20 text-white'
                      : isAgency
                        ? 'bg-white/15 text-white'
                        : 'bg-brand-gradient text-white'
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  7 days free · no card required
                </div>

                <a
                  href={isAgency ? '#cta' : '/login'}
                  className={`mt-8 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-semibold transition-all ${
                    isPro
                      ? 'bg-white text-[color:var(--grad-2)] hover:bg-white/92 hover:-translate-y-0.5 shadow-lg'
                      : isAgency
                        ? 'btn-gradient'
                        : 'btn-gradient'
                  }`}
                >
                  {tier.cta}
                  <span>→</span>
                </a>

                <ul className={`mt-8 space-y-3 border-t pt-6 ${rule}`}>
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm">
                      <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
                      <span className={featText}>{f}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )
          })}
        </div>

        <div className="relative mt-14 flex flex-col items-start justify-between gap-6 overflow-hidden rounded-[24px] bg-brand-gradient p-9 text-white sm:flex-row sm:items-center">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/15 blur-3xl" />
          <div className="relative">
            <div className="label-mono text-white/60">Enterprise</div>
            <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight">
              Need custom pricing?
            </h3>
            <p className="mt-1 max-w-xl text-sm text-white/80">
              Tailored solutions for high-volume platforms, marketplaces, and large
              organizations. Custom models, dedicated resources, SSO, and 24/7 support.
            </p>
          </div>
          <a
            href="#cta"
            className="relative shrink-0 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-[color:var(--grad-2)] shadow-lg transition-all hover:-translate-y-0.5"
          >
            Contact sales
            <span>→</span>
          </a>
        </div>
      </div>
    </section>
  )
}
