'use client'

import { motion } from 'framer-motion'

const steps = [
  {
    n: '01',
    title: 'Input your product',
    body: 'Drop in an ASIN, paste a listing URL, or upload a packshot. ArrowLabs extracts product attributes, audience context, and category benchmarks automatically, no manual tagging, no briefs.',
    detail: 'Amazon · Shopify · WooCommerce · Etsy · Flipkart · direct upload',
    duration: '~10 sec',
  },
  {
    n: '02',
    title: 'AI discovers winning angles',
    body: 'The engine pulls from seven signal sources: brand intel, product data, performance, sentiment, market, creative intel, and competition. Angles are ranked by predicted conversion, not guesswork.',
    detail: '12 to 18 ranked angles per product, mapped to your ICP in under 60 seconds',
    duration: '~50 sec',
  },
  {
    n: '03',
    title: 'Get campaign-ready creatives',
    body: 'Listing images, A+ modules, ad statics, carousels, and UGC video, sized for every platform you sell on. Push to Seller Central, Meta, TikTok, or your CDN in one click.',
    detail: 'Built-in A/B testing means winners compound and losers get killed fast',
    duration: '~30 sec',
  },
]

export function Process() {
  return (
    <section id="process" className="relative py-20 lg:py-32">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="grid gap-8 pb-12 lg:grid-cols-[1fr_2fr] lg:gap-16">
          <div>
            <div className="label-mono">§ 03 · The Process</div>
          </div>
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="font-display text-4xl font-light leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
            >
              From product link to
              <br />
              <span className="font-display-italic text-gradient">campaign-ready</span>{' '}
              in 90 seconds.
            </motion.h2>
          </div>
        </div>

        <div className="lg:pl-[33.333%]">
          <ol className="relative">
            <div className="absolute left-0 top-0 h-full w-px bg-border lg:left-[120px]" />

            {steps.map((step, i) => (
              <motion.li
                key={step.n}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative grid gap-6 pb-16 pl-8 last:pb-0 lg:grid-cols-[120px_1fr] lg:gap-12 lg:pl-0"
              >
                <div className="relative">
                  <span className="absolute -left-[33px] top-2 h-2 w-2 rounded-full bg-accent lg:-left-[5px]" />
                  <div className="font-display text-5xl font-light tracking-tight text-accent tabular">
                    {step.n}
                  </div>
                  <div className="label-mono mt-2">{step.duration}</div>
                </div>

                <div>
                  <h3 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">
                    {step.title}
                  </h3>
                  <p className="mt-3 max-w-2xl text-pretty leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                  <p className="mt-4 text-sm italic text-foreground/70">
                    {step.detail}
                  </p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
