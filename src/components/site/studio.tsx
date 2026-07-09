'use client'

import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'

export function Studio() {
  return (
    <section id="studio" className="relative py-20 lg:py-32">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="grid gap-8 hairline-b pb-12 lg:grid-cols-[1fr_2fr] lg:gap-16">
          <div>
            <div className="label-mono">§ 01 · The Studio</div>
            {/* Generated-asset collage - fills the column with real output */}
            <div className="mt-8 hidden lg:grid grid-cols-2 gap-3">
              {[
                '/pitch/minimalist-hero.png',
                '/marketing/premium/beauty-flatlay.png',
                '/marketing/premium/model-athleisure.png',
                '/pitch/thewholetruth-hero.png',
              ].map((src, i) => (
                <motion.div
                  key={src}
                  initial={{ opacity: 0, y: 20, scale: 0.96 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ y: -4 }}
                  className={`overflow-hidden rounded-xl border border-border/60 bg-muted shadow-[0_16px_36px_-22px_rgba(0,0,0,0.4)] ${i % 2 ? 'mt-6' : ''}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" loading="lazy" className="aspect-[3/4] w-full object-cover transition-transform duration-500 hover:scale-105" />
                </motion.div>
              ))}
            </div>
          </div>
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-4xl font-light leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
            >
              One studio.
              <br />
              <span className="font-display-italic text-gradient">Four specialists.</span>
              <br />
              Zero busywork.
            </motion.h2>
            <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              Each lab is a specialist trained on a single job. Together, they read
              from the same brand brain, so every listing, ad, photo, and video looks
              like it came from one studio, not six different AI tools.
            </p>
          </div>
        </div>

        {/* Asymmetric bento with glass cards */}
        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-6">
          <LabCard
            className="md:col-span-4 md:row-span-2"
            n="01"
            name="ListingLab"
            tagline="For Amazon and marketplace sellers"
            description="Paste any ASIN. ArrowLabs scans reviews, competitors, and search terms, then generates main images, lifestyle shots, infographics, and full A+ content modules engineered to convert. Push to Seller Central in one click."
            features={['A+ content modules', 'Main image generator', 'Infographics', 'Variant generation', 'SERP simulation', '1-click Seller Central push']}
            preview="listing"
          />

          <LabCard
            className="md:col-span-2 md:row-span-2"
            n="02"
            name="AngleLab"
            tagline="For D2C and paid social"
            description="Stop guessing ad angles. AI ranks testable angles mapped to your ICP: Social Proof, Before/After, Problem to Solution, and 11 more."
            features={['7 signal sources', 'Ranked angle discovery', 'Static · carousel · video', 'A/B testing built in']}
            preview="angle"
            compact
          />

          <LabCard
            className="md:col-span-3"
            n="03"
            name="PhotoLab"
            tagline="No photo studio required"
            description="Upload a packshot. Get studio-grade lifestyle photography in dozens of contexts: kitchen, gym, on-model, outdoor."
            features={['100+ scene presets', 'AI background replacement', 'AI fashion models', '4K enhancement']}
            preview="photo"
            compact
          />

          <LabCard
            className="md:col-span-3"
            n="04"
            name="VideoLab"
            tagline="UGC ads without filming"
            description="Turn any product into scroll-stopping UGC-style video. 1,000+ AI avatars across 40+ languages."
            features={['1,000+ AI avatars', 'Hook lab · 40+ languages', 'Auto B-roll + captions', 'Bulk render']}
            preview="video"
            compact
          />
        </div>
      </div>
    </section>
  )
}

function LabCard({
  className = '',
  n,
  name,
  tagline,
  description,
  features,
  preview,
  compact = false,
}: {
  className?: string
  n: string
  name: string
  tagline: string
  description: string
  features: string[]
  preview: 'listing' | 'angle' | 'photo' | 'video'
  compact?: boolean
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`group relative flex flex-col glass rounded-2xl p-8 transition-all hover:shadow-md ${className}`}
    >
      <div className="flex items-baseline justify-between">
        <span className="label-mono">§ {n}</span>
        <span className="text-[11px] text-muted-foreground">{tagline}</span>
      </div>

      <h3 className="mt-6 font-display text-3xl font-medium tracking-tight sm:text-4xl">
        {name}
      </h3>

      <div className="mt-6 mb-6">
        <Preview kind={preview} compact={compact} />
      </div>

      <p className={`text-pretty leading-relaxed text-muted-foreground ${compact ? 'text-sm' : 'text-base'}`}>
        {description}
      </p>

      <div className="mt-5 border-t border-border/60 pt-4">
        <div className="label-mono mb-2">Capabilities</div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-foreground/80">
          {features.map((f, i) => (
            <li key={f} className="flex items-center gap-2">
              {i > 0 && <span className="text-muted-foreground/40">·</span>}
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>

      <a
        href="/features"
        className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-foreground link-underline self-start"
      >
        Explore {name}
        <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </a>
    </motion.article>
  )
}

/* Real image previews - generated by ThreeArrow AI */
const LISTING_IMGS = [
  '/marketing/premium/model-skincare.png',
  '/pitch/minimalist-hero.png',
  '/marketing/premium/beauty-flatlay.png',
  '/pitch/thewholetruth-hero.png',
  '/marketing/premium/model-athleisure.png',
  '/marketing/brands/owala.png',
  '/showcase/hot/hero-home.jpg',
  '/marketing/brands/sony.png',
]
const PHOTO_IMGS = [
  '/marketing/premium/model-skincare.png',
  '/pitch/snitch-hero.png',
  '/marketing/premium/beauty-flatlay.png',
  '/pitch/pilgrim-hero.png',
  '/marketing/premium/lifestyle-desk.png',
  '/marketing/brands/cerave.png',
]
const VIDEO_IMGS = ['/marketing/premium/model-skincare.png', '/marketing/premium/model-athleisure.png', '/marketing/ugc-creator.png']

function Preview({ kind, compact }: { kind: string; compact: boolean }) {
  if (kind === 'listing') {
    return (
      <div className="grid grid-cols-4 gap-1.5">
        {LISTING_IMGS.map((src, i) => (
          <div key={i} className="group/tile relative aspect-square overflow-hidden rounded-md bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            <span className="absolute left-1.5 top-1 label-mono text-[9px] text-white mix-blend-difference">{String(i + 1).padStart(2, '0')}</span>
          </div>
        ))}
      </div>
    )
  }

  if (kind === 'angle') {
    return (
      <div className="space-y-2.5">
        {[
          { label: 'Social proof', score: 94, w: '94%' },
          { label: 'Before / after', score: 87, w: '87%' },
          { label: 'Problem to solution', score: 81, w: '81%' },
          { label: 'Testimonial', score: 73, w: '73%' },
        ].map((r) => (
          <div key={r.label} className="flex items-center gap-3">
            <span className="flex-1 truncate text-xs text-foreground/80">{r.label}</span>
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-accent rounded-full" style={{ width: r.w }} />
            </div>
            <span className="label-mono w-7 text-right tabular">{r.score}</span>
          </div>
        ))}
      </div>
    )
  }

  if (kind === 'photo') {
    return (
      <div className="grid grid-cols-3 gap-1.5">
        {PHOTO_IMGS.map((src, i) => (
          <div key={i} className="group/tile aspect-square overflow-hidden rounded-md bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          </div>
        ))}
      </div>
    )
  }

  // video - vertical frames with REC overlay
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {VIDEO_IMGS.map((src, i) => (
        <div key={i} className="relative aspect-[9/16] overflow-hidden rounded-md bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <span className="absolute left-1.5 top-1.5 label-mono text-[9px] text-white">{i === 1 ? '1:1' : '9:16'}</span>
          <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
            <span className="label-mono text-[9px] text-white">REC</span>
          </div>
        </div>
      ))}
    </div>
  )
}
