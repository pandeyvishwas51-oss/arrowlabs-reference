// Myntra platform spec. Grounded in 2026 Myntra catalog guidelines (see
// MARKETPLACES.md). Key facts: images are a strict 3:4 PORTRAIT crop, min 1080x1440
// (recommended 1500x2000), pure white background, and apparel requires a real
// gender-matched full-length MODEL (flat lays are rejected); 5 to 7 images per variant;
// the title must NOT contain the brand name, extra keywords, or special characters, and
// must accurately state fit, fabric, pattern, sleeve, and category.

import type { PlatformSpec } from '../../contracts/platform'
import { registerPlatform } from '../../registry'
import { MYNTRA_IDQ } from './shared'

export const MYNTRA: PlatformSpec = registerPlatform({
  key: 'myntra',
  label: 'Myntra',
  region: 'IN',
  image: { aspect: '3:4', minPx: 1440, recommendedPx: 2000, textDensity: 'low', whiteBgRequired: true, modelRequired: true, maxImages: 7 },
  aplusImage: { aspect: '3:4', minPx: 1440, textDensity: 'low' },
  title: { max: 100, mobileTruncate: 60, forbiddenChars: ['|', '*', '#', '@'], allowBrand: false },
  bullets: { count: 5, max: 160 },
  features: { count: 5 },
  description: { max: 1500 },
  searchTerms: { maxBytes: 200, allowBrand: false, allowPunctuation: false },
  aplus: { modules: 6 },
  video: { allowed: true, aspect: '9:16', seconds: 12 },
  idqRules: MYNTRA_IDQ,
  guidelines: [
    'Title must NOT include the brand name, extra keywords, or special characters.',
    'State fit, fabric, pattern, sleeve, and category accurately in the title.',
    'Images are 3:4 portrait on pure white; apparel needs a real gender-matched full-length model, not a flat lay.',
    'Fabric composition and care instructions are mandatory attributes.',
  ],
})
