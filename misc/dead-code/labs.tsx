'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ImageIcon,
  Megaphone,
  Camera,
  Video,
  Check,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type LabId = 'listing' | 'angle' | 'photo' | 'video'

const labs: {
  id: LabId
  name: string
  tagline: string
  description: string
  icon: typeof ImageIcon
  features: string[]
  output: { label: string; tone: string }[]
  accent: 'primary' | 'accent' | 'chart3' | 'chart4'
}[] = [
  {
    id: 'listing',
    name: 'ListingLab',
    tagline: 'For Amazon & marketplace sellers',
    description:
      'Paste any ASIN. ArrowLabs scans reviews, competitors, and search terms - then generates main images, lifestyle shots, infographics, and full A+ content modules engineered to convert on Amazon.',
    icon: ImageIcon,
    features: [
      'A+ content modules (comparison, USP, lifestyle)',
      'Main image generator with CTR focus',
      'Infographic generator from product data',
      'Variant generation across colors, sizes, styles',
      'SERP simulation - see if you stand out',
      'One-click push to Seller Central',
    ],
    output: [
      { label: 'Main image', tone: 'from-primary/50 to-primary/5' },
      { label: 'Infographic', tone: 'from-accent/40 to-accent/5' },
      { label: 'A+ module', tone: 'from-chart-3/40 to-chart-3/5' },
      { label: 'Comparison', tone: 'from-chart-4/40 to-chart-4/5' },
    ],
    accent: 'primary',
  },
  {
    id: 'angle',
    name: 'AngleLab',
    tagline: 'For D2C brands & paid social teams',
    description:
      'Stop guessing ad angles. ArrowLabs analyzes top-performing creatives in your category, then ranks testable angles mapped to your ICP - Social Proof, Before/After, Problem→Solution, and 11 more.',
    icon: Megaphone,
    features: [
      '7 signal sources (brand, market, sentiment, competition)',
      'Ranked angle discovery with predicted score',
      'Static · carousel · story · video ad formats',
      'On-brand generation (your fonts, colors, mood)',
      'Built-in A/B testing with one click',
      'Auto-refresh when creative fatigue sets in',
    ],
    output: [
      { label: 'Social proof', tone: 'from-accent/50 to-accent/5' },
      { label: 'Before/after', tone: 'from-primary/40 to-primary/5' },
      { label: 'Problem → solution', tone: 'from-chart-5/40 to-chart-5/5' },
      { label: 'Testimonial', tone: 'from-chart-4/40 to-chart-4/5' },
    ],
    accent: 'accent',
  },
  {
    id: 'photo',
    name: 'PhotoLab',
    tagline: 'For brands without a photo studio',
    description:
      'Upload a single packshot. Get studio-grade lifestyle photography in dozens of contexts - kitchen, bathroom, outdoor, on-model, abstract - without booking a single photographer.',
    icon: Camera,
    features: [
      '100+ scene presets (kitchen, gym, outdoor, studio)',
      'AI background replacement with realistic shadows',
      'AI fashion models for apparel brands',
      'Batch generation across angles & lighting',
      '4K enhancement for low-res inputs',
      'Brand-consistent color grading',
    ],
    output: [
      { label: 'Studio shot', tone: 'from-chart-4/40 to-chart-4/5' },
      { label: 'Lifestyle', tone: 'from-primary/40 to-primary/5' },
      { label: 'On-model', tone: 'from-accent/40 to-accent/5' },
      { label: 'Outdoor', tone: 'from-chart-3/40 to-chart-3/5' },
    ],
    accent: 'chart4',
  },
  {
    id: 'video',
    name: 'VideoLab',
    tagline: 'For paid social & performance teams',
    description:
      'Turn any product into scroll-stopping UGC-style video ads. Choose from 1,000+ AI avatars across 40+ languages - or skip the avatar and let AI assemble hooks, B-roll, and captions automatically.',
    icon: Video,
    features: [
      '1,000+ AI avatars in 40+ languages',
      'UGC-style ad scripts from product URL',
      'Auto B-roll, captions, and music sync',
      'Hook lab - first 3 seconds optimized',
      'Variants for TikTok, Reels, Shorts, Feed',
      'Bulk render from a single script',
    ],
    output: [
      { label: 'TikTok 9:16', tone: 'from-chart-3/40 to-chart-3/5' },
      { label: 'Reels 9:16', tone: 'from-accent/40 to-accent/5' },
      { label: 'Feed 1:1', tone: 'from-primary/40 to-primary/5' },
      { label: 'Shorts 9:16', tone: 'from-chart-5/40 to-chart-5/5' },
    ],
    accent: 'chart3',
  },
]

