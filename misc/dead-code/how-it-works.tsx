'use client'

import { motion } from 'framer-motion'
import { LinkIcon, BrainCircuit, Rocket } from 'lucide-react'

const steps = [
  {
    n: '01',
    icon: LinkIcon,
    title: 'Input your product',
    description:
      'Drop in an ASIN, paste a listing URL, or upload a packshot. ArrowLabs extracts product attributes, audience context, and category benchmarks automatically - no manual tagging.',
    detail: 'Works with Amazon, Shopify, WooCommerce, Etsy, Flipkart, and direct uploads.',
  },
  {
    n: '02',
    icon: BrainCircuit,
    title: 'AI discovers winning angles',
    description:
      'The engine pulls from 7 signal sources - brand intel, product data, performance, sentiment, market, creative intel, and competition. Angles are ranked by predicted conversion, not guesswork.',
    detail: 'Average 12-18 ranked angles per product, mapped to your ICP in under 60 seconds.',
  },
  {
    n: '03',
    icon: Rocket,
    title: 'Get campaign-ready creatives',
    description:
      'Listing images, A+ modules, ad statics, carousels, and UGC video - sized for every platform you sell on. Push to Seller Central, Meta, TikTok, or your CDN in one click.',
    detail: 'Built-in A/B testing means winners compound and losers get killed fast.',
  },
]

export function HowItWorks() {
  return (
    <section id="how" className="relative py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 grid-bg radial-fade opacity-50" />
      <div className="container relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            How it works
          </span>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            From product link to campaign-ready{' '}
            <span className="gradient-text">in 3 steps</span>.
          </h2>
          <p className="mt-4 text-pretty text-base text-muted-foreground sm:text-lg">
            Same 3-step engine, whether you’re shipping one Amazon listing or 50 ad variants a week.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3 lg:gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.n}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="relative rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur sm:p-8"
            >
              <div className="flex items-center justify-between">
                <span className="text-4xl font-semibold tracking-tight text-muted-foreground/40">
                  {step.n}
                </span>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
                  <step.icon className="h-5 w-5" />
                </div>
              </div>
              <h3 className="mt-5 text-xl font-semibold tracking-tight">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
              <div className="mt-4 rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-xs text-muted-foreground">
                {step.detail}
              </div>
              {i < steps.length - 1 && (
                <div className="absolute -right-3 top-1/2 hidden h-px w-6 -translate-y-1/2 bg-gradient-to-r from-primary/40 to-transparent lg:block" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
