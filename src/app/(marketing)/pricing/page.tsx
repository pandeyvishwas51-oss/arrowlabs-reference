import type { Metadata } from 'next'
import { Pricing } from '@/components/site/pricing'
import { Scale } from '@/components/site/scale'
import { FAQ } from '@/components/site/faq'
import { CTA } from '@/components/site/cta'
import { FaqStructuredData } from '@/components/site/structured-data'

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Simple pricing that scales with your catalog. Start with a 7-day completely free trial. No credit card required.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Pricing · ArrowLabs',
    description: 'Simple pricing that scales with your catalog. 7-day completely free trial, no card.',
    url: '/pricing',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'ArrowLabs' }],
  },
  twitter: { images: ['/opengraph-image'] },
}

export default function PricingPage() {
  return (
    <>
      <FaqStructuredData />
      <Pricing />
      <Scale />
      <FAQ />
      <CTA />
    </>
  )
}
