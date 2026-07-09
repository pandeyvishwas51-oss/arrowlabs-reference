'use client'

import { motion } from 'framer-motion'

const useCases = [
  {
    title: 'Amazon sellers',
    body: 'Generate A+ content, main images, infographics, and variants from any ASIN. Push to Seller Central in one click.',
    metric: '+27% conversion',
  },
  {
    title: 'D2C and Shopify brands',
    body: 'Spin up product photography, PDP visuals, and ad creative from a single packshot. No studio, no photographer.',
    metric: '90% cheaper',
  },
  {
    title: 'Performance marketing',
    body: 'Discover ranked angles, generate static and video ads, and A/B test at scale. Kill creative fatigue before it kills ROAS.',
    metric: '+47% ROAS',
  },
  {
    title: 'Agencies',
    body: 'White-label the platform, manage every client in one workspace, and ship campaigns in 30 minutes that used to take a week.',
    metric: '20 seats',
  },
]

export function UseCases() {
  return (
    <section id="use-cases" className="py-20 lg:py-32">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="grid gap-8 pb-12 hairline-b lg:grid-cols-[1fr_2fr] lg:gap-16">
          <div>
            <div className="label-mono">§ 06 · Who it is for</div>
          </div>
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="font-display text-4xl font-light leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
            >
              Built for every
              <br />
              <span className="font-display-italic text-gradient">kind of seller.</span>
            </motion.h2>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {useCases.map((uc, i) => (
            <motion.div
              key={uc.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="glass rounded-2xl p-8"
            >
              <div className="label-mono">0{i + 1}</div>
              <h3 className="mt-4 font-display text-xl font-medium tracking-tight">
                {uc.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {uc.body}
              </p>
              <div className="mt-6 hairline-t pt-3">
                <span className="font-display text-2xl font-medium tracking-tight text-accent">
                  {uc.metric}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
