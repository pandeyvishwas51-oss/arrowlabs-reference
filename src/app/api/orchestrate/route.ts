import { NextRequest } from 'next/server'
import { z } from 'zod'
import { orchestrate, startOrchestration } from '@/lib/orchestrator'
import { getLLMProvider, getImageProvider, getVideoProvider } from '@/lib/config'
import { ok, fail, parseBody, guardRate, requireActor, wrapError } from '@/lib/api'
import { resolveActor } from '@/lib/session'

export const maxDuration = 300

const schema = z.object({
  asin: z.string().trim().min(1),
  marketplace: z.string().trim().optional(),
  targetAudience: z.string().trim().optional(),
  theme: z.string().trim().max(300).optional(),
  labs: z.array(z.enum(['ListingLab', 'APlusLab', 'AngleLab', 'PhotoLab', 'VideoLab'])).optional(),
  generateImages: z.boolean().optional(),
  generateVideo: z.boolean().optional(),
  videoStyle: z.enum(['ugc', 'overview']).optional(),
  subscriberId: z.string().optional(),
  region: z.enum(['IN', 'GCC']).optional(),
  platform: z.enum(['amazon_in', 'flipkart', 'myntra', 'noon', 'namshi']).optional(),
  sourcePlatform: z.enum(['amazon_in', 'flipkart', 'myntra', 'noon', 'namshi']).optional(),
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

  const asin = body.asin.toUpperCase()
  if (asin.length !== 10) return fail('ASIN must be 10 characters (e.g. B0CXYZ1234)', 400)

  const generateImages = body.generateImages ?? false
  const generateVideo = body.generateVideo ?? false

  // Generation (images/video) requires an actor with credits/trial. The fast
  // prompt-only path can run for a signed-in user (metered) or anonymously.
  let userId: string | null = null
  let orgId: string | null = null
  if (generateImages || generateVideo) {
    const res = await requireActor(req, { needGenerate: true })
    if ('error' in res) return res.error
    userId = res.actor.userId
    orgId = res.actor.orgId
  } else {
    const actor = await resolveActor(req)
    userId = actor?.userId ?? null
    orgId = actor?.orgId ?? null
  }

  const warnings: string[] = []
  if (!getLLMProvider()) warnings.push('No LLM provider configured - listing/angles skipped. Add AZURE_FOUNDRY_* (Sonnet) to .env')
  if (generateImages && !getImageProvider()) warnings.push('No image provider configured - image generation skipped.')
  if (generateVideo && !getVideoProvider()) warnings.push('No video provider configured - video generation skipped.')

  const orchestratorInput = {
    asin,
    marketplace: (body.marketplace || 'US').toUpperCase(),
    targetAudience: body.targetAudience,
    theme: body.theme,
    labs: body.labs,
    generateImages,
    generateVideo,
    videoStyle: body.videoStyle,
    userId,
    orgId,
    subscriberId: body.subscriberId,
    region: body.region,
    platform: body.platform,
    sourcePlatform: body.sourcePlatform,
    counts: body.counts,
  }
  try {
    // Generation runs as a background job (survives navigation) — return a
    // campaignId the client polls. The fast analyze-only path stays synchronous.
    if (generateImages || generateVideo) {
      const { campaignId } = await startOrchestration(orchestratorInput)
      return ok({ campaignId, background: true }, { warnings: warnings.length ? warnings : undefined })
    }
    const result = await orchestrate(orchestratorInput)
    return ok(result, { warnings: warnings.length ? warnings : undefined })
  } catch (err) {
    return wrapError('api.orchestrate', err)
  }
}
