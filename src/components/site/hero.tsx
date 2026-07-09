'use client'

import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { BRAND } from '@/lib/images'
import { AIStackStrip } from '@/components/site/powered-by'

const toc = [
  { n: '01', name: 'ListingLab', desc: 'Amazon A+ and listing images' },
  { n: '02', name: 'AngleLab', desc: 'Ad creative discovery' },
  { n: '03', name: 'PhotoLab', desc: 'AI product photography' },
  { n: '04', name: 'VideoLab', desc: 'UGC video ads at scale' },
]

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      <div className="relative mx-auto max-w-[1280px] px-6 lg:px-10">
        {/* Masthead */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-between py-6 hairline-b"
        >
          <span className="label-mono">Issue 04 · Creative Operating System</span>
          <span className="label-mono hidden sm:block">For Amazon · D2C · Agencies</span>
          <span className="label-mono">{BRAND.year}</span>
        </motion.div>

        {/* Hero grid */}
        <div className="grid gap-12 py-16 lg:grid-cols-[1.5fr_1fr] lg:gap-20 lg:py-24">
          {/* Left - headline */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/60 px-3.5 py-1.5 backdrop-blur"
            >
              <span className="bg-brand-gradient bg-clip-text text-transparent text-sm font-semibold">
                Set it and forget it
              </span>
              <span className="text-muted-foreground/40">·</span>
              <span className="text-sm text-muted-foreground">human on the loop</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-[44px] font-light leading-[1.02] tracking-tight text-foreground sm:text-[64px] lg:text-[84px]"
            >
              Automate your
              <br />
              whole store.
              <br />
              Then{' '}
              <span className="font-display-italic text-gradient">let it sell.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="mt-8 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg"
            >
              {BRAND.name} automates your entire e-commerce creative: listings, ads,
              photos, and video generated, optimized, and ready to promote by a team of
              AI agents. Paste one product link, walk away, come back to a launched
              campaign. You stay on the loop, never stuck in it.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center"
            >
              <a
                href="/login"
                className="btn-gradient group inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold"
              >
                Start free
                <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </a>
              <a
                href="/features"
                className="group inline-flex items-center gap-1.5 text-sm font-medium text-foreground link-underline"
              >
                Tour the workspace
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="mt-4 label-mono"
            >
              7 days completely free · No credit card · Cancel anytime
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-6"
            >
              <AIStackStrip />
            </motion.div>
          </div>

          {/* Right - glass TOC card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="glass rounded-2xl p-8"
          >
            <div className="label-mono mb-6">In this issue</div>
            <ol className="space-y-0">
              {toc.map((item) => (
                <li key={item.n}>
                  <a
                    href="#studio"
                    className="group flex items-baseline gap-4 py-4 border-b border-border/60 transition-colors hover:bg-white/40 -mx-4 px-4 rounded-md"
                  >
                    <span className="label-mono w-8 shrink-0">{item.n}</span>
                    <div className="flex-1">
                      <div className="font-display text-xl font-medium tracking-tight text-foreground transition-transform group-hover:translate-x-1">
                        {item.name}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {item.desc}
                      </div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </a>
                </li>
              ))}
            </ol>

            <div className="mt-8 grid grid-cols-2 gap-3">
              {[
                { v: '+47%', l: 'Avg ROAS lift' },
                { v: '8 hrs', l: 'Saved per listing' },
                { v: '1,200+', l: 'Brands and agencies' },
                { v: '4 labs', l: 'One platform' },
              ].map((s) => (
                <div key={s.l} className="rounded-xl bg-white/50 border border-white/60 p-4 transition-transform hover:-translate-y-0.5">
                  <div className="font-display text-2xl font-semibold tracking-tight tabular text-gradient">
                    {s.v}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{s.l}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
