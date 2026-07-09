// Mobile-readability validator. 90 to 95 percent of marketplace traffic is mobile,
// so on-image copy must be short and legible on a phone. When the platform spec
// says image text density is 'low', an image whose baked caption runs long fails
// with a hint to cut it down. Reads the word count the generator records in meta.

import type { Asset, ListingFile } from '../../contracts/domain'
import type { PlatformSpec } from '../../contracts/platform'
import type { Validator, Verdict } from '../../contracts/validate'
import type { AssetKind, Ctx } from '../../contracts/types'

const IMAGE_KINDS = new Set([
  'image.hero',
  'image.lifestyle',
  'image.infographic',
  'image.dimension',
  'image.detail',
  'image.product',
])

/** Max on-image words we allow per text-density tier. */
const MAX_WORDS = { low: 8, medium: 18 } as const

export function createMobileValidator(): Validator {
  return {
    id: 'mobile.readability',
    appliesTo(kind: AssetKind): boolean {
      return IMAGE_KINDS.has(kind)
    },
    async check(asset: Asset, _listing: ListingFile, platform: PlatformSpec, _ctx: Ctx): Promise<Verdict> {
      const caption = typeof asset.meta.caption === 'string' ? asset.meta.caption : ''
      const explicit = typeof asset.meta.textWordCount === 'number' ? asset.meta.textWordCount : undefined
      const words = explicit ?? (caption.trim() ? caption.trim().split(/\s+/).length : 0)
      const limit = MAX_WORDS[platform.image.textDensity]

      if (words <= limit) return { pass: true, issues: [] }
      return {
        pass: false,
        issues: [
          {
            severity: 'warn',
            message: `on-image text is ${words} words; ${platform.label} reads best under ${limit} for mobile`,
          },
        ],
        hint: `Cut on-image text to ${limit} words or fewer. Keep only the most impactful phrase, e.g. "Soft and Breathable".`,
      }
    },
  }
}
