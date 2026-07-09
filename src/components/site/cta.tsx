'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useToast } from '@/hooks/use-toast'

type State = 'idle' | 'loading' | 'success' | 'error'

export function CTA() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>('idle')
  const { toast } = useToast()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({
        title: 'Enter a valid email',
        description: 'We need a working email to set up your workspace.',
        variant: 'destructive',
      })
      return
    }

    setState('loading')
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'landing_cta' }),
      })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Request failed')
      }

      setState('success')
      toast({
        title: "You're on the list",
        description: 'Check your inbox, we just sent your free-trial activation link.',
      })
    } catch (err) {
      setState('error')
      toast({
        title: 'Something went wrong',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      })
    }
  }

  return (
    <section id="cta" className="relative py-24 lg:py-40 overflow-hidden">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-gradient opacity-[0.14] blur-[120px]" />
      <div className="relative mx-auto max-w-[1280px] px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="glass-strong rounded-3xl p-10 sm:p-16 text-center"
        >
          <div className="label-mono">§ 13 · Start</div>

          <h2 className="mx-auto mt-6 max-w-4xl font-display text-4xl font-light leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            Stop renting your creative.
            <br />
            <span className="font-display-italic text-gradient">Own the studio.</span>
          </h2>

          <p className="mx-auto mt-8 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            Join 1,200+ Amazon sellers, D2C brands, and agencies using ArrowLabs to
            generate every creative their store needs, listings, ads, photos, and
            video, in one place.
          </p>

          {state === 'success' ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-auto mt-10 inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              You're in, check your inbox for the activation link.
            </motion.div>
          ) : (
            <form
              onSubmit={onSubmit}
              className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3 sm:flex-row"
            >
              <input
                type="email"
                placeholder="you@brand.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={state === 'loading'}
                aria-label="Work email"
                className="h-12 w-full flex-1 rounded-full border border-border bg-white/80 px-5 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={state === 'loading'}
                className="btn-gradient h-12 shrink-0 rounded-full px-7 text-sm font-semibold disabled:opacity-50"
              >
                {state === 'loading' ? 'Saving…' : 'Start free →'}
              </button>
            </form>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 label-mono">
            <span>Free forever plan</span>
            <span>·</span>
            <span>No credit card</span>
            <span>·</span>
            <span>Cancel anytime</span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
