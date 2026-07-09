'use client'

import { motion } from 'framer-motion'
import { TiltCard } from '@/components/site/tilt-card'

const MODULES = [
  { src: '/marketing/aplus/aplus-hero.png', label: 'Brand hero banner' },
  { src: '/marketing/aplus/aplus-features.png', label: 'Feature callouts' },
  { src: '/marketing/aplus/aplus-comparison.png', label: 'Comparison module' },
  { src: '/marketing/aplus/aplus-lifestyle.png', label: 'Lifestyle story' },
]

export function AplusShowcase() {
  return (
    <section id="aplus" className="relative overflow-hidden py-24 lg:py-32">
      {/* ambient glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />

      <div className="relative mx-auto max-w-[1280px] px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl"
        >
          <span className="label-mono text-accent">A+ content & video, generated</span>
          <h2 className="mt-4 font-display text-[38px] font-medium leading-[1.05] tracking-tight sm:text-[52px]">
            A+ modules and UGC video that{' '}
            <span className="font-display-italic text-gradient">make people buy.</span>
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">
            Full A+ content, brand banners, comparison modules, and scroll-stopping video, all generated
            from one product link. This is the actual output your store ships from day one.
          </p>
        </motion.div>

        <div className="mt-14 grid items-start gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Video hero */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <TiltCard className="relative overflow-hidden rounded-3xl border border-border/60 shadow-[0_40px_100px_-50px_rgba(0,0,0,0.4)]" max={6}>
              <video
                src="/marketing/landing-hero.mp4"
                poster="/marketing/aplus/aplus-hero.png"
                autoPlay muted loop playsInline
                className="aspect-video w-full object-cover"
              />
              <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 backdrop-blur">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                <span className="label-mono text-[10px] text-white">ThreeArrow AI · generated</span>
              </div>
            </TiltCard>
          </motion.div>

          {/* A+ module stack */}
          <div className="grid grid-cols-2 gap-4">
            {MODULES.map((m, i) => (
              <motion.figure
                key={m.label}
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -5 }}
                className="group relative overflow-hidden rounded-2xl border border-border/60 bg-muted shadow-[0_16px_36px_-20px_rgba(0,0,0,0.35)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.src} alt={m.label} loading="lazy" className="aspect-[3/2] w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                  <span className="text-xs font-medium text-white">{m.label}</span>
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center"
        >
          <a href="/login" className="group inline-flex items-center gap-2 rounded-full btn-gradient px-7 py-3.5 text-sm font-semibold">
            Generate your A+ content
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </a>
          <span className="text-sm text-muted-foreground">7 days completely free · company email</span>
        </motion.div>
      </div>
    </section>
  )
}
