import type { Metadata } from 'next'
import { PageHeader } from '@/components/site/page-header'
import { Ecosystem } from '@/components/site/ecosystem'
import { CTA } from '@/components/site/cta'

export const metadata: Metadata = {
  title: 'About',
  description:
    'ArrowLabs is the creative operating system for modern commerce, built by ThreeArrow AI. One studio for every creative your store needs.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About · ArrowLabs',
    description: 'ArrowLabs is the creative operating system for modern commerce, built by ThreeArrow AI.',
    url: '/about',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'ArrowLabs' }],
  },
  twitter: { images: ['/opengraph-image'] },
}

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="§ About · ThreeArrow AI"
        title="Applied AI for"
        accent="modern commerce."
        description="ArrowLabs replaces six disconnected creative tools with one studio that learns your brand. It is part of the ThreeArrow AI ecosystem, applied AI products built for the teams shaping the next decade of commerce."
      />
      <Ecosystem />
      <CTA />
    </>
  )
}
