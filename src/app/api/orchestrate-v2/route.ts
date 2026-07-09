// Parallel v2 route: runs the new engine (src/core) instead of the legacy
// orchestrator. It is ADDITIVE. The live /api/orchestrate is untouched and stays
// the default. This route is disabled unless ENGINE_V2=1, so it can never be hit
// by accident. It writes the same Campaign + Asset rows the studio already reads,
// so no UI change is needed to view results.

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { run, type Ctx, type ProgressReporter, type RunPlan, type Stage } from '@/core'
import { bootAppEngine } from '@/lib/engine'
import { ok, fail, parseBody, guardRate, requireActor, wrapError } from '@/lib/api'
import { db } from '@/lib/db'

export const maxDuration = 300

const schema = z.object({
  asin: z.string().trim().min(1),
  region: z.enum(['IN', 'GCC']).optional(),
  platform: z.enum(['amazon_in', 'flipkart', 'myntra', 'noon', 'namshi']).optional(),
  sourcePlatform: z.enum(['amazon_in', 'flipkart', 'myntra', 'noon', 'namshi']).optional(),
  labs: z.array(z.enum(['ListingLab', 'APlusLab', 'AngleLab', 'PhotoLab', 'VideoLab'])).optional(),
  counts: z
    .object({
      lifestyle: z.number().int().min(0).max(4).optional(),
      infographic: z.number().int().min(0).max(4).optional(),
      detail: z.number().int().min(0).max(4).optional(),
      dimension: z.number().int().min(0).max(2).optional(),
      productPhoto: z.number().int().min(0).max(6).optional(),
      aPlus: z.number().int().min(0).max(7).optional(),
      video: z.number().int().min(0).max(2).optional(),
    })
    .optional(),
})

// Translate the studio's counts object into per-engine-kind counts.
function engineCounts(c?: {
  lifestyle?: number
  infographic?: number
  detail?: number
  dimension?: number
  productPhoto?: number
  aPlus?: number
  video?: number
}): Record<string, number> {
  return {
    'image.hero': 1,
    'image.lifestyle': c?.lifestyle ?? 2,
    'image.infographic': c?.infographic ?? 2,
    'image.dimension': c?.dimension ?? 1,
    'image.detail': c?.detail ?? 2,
    'image.product': c?.productPhoto ?? 1,
    aplus: c?.aPlus ?? 7,
    video: c?.video ?? 1,
    listing: 1,
  }
}

// Map the requested labs to the engine's asset kinds.
function kindsFor(labs: string[]): string[] {
  const kinds: string[] = []
  if (labs.includes('ListingLab')) kinds.push('listing')
  if (labs.includes('PhotoLab')) {
    kinds.push('image.hero', 'image.lifestyle', 'image.infographic', 'image.dimension', 'image.detail', 'image.product')
  }
  if (labs.includes('APlusLab')) kinds.push('aplus') // no generator yet -> safely skipped
  if (labs.includes('VideoLab')) kinds.push('video')
  return kinds.length ? kinds : ['listing']
}

// Map an engine asset kind to the legacy Asset row shape.
function toAssetRow(kind: string): { type: string; lab: string; isVideo: boolean } {
  switch (kind) {
    case 'image.hero':
      return { type: 'main_image', lab: 'PhotoLab', isVideo: false }
    case 'image.product':
      return { type: 'product_photo', lab: 'PhotoLab', isVideo: false }
    case 'image.lifestyle':
      return { type: 'lifestyle', lab: 'PhotoLab', isVideo: false }
    case 'image.infographic':
      return { type: 'infographic', lab: 'PhotoLab', isVideo: false }
    case 'image.dimension':
      return { type: 'dimension', lab: 'PhotoLab', isVideo: false }
    case 'image.detail':
      return { type: 'detail', lab: 'PhotoLab', isVideo: false }
    case 'aplus':
      return { type: 'a_plus_module', lab: 'APlusLab', isVideo: false }
    case 'video':
      return { type: 'product_video', lab: 'VideoLab', isVideo: true }
    default:
      return { type: kind, lab: 'PhotoLab', isVideo: false }
  }
}

const STAGE_BASE: Record<Stage, number> = {
  ingest: 5,
  intelligence: 20,
  assemble: 32,
  generate: 40,
  validate: 96,
  publish: 98,
}

