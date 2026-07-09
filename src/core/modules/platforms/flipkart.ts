// Flipkart platform spec. Grounded in 2026 Flipkart seller guidelines (see
// MARKETPLACES.md). Key facts: the title is attribute-driven (brand + product type +
// key attributes), not free text; images are 1:1 on a white background, min 500x500,
// recommended 1000x1000+, product filling ~90% of the frame, up to 13 images;
// description around 1000 characters; backend search keywords are limited to 3 words
// and must not include the brand name.

import type { PlatformSpec } from '../../contracts/platform'
import { registerPlatform } from '../../registry'
import { FLIPKART_IDQ } from './shared'

export const FLIPKART: PlatformSpec = registerPlatform({
  key: 'flipkart',
  label: 'Flipkart',
  region: 'IN',
  image: { aspect: '1:1', minPx: 1000, recommendedPx: 1100, textDensity: 'low', whiteBgRequired: true, maxImages: 13 },
  aplusImage: { aspect: '1:1', minPx: 1100, textDensity: 'medium' },
  title: { max: 150, mobileTruncate: 70, allowBrand: true, attributeDriven: true },
  bullets: { count: 5, max: 160 },
  features: { count: 5 },
  description: { max: 1000 },
  searchTerms: { maxBytes: 200, maxWords: 3, allowBrand: false, allowPunctuation: false },
  aplus: { modules: 6 },
  video: { allowed: true, aspect: '1:1', seconds: 12 },
  idqRules: FLIPKART_IDQ,
  guidelines: [
    'Title is built from attributes: lead with brand, then product type, then key attributes (size, color, model).',
    'Images on a clean white background, product filling about 90 percent of the frame, no text or watermarks.',
    'Backend keywords: only 3 words, and never the brand name.',
    'Description must match the images exactly; mismatched color or pattern is the top rejection reason.',
  ],
})
