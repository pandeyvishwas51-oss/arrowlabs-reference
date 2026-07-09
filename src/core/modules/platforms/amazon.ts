// Amazon platform specs (India + US). Grounded in the 2025/2026 seller guidelines
// (see MARKETPLACES.md). Key facts baked in: title cap 200 chars (front-load within
// ~80 for mobile), forbidden title characters, five bullets with only the first 1000
// bytes indexed, backend search terms measured in BYTES and REGION-SPECIFIC (India is
// 200 bytes, US/UK/EU 249), no punctuation and no repeats in backend terms, 2000-char
// plain-text description, brand-registry Premium A+ up to 7 modules.

import type { PlatformSpec } from '../../contracts/platform'
import { registerPlatform } from '../../registry'
import { AMAZON_IDQ } from './shared'

const FORBIDDEN_TITLE_CHARS = ['!', '$', '?', '_', '{', '}', '^', '¬', '¦']

const guidelines = [
  'Front-load the most important keywords into the first 80 characters; mobile truncates there.',
  'No promotional words (best seller, sale, free shipping, 100% genuine) and no forbidden symbols.',
  'Backend search terms: no commas, no repeats of title or bullet words, add synonyms and common misspellings.',
  'Text baked into images is not indexed by Amazon search; keep on-image text short and for humans.',
  'A+ Content is not indexed for search; it drives conversion, which in turn lifts ranking.',
  'COSMO/Rufus rewards clear buyer intent and penalizes keyword stuffing; cover keywords naturally, do not repeat.',
]

const base = {
  image: { aspect: '1:1', minPx: 1600, recommendedPx: 2000, textDensity: 'low' as const, whiteBgRequired: true, maxImages: 9 },
  aplusImage: { aspect: '16:9', minPx: 1464, textDensity: 'medium' as const },
  title: { max: 200, mobileTruncate: 80, forbiddenChars: FORBIDDEN_TITLE_CHARS, allowBrand: true },
  bullets: { count: 5, max: 255, indexedBytes: 1000 },
  features: { count: 5 },
  description: { max: 2000 },
  aplus: { modules: 7 },
  video: { allowed: true, aspect: '16:9', seconds: 12 },
  idqRules: AMAZON_IDQ,
  guidelines,
}

export const AMAZON_IN: PlatformSpec = registerPlatform({
  key: 'amazon_in',
  label: 'Amazon India',
  region: 'IN',
  ...base,
  // India backend search terms are 200 bytes, not the 249 used in US/UK/EU.
  searchTerms: { maxBytes: 200, allowBrand: false, allowPunctuation: false },
})

export const AMAZON_COM: PlatformSpec = registerPlatform({
  key: 'amazon_com',
  label: 'Amazon US',
  region: 'US',
  ...base,
  searchTerms: { maxBytes: 249, allowBrand: false, allowPunctuation: false },
})
