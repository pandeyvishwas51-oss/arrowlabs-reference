// A+ content generator (kind 'aplus'). Produces one distinct A+ module per index,
// cycling through the module layouts so a full set never looks the same. Reuses the
// existing buildAPlusPrompt with product-lock. Copy is derived from the product for
// now; a Creative Director pass can enrich it later without changing this contract.

import type { Asset, Generator, GenerateOptions, ListingFile, PlatformSpec } from '@/core'
import type { Ctx } from '@/core'
import { bestModelFor, generateImage } from '@/lib/ai/image'
import { buildAPlusPrompt } from '@/lib/prompting/image-prompts'

// The 6-topic A+ structure, cycled by index.
const MODULES: Array<{
  moduleType: 'brand-story' | 'comparison-chart' | 'lifestyle' | 'spec-table'
  story: (name: string, brand: string) => string
}> = [
  { moduleType: 'brand-story', story: (n, b) => `${b || n}: crafted for everyday quality` },
  { moduleType: 'comparison-chart', story: () => 'Why it stands apart' },
  { moduleType: 'lifestyle', story: (n) => `${n} in real life` },
  { moduleType: 'spec-table', story: () => 'The details that matter' },
  { moduleType: 'lifestyle', story: (n) => `Made for the way you live` },
  { moduleType: 'brand-story', story: (n, b) => `${b || n}: made to last` },
]

export function createAplusGenerator(): Generator {
  return {
    id: 'gen.aplus',
    kind: 'aplus',
    async generate(
      listing: ListingFile,
      platform: PlatformSpec,
      ctx: Ctx,
      options?: GenerateOptions,
    ): Promise<Asset> {
      const index = options?.index ?? 0
      const spec = MODULES[index % MODULES.length]
      const p = listing.product
      const keyFeatures = p.bullets.length ? p.bullets : p.features
      const palette = listing.brand
        ? [listing.brand.colors.primary, listing.brand.colors.secondary, listing.brand.colors.accent].filter(
            (c): c is string => Boolean(c),
          )
        : undefined

      const prompt = buildAPlusPrompt({
        productName: p.title,
        brand: p.brand || '',
        story: spec.story(p.title, p.brand || ''),
        body: keyFeatures[index % Math.max(keyFeatures.length, 1)] || '',
        keyFeatures,
        moduleType: spec.moduleType,
        palette,
      })

      const reference = p.images?.[0]
      if (reference) prompt.referenceImageUrl = reference
      if (options?.comment) prompt.textPrompt = `${prompt.textPrompt}\n\nRevision notes: ${options.comment}`

      const result = await generateImage(prompt, { model: bestModelFor('aplus'), poolOffset: index })
      ctx.log.debug('gen.aplus: module generated', { moduleType: spec.moduleType, index })

      return {
        id: `${listing.id}:aplus:${index}`,
        kind: 'aplus',
        moduleKey: 'gen.aplus',
        url: result.url,
        meta: { moduleType: spec.moduleType, model: result.model, prompt: result.prompt, index },
        version: 1,
        validationStatus: 'pending',
      }
    },
  }
}
