// Raw-image generation: the user uploads their own product photo + title +
// description, and we generate the full marketplace kit (listing, keywords, A+,
// images, optional video) WITHOUT scraping. The hero image drives image-to-image
// product lock so every render shows their actual product.

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { orchestrate, startOrchestration, type Lab } from '@/lib/orchestrator'
import { getLLMProvider, getImageProvider, getVideoProvider } from '@/lib/config'
import { ok, fail, parseBody, guardRate, requireActor, wrapError } from '@/lib/api'

export const maxDuration = 300

const schema = z.object({
  heroImageUrl: z.string().url(),
  title: z.string().trim().min(3).max(300),
  description: z.string().trim().max(4000).optional(),
  brand: z.string().trim().max(120).optional(),
  category: z.string().trim().max(120).optional(),
  dimensions: z.string().trim().max(120).optional(),
  theme: z.string().trim().max(300).optional(),
  price: z.number().optional(),
  currency: z.string().trim().max(8).optional(),
  targetAudience: z.string().trim().optional(),
  labs: z.array(z.enum(['ListingLab', 'APlusLab', 'AngleLab', 'PhotoLab', 'VideoLab'])).optional(),
  generateImages: z.boolean().optional(),
  generateVideo: z.boolean().optional(),
  videoStyle: z.enum(['ugc', 'overview']).optional(),
  region: z.enum(['IN', 'GCC']).optional(),
  platform: z.enum(['amazon_in', 'flipkart', 'myntra', 'noon', 'namshi']).optional(),
  counts: z
    .object({
      lifestyle: z.number().int().min(0).max(4).optional(),
      infographic: z.number().int().min(0).max(4).optional(),
      aPlus: z.number().int().min(0).max(7).optional(),
      productPhoto: z.number().int().min(0).max(6).optional(),
      dimension: z.number().int().min(0).max(2).optional(),
      detail: z.number().int().min(0).max(4).optional(),
      video: z.number().int().min(0).max(2).optional(),
    })
    .optional(),
})

export async function POST(req: NextRequest) {
  const limited = guardRate(req, 'orchestrate')
  if (limited) return limited

  const parsed = await parseBody(req, schema)
  if ('error' in parsed) return parsed.error
  const body = parsed.data

  const generateImages = body.generateImages ?? true
  const generateVideo = body.generateVideo ?? false

  // Raw generation always renders (images/video), so it needs a generating actor.
  const res = await requireActor(req, { needGenerate: true })
  if ('error' in res) return res.error

  if (!getLLMProvider()) return fail('No LLM provider configured for listing generation.', 503)

  const warnings: string[] = []
  if (generateImages && !getImageProvider()) warnings.push('No image provider configured - image generation skipped.')
  if (generateVideo && !getVideoProvider()) warnings.push('No video provider configured - video skipped.')

  const labs: Lab[] = body.labs || ['ListingLab', 'AngleLab', 'PhotoLab']
  if (generateVideo && !labs.includes('VideoLab')) labs.push('VideoLab')

  const orchestratorInput = {
    asin: `RAW-${Date.now().toString(36)}`,
    marketplace: 'US',
    raw: {
      heroImageUrl: body.heroImageUrl,
      title: body.title,
      description: body.description,
      brand: body.brand,
      category: body.category,
      price: body.price,
      currency: body.currency,
      dimensions: body.dimensions,
    },
    theme: body.theme,
    labs,
    generateImages,
    generateVideo,
    videoStyle: body.videoStyle,
    targetAudience: body.targetAudience,
    region: body.region,
    platform: body.platform,
    counts: body.counts,
    userId: res.actor.userId,
    orgId: res.actor.orgId,
  }
  try {
    if (generateImages || generateVideo) {
      const { campaignId } = await startOrchestration(orchestratorInput)
      return ok({ campaignId, background: true }, { warnings: warnings.length ? warnings : undefined })
    }
    const result = await orchestrate(orchestratorInput)
    return ok(result, { warnings: warnings.length ? warnings : undefined })
  } catch (err) {
    return wrapError('api.orchestrate-raw', err)
  }
}
