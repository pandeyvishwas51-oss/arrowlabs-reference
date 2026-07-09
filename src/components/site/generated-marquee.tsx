'use client'

import { GENERATED_GALLERY } from '@/lib/showcase'

// Two infinite rows of generated creatives drifting in opposite directions -
// high-visibility motion that literally shows the product's output. Pure CSS
// marquee (duplicated track), GPU-friendly, pauses on hover.

function Row({ images, reverse = false, speed = 60 }: { images: string[]; reverse?: boolean; speed?: number }) {
  const track = [...images, ...images]
  return (
    <div className="marquee-row group flex w-max gap-4" style={{ ['--dur' as any]: `${speed}s`, animationDirection: reverse ? 'reverse' : 'normal' }}>
      {track.map((src, i) => (
        <div
          key={i}
          className="relative h-44 w-36 shrink-0 overflow-hidden rounded-2xl border border-black/5 bg-muted shadow-[0_12px_28px_-14px_rgba(0,0,0,0.35)] sm:h-56 sm:w-44"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 hover:scale-110" />
        </div>
      ))}
    </div>
  )
}

export function GeneratedMarquee() {
  const half = Math.ceil(GENERATED_GALLERY.length / 2)
  return (
    <section className="relative overflow-hidden py-16 lg:py-20">
      <div className="mx-auto mb-8 max-w-[1280px] px-6 lg:px-10">
        <span className="label-mono text-accent">The creative firehose</span>
        <h2 className="mt-3 font-display text-[30px] font-medium leading-[1.05] tracking-tight sm:text-[40px]">
          Thousands of on-brand assets, <span className="font-display-italic text-gradient">on demand.</span>
        </h2>
      </div>

      {/* edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-background to-transparent" />

      <div className="flex flex-col gap-4 overflow-hidden">
        <div className="overflow-hidden"><Row images={GENERATED_GALLERY.slice(0, half)} speed={55} /></div>
        <div className="overflow-hidden"><Row images={GENERATED_GALLERY.slice(half)} reverse speed={65} /></div>
      </div>
    </section>
  )
}
