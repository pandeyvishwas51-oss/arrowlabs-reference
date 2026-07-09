'use client'

import { motion } from 'framer-motion'

const rows = [
  { feature: 'Built for Amazon performance', us: true, them: false },
  { feature: 'Multi-platform ad creative (Meta, TikTok, Google)', us: true, them: false },
  { feature: 'AI product photography and backgrounds', us: true, them: false },
  { feature: 'UGC-style video ads with AI avatars', us: true, them: false },
  { feature: 'Agentic workflow (six specialized agents)', us: true, them: false },
  { feature: 'Trained on winning category frameworks', us: true, them: 'partial' },
  { feature: 'Brand brain (persistent memory)', us: true, them: false },
  { feature: 'Built-in A/B testing and SERP simulation', us: true, them: false },
  { feature: 'Direct push to Seller Central', us: true, them: 'partial' },
  { feature: 'Agency-tier team workspaces', us: true, them: false },
]

export function Comparison() {
  return (
    <section id="compare" className="py-20 lg:py-32 bg-muted/30 hairline-t hairline-b">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="grid gap-8 pb-12 lg:grid-cols-[1fr_2fr] lg:gap-16">
          <div>
            <div className="label-mono">§ 05 · The Difference</div>
          </div>
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="font-display text-4xl font-light leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
            >
              Tools do one thing.
              <br />
              <span className="font-display-italic text-gradient">Studios do everything.</span>
            </motion.h2>
            <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              Other platforms solve one slice. ArrowLabs is the only platform that
              combines listing optimization, ad creative, product photography, and
              video ads into one brain.
            </p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="grid grid-cols-[1.6fr_1fr_1fr] items-end gap-4 py-4 hairline-b">
            <div className="label-mono">Capability</div>
            <div className="text-center">
              <div className="font-display text-xl font-medium tracking-tight">
                ArrowLabs
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Typical AI tools</div>
            </div>
          </div>

          {rows.map((row, i) => (
            <div
              key={row.feature}
              className="grid grid-cols-[1.6fr_1fr_1fr] items-center gap-4 py-4 hairline-b transition-colors hover:bg-muted/30"
            >
              <div className="text-sm text-foreground/90">{row.feature}</div>
              <div className="text-center">
                <span className="font-display text-xl font-medium text-accent">✓</span>
              </div>
              <div className="text-center text-sm text-muted-foreground">
                {row.them === true && <span>✓</span>}
                {row.them === 'partial' && <span className="italic">Partial</span>}
                {row.them === false && <span className="text-muted-foreground/50">-</span>}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
