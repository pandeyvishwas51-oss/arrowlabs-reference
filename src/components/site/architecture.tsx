'use client'

import { motion } from 'framer-motion'
import { AgentFlow } from '@/components/site/agent-flow'

const signals = [
  'Brand intel',
  'Product data',
  'Performance',
  'Sentiment',
  'Market',
  'Creative intel',
  'Competition',
]

const outputs = [
  'Listing + A+ content',
  'Ranked ad angles',
  'Studio photography',
  'UGC video ads',
]

export function Architecture() {
  return (
    <section id="architecture" className="py-20 lg:py-32">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="grid gap-8 pb-12 hairline-b lg:grid-cols-[1fr_2fr] lg:gap-16">
          <div>
            <div className="label-mono">§ The Engine · agentic</div>
          </div>
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="font-display text-4xl font-light leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
            >
              Not a prompt.
              <br />
              <span className="font-display-italic text-gradient">A team of agents.</span>
            </motion.h2>
            <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              Paste one link and watch it run. Eight specialized agents plan, research,
              write, render, and review in parallel, orchestrated by an AI CMO and kept
              on-brand by a shared Brand Brain. This is the agentic era, working live.
            </p>
          </div>
        </div>

        {/* Live agentic control room */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mt-14"
        >
          <AgentFlow />
        </motion.div>

        {/* Inputs → outputs summary */}
        <div className="mt-12 grid gap-8 sm:grid-cols-2">
          <div>
            <div className="label-mono mb-3">Inputs · 7 signal sources</div>
            <div className="flex flex-wrap gap-2">
              {signals.map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-border/60 bg-white/60 px-3 py-1 text-sm text-foreground/80"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div>
            <div className="label-mono mb-3">Outputs · campaign-ready + on-brand</div>
            <div className="flex flex-wrap gap-2">
              {outputs.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-brand-gradient px-3 py-1 text-sm font-medium text-white"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
