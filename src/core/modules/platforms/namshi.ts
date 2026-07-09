// Namshi platform spec. Namshi is a UAE fashion marketplace owned by the noon group and
// integrated by sellers via ChannelEngine + the noon Seller Lab. Grounded in:
//   - ChannelEngine Namshi guide (Namshi-specific): main image aspect ratio 0.73 (portrait),
//     JPEG format, EAN mandatory, bilingual title (English + Arabic).
//   - noon Seller Help Center (parent group, same platform, strong proxy): pure white
//     background except fashion (light grey), model shots recommended for apparel (except
//     swimwear/underwear), min 1000px on the longest side, product fills 70-80% of the
//     frame, title 5-200 chars in Title Case with no special characters.
// Confidence: image ratio / JPEG / EAN / bilingual title are Namshi-confirmed; the
// background, model, and title rules are noon-parent rules Namshi almost certainly shares.

import type { PlatformSpec } from '../../contracts/platform'
import { registerPlatform } from '../../registry'
import { NAMSHI_IDQ } from './shared'

export const NAMSHI: PlatformSpec = registerPlatform({
  key: 'namshi',
  label: 'Namshi',
  region: 'GCC',
  // Aspect 0.73 = portrait, closest supported bucket is 3:4. White bg (grey for fashion),
  // model shots for apparel, min 1000px longest side.
  image: { aspect: '3:4', minPx: 1000, recommendedPx: 2000, textDensity: 'low', whiteBgRequired: true, modelRequired: true, maxImages: 8 },
  aplusImage: { aspect: '3:4', minPx: 1200, textDensity: 'low' },
  // Title 5-200 chars, Title Case, no special characters (noon-group rule).
  title: { max: 200, mobileTruncate: 70, forbiddenChars: ['@', '^', '*', '#', '&'], allowBrand: true },
  bullets: { count: 5, max: 180 },
  features: { count: 5 },
  description: { max: 1500 },
  searchTerms: { maxBytes: 200, allowBrand: false, allowPunctuation: false },
  aplus: { modules: 6 },
  video: { allowed: true, aspect: '9:16', seconds: 12 },
  idqRules: NAMSHI_IDQ,
  guidelines: [
    'Portrait imagery (0.73 aspect) in JPEG; product fills 70-80 percent of the frame, light shadows only.',
    'Apparel is shot on a real model (except swimwear and underwear); white background, light grey for fashion.',
    'Title in Title Case, 5 to 200 chars, no special characters; provide an Arabic title too (bilingual).',
    'EAN is mandatory for Namshi export.',
  ],
})
