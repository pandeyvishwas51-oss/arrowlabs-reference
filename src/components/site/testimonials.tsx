'use client'

import { motion } from 'framer-motion'

const supporting = [
  {
    quote: '3× faster than anything else we have used. Market Intelligence is my favorite part.',
    name: 'Tanya Higgs',
    role: 'Luke & Lulu · 8-figure brand',
  },
  {
    quote: 'We do full creative projects in 30 minutes now and they are genuinely good.',
    name: 'Cameron Murphy',
    role: 'Krampade · 8-figure brand',
  },
  {
    quote: 'We successfully eliminated revisions from our process, which were genuinely expensive.',
    name: 'Rowie',
    role: 'Creative Director · Amazon Agency',
  },
]

export function Testimonials() {
  return (
    <section id="customers" className="py-20 lg:py-32 bg-muted/30 hairline-t hairline-b">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="grid gap-8 pb-12 lg:grid-cols-[1fr_2fr] lg:gap-16">
          <div>
            <div className="label-mono">§ 11 · Customers</div>
          </div>
          <div>
            <div className="label-mono mb-3">1,200+ brands · 4.9 / 5 avg</div>
          </div>
        </div>

        <motion.figure
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl"
        >
          <blockquote className="font-display text-3xl font-light leading-[1.2] tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            <span className="font-display-italic text-gradient">“</span>
            ArrowLabs replaced three tools and a freelancer. Our creative output doubled
            in a week, and our design team finally has time to think instead of just
            <span className="font-display-italic"> produce.</span>
            <span className="font-display-italic text-gradient">”</span>
          </blockquote>
          <figcaption className="mt-8 flex items-center gap-4 hairline-t pt-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-foreground text-sm font-medium text-background">
              NJ
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">Nikhil Jain</div>
              <div className="text-sm text-muted-foreground">Founder, Behoma</div>
            </div>
            <a
              href="/showcase"
              className="ml-auto hidden text-sm font-medium text-foreground link-underline sm:inline-block"
            >
              Read the case study →
            </a>
          </figcaption>
        </motion.figure>

        <div className="mt-20 grid gap-4 md:grid-cols-3">
          {supporting.map((t, i) => (
            <motion.figure
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="glass rounded-2xl p-6"
            >
              <blockquote className="text-sm leading-relaxed text-foreground/90">
                “{t.quote}”
              </blockquote>
              <figcaption className="mt-4 hairline-t pt-3">
                <div className="text-sm font-medium text-foreground">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.role}</div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  )
}