const accentMap: Record<string, { text: string; bg: string; border: string; ring: string }> = {
  primary: { text: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/30', ring: 'ring-primary/20' },
  accent: { text: 'text-accent', bg: 'bg-accent/10', border: 'border-accent/30', ring: 'ring-accent/20' },
  chart3: { text: 'text-chart-3', bg: 'bg-chart-3/10', border: 'border-chart-3/30', ring: 'ring-chart-3/20' },
  chart4: { text: 'text-chart-4', bg: 'bg-chart-4/10', border: 'border-chart-4/30', ring: 'ring-chart-4/20' },
}

export function Labs() {
  const [active, setActive] = useState<LabId>('listing')
  const lab = labs.find((l) => l.id === active)!
  const a = accentMap[lab.accent]

  return (
    <section id="labs" className="relative py-20 sm:py-28">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="secondary" className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
            Four labs · One platform
          </Badge>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            Everything your store needs to look{' '}
            <span className="gradient-text">unmissable</span>.
          </h2>
          <p className="mt-4 text-pretty text-base text-muted-foreground sm:text-lg">
            Each lab is a specialist. Together, they replace six disconnected tools -
            and they all read from the same brand brain.
          </p>
        </div>

        {/* Lab switcher */}
        <div className="mt-12 flex flex-wrap justify-center gap-2">
          {labs.map((l) => {
            const la = accentMap[l.accent]
            const isActive = l.id === active
            return (
              <button
                key={l.id}
                onClick={() => setActive(l.id)}
                className={cn(
                  'group flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all',
                  isActive
                    ? cn(la.border, la.bg, la.text)
                    : 'border-border/60 bg-card/40 text-muted-foreground hover:border-border hover:text-foreground',
                )}
              >
                <l.icon className="h-4 w-4" />
                {l.name}
              </button>
            )
          })}
        </div>

        {/* Active lab detail */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="mt-10 grid items-center gap-8 rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur sm:p-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12"
          >
            {/* Left - copy */}
            <div>
              <div className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs', a.border, a.bg, a.text)}>
                <lab.icon className="h-3.5 w-3.5" />
                {lab.tagline}
              </div>
              <h3 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
                {lab.name}
              </h3>
              <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
                {lab.description}
              </p>
              <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
                {lab.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <span className={cn('mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full', a.bg, a.text)}>
                      <Check className="h-3 w-3" />
                    </span>
                    <span className="text-foreground/90">{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button size="sm" asChild className={cn(a.bg, a.text, 'hover:opacity-90')}>
                  <a href="#pricing">
                    Try {lab.name}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <a href="#how">See how it works</a>
                </Button>
              </div>
            </div>

            {/* Right - visual mock */}
            <div className="relative">
              <div className={cn('absolute inset-0 -z-10 rounded-2xl blur-2xl', a.bg)} />
              <div className="rounded-2xl border border-border/60 bg-background/60 p-4 backdrop-blur">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">
                    Output preview
                  </span>
                  <span className={cn('text-xs font-medium', a.text)}>● Generating</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {lab.output.map((o, i) => (
                    <motion.div
                      key={o.label}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.08, duration: 0.3 }}
                      className="aspect-[4/3] overflow-hidden rounded-lg border border-border/60 bg-background/60"
                    >
                      <div className={`h-full w-full bg-gradient-to-br ${o.tone}`} />
                      <div className="border-t border-border/60 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                        {o.label}
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-xs">
                  <span className="text-muted-foreground">4 of 12 variants</span>
                  <span className={a.text}>View all →</span>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}
