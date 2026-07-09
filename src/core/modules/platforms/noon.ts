// Noon platform spec. Grounded in Noon's seller help center (2024/2026):
//   - helpcenter.noon.partners / support.noon.partners (picture requirements, content guidelines)
// Verified facts baked in: images are JPG/JPEG at aspect ratio 0.73 (portrait, close to
// 3:4); pure white background for all categories except fashion (light grey); a minimum
// of 3 images from different angles; the main image is a high-res product shot; titles
// are keyword-heavy with each word capitalized (title case); descriptions are rich and
// feature-led. Noon is a UAE/KSA general marketplace, so Arabic plus English discovery
// helps.

import type { PlatformSpec } from '../../contracts/platform'
import { registerPlatform } from '../../registry'
import { NOON_IDQ } from './shared'

export const NOON: PlatformSpec = registerPlatform({
  key: 'noon',
  label: 'Noon',
  region: 'GCC',
  // 0.73 aspect ~ portrait 3:4; white background, min 3 images from angles.
  image: { aspect: '3:4', minPx: 1000, recommendedPx: 1600, textDensity: 'low', whiteBgRequired: true, maxImages: 8 },
  aplusImage: { aspect: '1:1', minPx: 1200, textDensity: 'medium' },
  // Title 5-200 chars, Title Case, no special characters (noon Seller Lab rule).
  title: { max: 200, mobileTruncate: 70, forbiddenChars: ['@', '^', '*', '#', '&'], allowBrand: true },
  bullets: { count: 5, max: 200 },
  features: { count: 5 },
  description: { max: 2000 },
  searchTerms: { maxBytes: 240, allowBrand: false, allowPunctuation: false },
  aplus: { modules: 6 },
  video: { allowed: true, aspect: '1:1', seconds: 12 },
  idqRules: NOON_IDQ,
  guidelines: [
    'Title in Title Case, keyword-heavy, brand first (per Noon PDP guidance).',
    'Primary image on a pure white background, high resolution, product centered; at least 3 images from different angles.',
    'Rich description highlighting key features; no placeholder images.',
    'Bilingual discovery: include Arabic alongside English keywords for GCC shoppers.',
  ],
})
