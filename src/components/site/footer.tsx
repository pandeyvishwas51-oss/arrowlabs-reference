'use client'

import { Logo } from '@/components/site/logo'
import { AIStackStrip } from '@/components/site/powered-by'
import { COMPANY } from '@/lib/brand'

const groups = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '/features' },
      { label: 'Showcase', href: '/showcase' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Start free', href: '/login' },
    ],
  },
  {
    title: 'Ecosystem',
    links: [
      { label: 'ArrowLabs', href: '/' },
      { label: 'ArrowCrawl', href: 'https://arrowcrawl.com' },
      { label: 'ThreeArrow AI', href: COMPANY.parentUrl },
      { label: 'Case studies', href: '/showcase' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'How it works', href: '/features' },
      { label: 'A+ content', href: '/showcase' },
      { label: 'Video ads', href: '/showcase' },
      { label: 'FAQ', href: '/pricing' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'ThreeArrow AI', href: COMPANY.parentUrl },
      { label: 'Contact', href: '/#cta' },
      { label: 'Sign in', href: '/login' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="mt-auto hairline-t">
      <div className="mx-auto max-w-[1280px] px-6 py-14 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_2fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              The creative operating system for modern commerce, by {COMPANY.parent}.
              One studio for every creative your store needs.
            </p>
            <div className="mt-6 flex items-center gap-2">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
              </span>
              <span className="label-mono">All systems operational</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {groups.map((g) => (
              <div key={g.title}>
                <div className="label-mono mb-4">{g.title}</div>
                <ul className="space-y-3">
                  {g.links.map((l) => (
                    <li key={l.label}>
                      <a
                        href={l.href}
                        target={l.href.startsWith('http') ? '_blank' : undefined}
                        rel={l.href.startsWith('http') ? 'noopener' : undefined}
                        className="text-sm text-foreground/80 transition-colors hover:text-foreground"
                      >
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 hairline-t pt-6">
          <AIStackStrip className="justify-center sm:justify-start" />
        </div>
        <div className="mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="label-mono">
            © {new Date().getFullYear()} {COMPANY.parent}. All rights reserved.
          </p>
          <p className="label-mono">Applied AI for commerce</p>
        </div>
      </div>
    </footer>
  )
}
