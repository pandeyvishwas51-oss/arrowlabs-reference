'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUpRight, Check } from 'lucide-react'
import { IMAGES } from '@/lib/images'

type ViewId = 'dashboard' | 'listinglab' | 'anglelab' | 'photolab' | 'videolab'

const views: {
  id: ViewId
  label: string
  title: string
  description: string
  image: string
  bullets: string[]
}[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    title: 'One command center for every brand.',
    description: 'See every campaign, every asset, every A/B test in one place. Built for solo sellers managing one store, and agencies running 30 brands side by side.',
    image: IMAGES.dashboard[0],
    bullets: ['Cross-brand overview', 'Live A/B test tracker', 'Asset version history', 'Team activity feed'],
  },
  {
    id: 'listinglab',
    label: 'ListingLab',
    title: 'From ASIN to A+ content in 90 seconds.',
    description: 'Paste an Amazon link. ArrowLabs analyzes reviews, competitors, and search terms, then assembles main images, infographics, lifestyle shots, and A+ modules. Push to Seller Central in one click.',
    image: IMAGES.amazon[0],
    bullets: ['Review mining on 1,000+ reviews', 'Competitor visual analysis', 'A+ module library', '1-click Seller Central push'],
  },
  {
    id: 'anglelab',
    label: 'AngleLab',
    title: 'Discover angles your team would never test.',
    description: 'AI surfaces 12 to 18 ranked ad angles per product, each scored against historical performance in your category. Stop shipping creatives based on hunches.',
    image: IMAGES.adcreative[0],
    bullets: ['7 signal sources', 'Predicted conversion score', 'ICP mapping per angle', 'Auto-refresh on creative fatigue'],
  },
  {
    id: 'photolab',
    label: 'PhotoLab',
    title: 'Studio-grade photography without the studio.',
    description: 'Upload a single packshot. Get dozens of lifestyle, on-model, and contextual shots in seconds. No photographer, no reshoots, no location fees.',
    image: IMAGES.skincare[0],
    bullets: ['100+ scene presets', 'AI background replacement', 'AI fashion models for apparel', '4K enhancement for low-res inputs'],
  },
  {
    id: 'videolab',
    label: 'VideoLab',
    title: 'UGC video ads without filming a single frame.',
    description: 'Pick an avatar, paste your script, and ArrowLabs assembles a scroll-stopping UGC video with hooks, B-roll, captions, and music. Sized for TikTok, Reels, Shorts, and Feed.',
    image: IMAGES.ugc[0],
    bullets: ['1,000+ AI avatars', '40+ languages', 'Hook lab for the first 3 seconds', 'Bulk render from one script'],
  },
]

export function Workspace() {
  const [active, setActive] = useState<ViewId>('dashboard')
  const view = views.find((v) => v.id === active)!

  return (
    <section id="workspace" className="py-20 lg:py-32 bg-muted/30 hairline-t hairline-b">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        {/* Header */}
        <div className="grid gap-8 pb-12 lg:grid-cols-[1fr_2fr] lg:gap-16">
          <div>
            <div className="label-mono">§ 02 · The Workspace</div>
          </div>
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="font-display text-4xl font-light leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
            >
              Tour the studio.
              <br />
              <span className="font-display-italic text-gradient">See it run.</span>
            </motion.h2>
            <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              Five views, one workspace. Click through to see how ArrowLabs takes a single product link and turns it into every creative your store needs.
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="mt-8 flex flex-wrap gap-1 hairline-b pb-px">
          {views.map((v) => (
            <button
              key={v.id}
              onClick={() => setActive(v.id)}
              className={`relative px-4 py-3 text-sm font-medium transition-colors ${
                active === v.id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {v.label}
              {active === v.id && (
                <motion.span
                  layoutId="active-tab"
                  className="absolute inset-x-0 -bottom-px h-0.5 bg-accent"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Active view */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-16"
          >
            {/* Left: large image in window chrome with fake product sidebar */}
            <div className="relative">
              <div className="overflow-hidden rounded-xl glass-strong">
                {/* Browser chrome */}
                <div className="flex items-center gap-1.5 border-b border-border/60 px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-chart-3/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-accent/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-foreground/40" />
                  <span className="ml-3 label-mono">arrowlabs.art / studio / {view.id}</span>
                  <span className="ml-auto flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                    <span className="label-mono">Live</span>
                  </span>
                </div>

                {/* App body: sidebar + main */}
                <div className="flex">
                  {/* Fake app sidebar */}
                  <aside className="hidden w-44 shrink-0 border-r border-border/60 bg-white/40 p-3 sm:block">
                    <div className="label-mono mb-3 px-1">Workspaces</div>
                    <ul className="space-y-1">
                      {['Behoma', 'Home Crayon', 'Amara Earth'].map((w, i) => (
                        <li key={w}>
                          <div
                            className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs ${
                              i === 0 ? 'bg-foreground/5 text-foreground font-medium' : 'text-muted-foreground'
                            }`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-accent/60" />
                            <span className="truncate">{w}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <div className="label-mono mb-2 mt-5 px-1">Labs</div>
                    <ul className="space-y-1">
                      {['ListingLab', 'AngleLab', 'PhotoLab', 'VideoLab'].map((l) => (
                        <li key={l} className="px-2 py-1 text-xs text-muted-foreground">{l}</li>
                      ))}
                    </ul>
                  </aside>

                  {/* Main area - built-in app mockup (no screenshot) */}
                  <div className="relative aspect-[16/10] flex-1 bg-gradient-to-br from-white to-muted/40 p-5">
                    <div className="grid grid-cols-3 gap-3">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="rounded-lg border border-border/50 bg-white/70 p-3">
                          <div className="h-1.5 w-8 rounded-full bg-black/10" />
                          <div className="mt-2 h-4 w-14 rounded bg-black/15" />
                          <div className="mt-2 h-6 w-full rounded bg-gradient-to-r from-accent/20 to-transparent" />
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 space-y-2 rounded-lg border border-border/50 bg-white/70 p-3">
                      {[92, 78, 64, 50].map((w, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="flex h-5 w-5 items-center justify-center rounded bg-black/5 text-[9px] font-semibold">{i + 1}</span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent/60" style={{ width: `${w}%` }} />
                          </div>
                          <span className="label-mono text-[10px] text-muted-foreground">{w}</span>
                        </div>
                      ))}
                    </div>
                    <div className="absolute right-3 top-3 rounded-full bg-white/80 backdrop-blur-md border border-white/60 px-2.5 py-1 label-mono">
                      ● Generating · 47s
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: copy + bullets */}
            <div className="flex flex-col justify-center">
              <div className="label-mono">{view.label}</div>
              <h3 className="mt-3 font-display text-2xl font-medium tracking-tight sm:text-3xl">
                {view.title}
              </h3>
              <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
                {view.description}
              </p>
              <ul className="mt-6 space-y-3 hairline-t pt-6">
                {view.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                      <Check className="h-3 w-3" />
                    </span>
                    <span className="text-foreground/90">{b}</span>
                  </li>
                ))}
              </ul>
              <a
                href="/pricing"
                className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-foreground link-underline self-start"
              >
                Try {view.label}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}
