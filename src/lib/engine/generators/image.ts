// Image generators. One per image kind, each reusing an existing prompt builder
// and the existing generateImage (gpt-image-2 with product-lock). The real product
// photo is passed as referenceImageUrl so the design stays identical, which is the
// number-one product rule. These wrap the proven code rather than replacing it.

import type { Asset, Generator, GenerateOptions, ListingFile, PlatformSpec } from '@/core'
import type { Ctx } from '@/core'
import { bestModelFor, generateImage } from '@/lib/ai/image'
import {
  buildDetailPrompt,
  buildDimensionPrompt,
  buildInfographicPrompt,
  buildLifestylePrompt,
  buildMainImagePrompt,
  type ImagePrompt,
} from '@/lib/prompting/image-prompts'

const VALID_ASPECTS = new Set(['1:1', '4:5', '16:9', '9:16', '3:4', '4:3'])

function common(listing: ListingFile) {
  const p = listing.product
  const keyFeatures = p.bullets.length ? p.bullets : p.features
  return {
    productName: p.title,
    brand: p.brand || '',
    category: p.categoryPath?.[0] || 'general',
    keyFeatures,
    reference: p.images?.[0],
  }
}

/** Pull whatever baked text the builder planned, so the mobile validator can judge it. */
function captionOf(prompt: ImagePrompt): string {
  if (prompt.renderText === false) return ''
  const typo = (prompt.styling?.typography ?? []).map((t) => t.text).join(' ')
  const overlay = (prompt.styling?.overlay ?? []).map((o) => o.content).join(' ')
  return `${typo} ${overlay}`.trim()
}

function makeImageGenerator(
  kind: string,
  build: (listing: ListingFile, index: number) => ImagePrompt,
): Generator {
  return {
    id: `gen.${kind}`,
    kind,
    async generate(
      listing: ListingFile,
      platform: PlatformSpec,
      ctx: Ctx,
      options?: GenerateOptions,
    ): Promise<Asset> {
      const index = options?.index ?? 0
      const prompt = build(listing, index)
      // Product-lock: edit from the real photo so the product is never re-imagined.
      const reference = listing.product.images?.[0]
      if (reference) prompt.referenceImageUrl = reference
      // Force the platform's catalog aspect ratio.
      if (VALID_ASPECTS.has(platform.image.aspect)) {
        prompt.technical.aspectRatio = platform.image.aspect as ImagePrompt['technical']['aspectRatio']
      }
      // A regenerate carries the validators' hints; append them to the text prompt.
      if (options?.comment) prompt.textPrompt = `${prompt.textPrompt}\n\nRevision notes: ${options.comment}`
      const result = await generateImage(prompt, { model: bestModelFor(kind), poolOffset: index })
      ctx.log.debug(`gen.${kind}: image generated`, { url: result.url, index })
      return {
        id: `${listing.id}:${kind}:${index}`,
        kind,
        moduleKey: `gen.${kind}`,
        url: result.url,
        meta: { caption: captionOf(prompt), model: result.model, prompt: result.prompt, index },
        version: 1,
        validationStatus: 'pending',
      }
    },
  }
}

export function createImageGenerators(): Generator[] {
  return [
    makeImageGenerator('image.hero', (l) => buildMainImagePrompt(common(l))),
    makeImageGenerator('image.product', (l) => buildMainImagePrompt(common(l))),
    makeImageGenerator('image.lifestyle', (l, index) => {
      const c = common(l)
      const moods = ['premium', 'casual', 'cozy', 'energetic'] as const
      const scenes = [
        'a bright, tasteful home setting',
        'a warm, lived-in room with soft daylight',
        'a cozy evening scene with gentle lamp light',
        'a clean, modern lifestyle setting',
      ]
      return buildLifestylePrompt({
        productName: c.productName,
        brand: c.brand,
        category: c.category,
        keyFeatures: c.keyFeatures,
        useCase: c.keyFeatures[index % Math.max(c.keyFeatures.length, 1)] || 'everyday use',
        targetAudience: 'modern consumer',
        mood: moods[index % moods.length],
        scene: scenes[index % scenes.length],
      })
    }),
    makeImageGenerator('image.infographic', (l) => {
      const c = common(l)
      return buildInfographicPrompt({
        productName: c.productName,
        brand: c.brand,
        keyFeatures: c.keyFeatures,
        specs: [],
      })
    }),
    makeImageGenerator('image.dimension', (l) => {
      const c = common(l)
      const d = l.product.dims
      const dimensions = d ? [d.l, d.w, d.h].filter(Boolean).join(' x ') + ` ${d.unit ?? ''}` : ''
      return buildDimensionPrompt({
        productName: c.productName,
        brand: c.brand,
        category: c.category,
        dimensions: dimensions.trim(),
      })
    }),
    makeImageGenerator('image.detail', (l) => {
      const c = common(l)
      return buildDetailPrompt({
        productName: c.productName,
        brand: c.brand,
        category: c.category,
        feature: c.keyFeatures[0] || 'material texture and print detail',
      })
    }),
  ]
}
