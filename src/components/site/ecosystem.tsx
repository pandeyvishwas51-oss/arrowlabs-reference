'use client'

import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { ECOSYSTEM, COMPANY } from '@/lib/brand'

export function Ecosystem() {
  return (
    <section id="about" className="relative overflow-hidden py-24 lg:py-32">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="label-mono text-accent">The {COMPANY.parent} ecosystem</span>
            <h2 className="mt-4 font-display text-[34px] font-medium leading-[1.05] tracking-tight sm:text-[46px]">
              One company.{' '}
              <span className="font-display-italic text-gradient">The full commerce stack.</span>
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              {COMPANY.parent} is an applied-AI company for modern commerce. We build the tools that
              take a brand from a single product link to a fully optimized, high-ranking, high-converting
              storefront: creative on one side, revenue intelligence on the other, one system end to end.
            </p>
            <a
              href={COMPANY.parentUrl}
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-foreground link-underline"
            >
              About {COMPANY.parent}
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </motion.div>

          <div className="space-y-4">
            {ECOSYSTEM.map((p, i) => (
              <motion.a
                key={p.name}
                href={p.url}
                target={p.url.startsWith('http') ? '_blank' : undefined}
                rel={p.url.startsWith('http') ? 'noopener' : undefined}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -3 }}
                className={`group block rounded-2xl border p-6 transition-all ${
                  p.current
                    ? 'border-accent/40 bg-accent/[0.04]'
                    : 'border-border/60 bg-white/50 hover:border-accent/30 hover:shadow-[0_20px_50px_-30px_rgba(0,0,0,0.35)]'
                } backdrop-blur`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-xl font-semibold tracking-tight">{p.name}</h3>
                      {p.current && (
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">This product</span>
                      )}
                    </div>
                    <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">{p.blurb}</p>
                  </div>
                  <ArrowUpRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
                </div>
                <span className="mt-4 inline-block text-sm font-medium text-accent">{p.cta}</span>
              </motion.a>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