// Run the engine in the background and persist results as the studio polls.
async function runInBackground(campaignId: string, plan: RunPlan, orgId: string | null, userId: string | null) {
  const log = {
    debug: () => {},
    info: (m: string) => console.log('[engine]', m),
    warn: (m: string) => console.warn('[engine]', m),
    error: (m: string) => console.error('[engine]', m),
  }
  const ctx: Ctx = { orgId: orgId ?? 'anon', userId: userId ?? undefined, campaignId, log, now: () => new Date() }

  const progress: ProgressReporter = {
    stage(stage, percent, note) {
      const base = STAGE_BASE[stage] ?? 0
      const span = stage === 'generate' ? 56 : 6
      const overall = Math.min(99, Math.round(base + (percent / 100) * span))
      db.campaign
        .update({ where: { id: campaignId }, data: { progress: { percent: overall, stage, note } as any } })
        .catch(() => {})
    },
  }

  try {
    const { listing, assets } = await run(plan, ctx, () => crypto.randomUUID(), progress)

    // The listing copy lands on the campaign, not as an Asset row (matches v1).
    const listingAsset = assets.find((a) => a.kind === 'listing')
    if (listingAsset) {
      await db.campaign
        .update({ where: { id: campaignId }, data: { listing: listingAsset.meta as any, productName: listing.product.title } })
        .catch(() => {})
    }

    // Persist every non-listing asset as a legacy Asset row.
    for (const a of assets) {
      if (a.kind === 'listing') continue
      const row = toAssetRow(a.kind)
      await db.asset
        .create({
          data: {
            campaignId,
            type: row.type,
            lab: row.lab,
            status: a.validationStatus === 'failed' ? 'failed' : 'completed',
            imageUrl: row.isVideo ? null : a.url || null,
            videoUrl: row.isVideo ? a.url || null : null,
            metadata: a.meta as any,
          },
        })
        .catch((e) => console.error('[engine] asset persist failed', e))
    }

    await db.campaign
      .update({ where: { id: campaignId }, data: { status: 'completed', scrapedData: listing.product as any, progress: { percent: 100, stage: 'done' } as any } })
      .catch(() => {})
  } catch (err) {
    await db.campaign
      .update({ where: { id: campaignId }, data: { status: 'failed', error: String(err).slice(0, 500) } })
      .catch(() => {})
  }
}

export async function POST(req: NextRequest) {
  if (process.env.ENGINE_V2 !== '1') return fail('v2 engine is disabled (set ENGINE_V2=1 to enable)', 404)

  const limited = guardRate(req, 'orchestrate')
  if (limited) return limited

  const parsed = await parseBody(req, schema)
  if ('error' in parsed) return parsed.error
  const body = parsed.data

  const kinds = kindsFor(body.labs ?? ['ListingLab'])
  const needGenerate = kinds.some((k) => k.startsWith('image.') || k === 'video')

  const res = await requireActor(req, { needGenerate })
  if ('error' in res) return res.error
  const { userId, orgId } = res.actor

  bootAppEngine()

  const targetPlatform = body.platform || 'amazon_in'
  const sourcePlatform = body.sourcePlatform || (targetPlatform.startsWith('amazon') ? targetPlatform : 'amazon_in')

  const plan: RunPlan = {
    source: { platform: sourcePlatform, externalId: body.asin.trim(), region: body.region },
    targetPlatform,
    // Brand identity is keyed on the org today (one brand per org); the brand
    // builder loads colors, fonts, and voice from it. Safe when absent.
    brandId: orgId ?? undefined,
    labs: kinds,
    counts: engineCounts(body.counts),
    maxValidationRetries: 2,
  }

  try {
    const campaign = await db.campaign.create({
      data: {
        asin: body.asin.trim().toUpperCase(),
        marketplace: body.region || 'US',
        status: 'generating',
        source: 'studio',
        userId: userId ?? undefined,
        orgId: orgId ?? undefined,
        progress: { percent: 0, stage: 'queued' } as any,
      },
    })

    // Fire and forget: the engine runs in the background, the client polls the campaign.
    void runInBackground(campaign.id, plan, orgId, userId)

    return ok({ campaignId: campaign.id, background: true, engine: 'v2' })
  } catch (err) {
    return wrapError('api.orchestrate-v2', err)
  }
}
