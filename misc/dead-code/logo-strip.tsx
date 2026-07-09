'use client'

import { motion } from 'framer-motion'

const brands = [
  'Beacon Commerce',
  'Krampade',
  'Luke & Lulu',
  'Behoma',
  'Home Crayon',
  'Amara Earth',
  'Chumbak',
  'CloudStep',
]

export function LogoStrip() {
  return (
    <section className="border-y border-border/40 bg-background/40 py-8">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6">
        <p className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Trusted by 1,200+ brands, agencies & D2C teams
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 sm:gap-x-12">
          {brands.map((b, i) => (
            <motion.span
              key={b}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              className="text-sm font-medium text-muted-foreground/70 transition-colors hover:text-foreground sm:text-base"
            >
              {b}
            </motion.span>
          ))}
        </div>
      </div>
    </section>
  )
}
