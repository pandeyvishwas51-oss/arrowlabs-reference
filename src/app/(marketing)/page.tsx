import type { Metadata } from 'next'
import { Hero } from '@/components/site/hero'
import { Marquee } from '@/components/site/marquee'
import { Studio } from '@/components/site/studio'
import { Architecture } from '@/components/site/architecture'
import { Showcase } from '@/components/site/showcase'
import { Testimonials } from '@/components/site/testimonials'
import { CTA } from '@/components/site/cta'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
  openGraph: {
    title: 'ArrowLabs - Automate your whole store. Then let it sell.',
    description: 'A team of AI agents automates your listings, ads, product photography, and UGC video.',
    url: '/',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'ArrowLabs' }],
  },
  twitter: { images: ['/opengraph-image'] },
}

export default function Home() {
  return (
    <>
      <Hero />
      <Marquee />
      <Studio />
      <Architecture />
      <Showcase />
      <Testimonials />
      <CTA />
    </>
  )
}
