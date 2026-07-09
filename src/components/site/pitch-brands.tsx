'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { PITCH_BRANDS } from '@/lib/showcase'

// Graceful media tile: shows a soft gradient placeholder until the asset loads,
// and hides broken sources entirely (assets generate asynchronously).
function Media({ img, hover, video }: { img: string; hover?: string; video?: string }) {
  const [loaded, setLoaded] = useState(false)
  const [broken, setBroken] = useState(false)
  const [hovering, setHovering] = useState(false)

  return (
    <div
      className="relative aspect-square overflow-hidden bg-gradient-to-br from-black/[0.04] to-accent/[0.06]"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {!loaded && !broken && <div className="absolute inset-0 animate-pulse bg-black/[0.03]" />}
      {video && hovering ? (
        <video src={video} autoPlay muted loop playsInline className="h-full w-full object-cover" />
      ) : (
        !broken && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hovering && hover ? hover : img}
            alt=""
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => setBroken(true)}
            className={`h-full w-full object-cover transition-all duration-500 ${loaded ? 'opacity-100' : 'opacity-0'} ${hovering ? 'scale-105' : ''}`}
          />
        )
      )}
    </div>
  )
}

export function PitchBrands() {
  return (
    <section id="brands" className="relative overflow-hidden py-24 lg:py-32">
      <div className="pointer-events-none absolute right-1/4 top-10 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
      <div className="relative mx-auto max-w-[1280px] px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl"
        >
          <span className="label-mono text-accent">Built for rising D2C</span>
          <h2 className="mt-4 font-display text-[38px] font-medium leading-[1.05] tracking-tight sm:text-[52px]">
            A full creative kit for the brands{' '}
            <span className="font-display-italic text-gradient">defining the next decade.</span>
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">
            Baby wear to skincare to plant-based food, one product link becomes listings, A+ content,
            ad creative, and UGC video. Here is a taste across fast-growing categories.
          </p>
        </motion.div>

        <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {PITCH_BRANDS.map((b, i) => (
            <motion.article
              key={b.key}
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.55, delay: (i % 4) * 0.08, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -6 }}
              className="group overflow-hidden rounded-2xl border border-border/60 bg-white/60 shadow-[0_16px_36px_-22px_rgba(0,0,0,0.35)] backdrop-blur"
            >
              <Media img={b.hero} hover={b.life} video={b.video} />
              <div className="flex items-center justify-between px-3.5 py-3">
                <div>
                  <div className="text-sm font-semibold">{b.name}</div>
                  <div className="label-mono text-[10px] text-muted-foreground">{b.category}</div>
                </div>
                {b.video && <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[9px] font-medium text-accent">+ video</span>}
              </div>
            </motion.article>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center"
        >
          <a href="/login" className="group inline-flex items-center gap-2 rounded-full btn-gradient px-7 py-3.5 text-sm font-semibold">
            Build your brand kit
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </a>
          <span className="text-sm text-muted-foreground">Every asset above was AI-generated.</span>
        </motion.div>
      </div>
    </section>
  )
}
