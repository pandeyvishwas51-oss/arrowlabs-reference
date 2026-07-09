// Brand intelligence builder. It assembles a BrandFile from the uploaded brand
// inputs (logo, colors, fonts, voice). Identity is an input, not a guess, which
// is what keeps a brand's catalog visually consistent. Compliance always includes
// the hard no-dash rule, merged with anything the brand adds.

import type { BrandFile } from '../../contracts/domain'
import type { BrandIntelligenceBuilder, IntelBuildInput } from '../../contracts/intelligence'
import type { BrandStore } from '../../contracts/services'
import type { Ctx } from '../../contracts/types'

/** Rules every brand inherits. The no-dash rule is a hard product requirement. */
const BASE_FORBIDDEN = ['em-dash', 'en-dash']

export function createBrandBuilder(deps: { brandStore?: BrandStore }): BrandIntelligenceBuilder {
  return {
    id: 'brand.default',
    kind: 'brand',
    async build(input: IntelBuildInput, ctx: Ctx): Promise<BrandFile> {
      if (!input.brandId) throw new Error('brand.default: brandId is required')
      if (!deps.brandStore) throw new Error('brand.default: no brandStore configured')

      const inputs = await deps.brandStore.get(input.brandId)
      if (!inputs) throw new Error(`brand.default: no brand inputs for "${input.brandId}"`)

      const forbidden = Array.from(
        new Set([...BASE_FORBIDDEN, ...(inputs.compliance?.forbidden ?? [])]),
      )

      ctx.log.debug('brand.default: assembled brand file', { brandId: input.brandId })

      return {
        brandId: inputs.brandId,
        // Version is assigned by the store/runtime on persist; 1 as the in-memory default.
        version: 1,
        name: inputs.name,
        logoUrl: inputs.logoUrl,
        colors: inputs.colors,
        fonts: inputs.fonts,
        voice: inputs.voice,
        compliance: { forbidden, toneRules: inputs.compliance?.toneRules },
      }
    },
  }
}
