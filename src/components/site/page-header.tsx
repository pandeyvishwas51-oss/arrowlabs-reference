'use client'

import { motion } from 'framer-motion'

export function PageHeader({
  eyebrow,
  title,
  accent,
  description,
}: {
  eyebrow: string
  title: string
  accent?: string
  description?: string
}) {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[380px] w-[760px] -translate-x-1/2 rounded-full bg-brand-gradient opacity-[0.10] blur-[110px]" />
      <div className="relative mx-auto max-w-[1280px] px-6 pb-8 pt-16 lg:px-10 lg:pb-12 lg:pt-24">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl"
        >
          <span className="label-mono text-accent">{eyebrow}</span>
          <h1 className="mt-4 font-display text-[40px] font-light leading-[1.03] tracking-tight sm:text-[56px] lg:text-[68px]">
            {title}
            {accent && (
              <>
                {' '}
                <span className="font-display-italic text-gradient">{accent}</span>
              </>
            )}
          </h1>
          {description && (
            <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              {description}
            </p>
          )}
        </motion.div>
      </div>
    </section>
  )
}
