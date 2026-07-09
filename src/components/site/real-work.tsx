'use client'

import { motion } from 'framer-motion'
import { CASE_STUDIES } from '@/lib/showcase'
import { TiltCard } from '@/components/site/tilt-card'

export function RealWork() {
  return (
    <section id="real-work" className="relative overflow-hidden py-24 lg:py-32">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl"
        >
          <span className="label-mono text-accent">Case studies · real D2C brands</span>
          <h2 className="mt-4 font-display text-[38px] font-medium leading-[1.05] tracking-tight sm:text-[52px]">
            Real storefronts,{' '}
            <span className="font-display-italic text-gradient">built on ArrowLabs.</span>
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">
            Entire catalogs - product photography, lifestyle, A+ content, and size guides - produced from
            one brand brief. No photographer, no reshoots, one coherent visual language across the store.
          </p>
        </motion.div>

        <div className="mt-16 space-y-24">
          {CASE_STUDIES.map((cs, idx) => (
            <div
              key={cs.brand}
              className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-14 ${idx % 2 ? 'lg:[direction:rtl]' : ''}`}
            >
              {/* Cover */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="lg:[direction:ltr]"
              >
                <TiltCard className="overflow-hidden rounded-3xl border border-border/60 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.3)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cs.cover} alt={cs.brand} className="aspect-[4/3] w-full object-cover" />
                </TiltCard>
              </motion.div>

              {/* Text + thumbnail grid */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="lg:[direction:ltr]"
              >
                <span className="label-mono text-xs text-muted-foreground">{cs.category}</span>
                <h3 className="mt-2 font-display text-3xl font-medium tracking-tight">{cs.brand}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{cs.blurb}</p>
                <div className="mt-6 grid grid-cols-3 gap-3">
                  {cs.gallery.slice(1, 7).map((src, i) => (
                    <motion.div
                      key={src}
                      initial={{ opacity: 0, scale: 0.95 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.06 }}
                      whileHover={{ y: -4 }}
                      className="overflow-hidden rounded-xl border border-border/50 bg-muted"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={`${cs.brand} ${i}`} loading="lazy" className="aspect-square w-full object-cover transition-transform duration-500 hover:scale-110" />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
