'use client'

import { motion } from 'framer-motion'
import { COMPANY } from '@/lib/brand'

// Capability chips - the brand promise, not the underlying vendors.
const STACK = [
  { label: 'Reasoning', role: 'strategy + copy', primary: true },
  { label: 'Imagery', role: 'product + lifestyle' },
  { label: 'Video', role: 'UGC + ads' },
]

export function PoweredByOpus({ className = '' }: { className?: string }) {
  return (
    <a
      href={COMPANY.parentUrl}
      className={`inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/60 px-3 py-1.5 backdrop-blur transition hover:border-accent/40 ${className}`}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
      </span>
      <span className="text-xs text-muted-foreground">
        Powered by <span className="font-medium text-foreground">{COMPANY.parent}</span>
      </span>
    </a>
  )
}

export function AIStackStrip({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="label-mono text-[10px] uppercase text-muted-foreground">{COMPANY.poweredBy}</span>
      {STACK.map((s, i) => (
        <motion.span
          key={s.label}
          initial={{ opacity: 0, y: 6 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.08, duration: 0.4 }}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
            s.primary ? 'border-accent/40 bg-accent/5 text-foreground' : 'border-border/60 bg-white/50 text-muted-foreground'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${s.primary ? 'bg-accent' : 'bg-muted-foreground/50'}`} />
          {s.label}
          <span className="opacity-50">· {s.role}</span>
        </motion.span>
      ))}
    </div>
  )
}
