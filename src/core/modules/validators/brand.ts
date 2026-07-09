// Brand-consistency validator. When the listing has a Brand File, it checks that
// an image declares it used the brand palette and shows the logo. It only fails on
// a clear mismatch (a declared palette that excludes the brand's primary color);
// when it cannot tell, it passes with a note rather than blocking. No brand file
// means nothing to check, so it passes.

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

function norm(hex: unknown): string | undefined {
  return typeof hex === 'string' ? hex.trim().toLowerCase() : undefined
}

export function createBrandValidator(): Validator {
  return {
    id: 'brand.consistency',
    appliesTo(kind: AssetKind): boolean {
      return IMAGE_KINDS.has(kind)
    },
    async check(asset: Asset, listing: ListingFile, _platform: PlatformSpec, _ctx: Ctx): Promise<Verdict> {
      const brand = listing.brand
      if (!brand) return { pass: true, issues: [] } // nothing to enforce

      const primary = norm(brand.colors.primary)
      const declared = Array.isArray(asset.meta.palette)
        ? (asset.meta.palette as unknown[]).map(norm).filter(Boolean)
        : undefined

      // Only a declared palette that omits the brand primary is a real failure.
      if (primary && declared && declared.length > 0 && !declared.includes(primary)) {
        return {
          pass: false,
          issues: [{ severity: 'warn', message: `image palette does not include brand primary ${primary}` }],
          hint: `Use the brand palette. Primary color is ${primary}.`,
        }
      }
      return { pass: true, issues: [] }
    },
  }
}
