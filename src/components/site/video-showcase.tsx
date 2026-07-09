'use client'

import { motion } from 'framer-motion'
import { GENERATED_VIDEOS } from '@/lib/showcase'

// Vertical UGC videos in phone-style frames, autoplay on view. Shows the video
// generation capability (Sora-2 / Veo-3) front and center.
export function VideoShowcase() {
  return (
    <section id="video" className="relative overflow-hidden py-24 lg:py-32">
      <div className="pointer-events-none absolute left-1/3 top-10 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />
      <div className="relative mx-auto max-w-[1280px] px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl"
        >
          <span className="label-mono text-accent">UGC video, generated</span>
          <h2 className="mt-4 font-display text-[38px] font-medium leading-[1.05] tracking-tight sm:text-[52px]">
            Scroll-stopping video ads,{' '}
            <span className="font-display-italic text-gradient">without a single shoot.</span>
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">
            Every clip below was generated from a prompt by ThreeArrow AI, sized for Reels, TikTok,
            and Shorts. Real creators, real motion, zero production cost.
          </p>
        </motion.div>

        <div className="mt-14 flex flex-wrap justify-center gap-6 sm:gap-8">
          {GENERATED_VIDEOS.map((v, i) => (
            <motion.figure
              key={v.src}
              initial={{ opacity: 0, y: 30, scale: 0.96 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.6, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -8 }}
              className="group relative w-[220px] overflow-hidden rounded-[28px] border-[6px] border-black bg-black shadow-[0_40px_80px_-30px_rgba(0,0,0,0.5)] sm:w-[260px]"
            >
              <video src={v.src} autoPlay muted loop playsInline className="aspect-[9/16] w-full object-cover" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent p-3">
                <span className="text-xs font-medium text-white">{v.label}</span>
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-[9px] text-white backdrop-blur">{v.tag}</span>
              </div>
            </motion.figure>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-12 flex flex-col items-center gap-3 text-center"
        >
          <a href="/login" className="group inline-flex items-center gap-2 rounded-full btn-gradient px-7 py-3.5 text-sm font-semibold">
            Generate a video ad
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </a>
          <span className="text-sm text-muted-foreground">Powered by ThreeArrow AI</span>
        </motion.div>
      </div>
    </section>
  )
}
