// Video generator (kind 'video'). Wraps the existing Sora-2 path. One next-level
// ~12s clip: product hero from several angles, short on-screen feature text, and
// no voiceover with soft or no music, exactly the brief from the review. Sora-2
// only, per the hard constraint (no Google/Veo). The product stays identical.

import type { Asset, Generator, ListingFile, PlatformSpec } from '@/core'
import type { Ctx } from '@/core'
import { generateVideo } from '@/lib/ai/video'

const VALID_VIDEO_ASPECTS = new Set(['16:9', '9:16', '1:1'])

function shortFeatures(listing: ListingFile): string {
  const source = listing.product.bullets.length ? listing.product.bullets : listing.product.features
  return source
    .slice(0, 3)
    .map((b) => b.split(/[:.]/)[0].trim().split(/\s+/).slice(0, 4).join(' '))
    .filter(Boolean)
    .join(', ')
}

export function createVideoGenerator(): Generator {
  return {
    id: 'gen.video',
    kind: 'video',
    async generate(listing: ListingFile, platform: PlatformSpec, ctx: Ctx): Promise<Asset> {
      if (!platform.video.allowed) {
        throw new Error(`gen.video: ${platform.label} does not allow product video`)
      }
      const p = listing.product
      const productDesc = `${p.title}${p.brand ? ` by ${p.brand}` : ''}${
        p.categoryPath?.[0] ? `, a ${p.categoryPath[0]}` : ''
      }`
      const features = shortFeatures(listing)
      const aspect = VALID_VIDEO_ASPECTS.has(platform.video.aspect)
        ? (platform.video.aspect as '16:9' | '9:16' | '1:1')
        : '16:9'

      const prompt = [
        `A next-level, high-end commercial product video of ${productDesc}.`,
        'Show the product beautifully from several angles with smooth cinematic camera moves and soft premium lighting.',
        features
          ? `Overlay short, clean on-screen TEXT callouts of the key features (${features}) in a modern sans-serif, appearing tastefully one at a time.`
          : 'Overlay short, clean on-screen text callouts of the key features in a modern sans-serif.',
        'Keep the product 100 percent identical throughout.',
        'AUDIO: no voiceover or speech at all, only soft gentle background music or silence.',
        'Magazine-quality, polished, about 12 seconds. Do not use any dashes in on-screen text.',
      ].join(' ')

      const result = await generateVideo(
        { prompt, aspectRatio: aspect, seconds: platform.video.seconds },
        { maxWaitMs: 12 * 60 * 1000 },
      )
      ctx.log.debug('gen.video: video generated', { url: result.url })

      return {
        id: `${listing.id}:video`,
        kind: 'video',
        moduleKey: 'gen.video',
        url: result.url,
        meta: { aspect, seconds: platform.video.seconds, prompt },
        version: 1,
        validationStatus: 'pending',
      }
    },
  }
}
