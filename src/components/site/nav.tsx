'use client'

import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import { BRAND } from '@/lib/images'
import { Logo } from '@/components/site/logo'

const links = [
  { label: 'Features', href: '/features' },
  { label: 'Showcase', href: '/showcase' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
]

export function SiteNav() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled ? 'glass' : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-4 lg:px-10">
        <a href="/" className="flex items-center gap-2">
          <Logo />
          <span className="label-mono hidden text-muted-foreground/70 sm:inline">by ThreeArrow AI</span>
        </a>

        <nav className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-6 md:flex">
          <a
            href="/login"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Log in
          </a>
          <a
            href="/login"
            className="btn-gradient group inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
          >
            Start free
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </a>
        </div>

        <button
          aria-label="Toggle menu"
          className="rounded-md p-1.5 md:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="glass md:hidden">
          <div className="mx-auto flex max-w-[1280px] flex-col gap-1 px-6 py-4 lg:px-10">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="rounded-md px-2 py-2.5 text-sm text-foreground/80 hover:bg-muted"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </a>
            ))}
            <div className="mt-2 flex items-center gap-3 border-t border-border/60 pt-4">
              <a href="/login" className="flex-1 text-sm text-muted-foreground" onClick={() => setOpen(false)}>
                Log in
              </a>
              <a
                href="/login"
                className="btn-gradient rounded-full px-5 py-2.5 text-sm font-semibold"
                onClick={() => setOpen(false)}
              >
                Start free →
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
