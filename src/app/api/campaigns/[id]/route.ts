import { NextRequest } from 'next/server'
import { ok, fail, requireActor, wrapError } from '@/lib/api'
import { db } from '@/lib/db'

// GET: everything the tool generated for one product (campaign), auth-scoped to
// the actor's org/user. Powers the "see all that the tool generated" detail view
// in Assets: listing (title/bullets/A+), keywords, angles, and every asset.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const res = await requireActor(req)
  if ('error' in res) return res.error
  const { id } = await params
  try {
    const scope = res.actor.orgId ? { orgId: res.actor.orgId } : { userId: res.actor.userId }
    const campaign = await db.campaign.findFirst({
      where: { id, ...scope },
      select: {
        id: true,
        asin: true,
        productName: true,
        status: true,
        createdAt: true,
        listing: true,
        angles: true,
        brandDna: true,
        progress: true,
        scrapedData: true,
        keywords: { select: { keyword: true, intent: true } },
        assets: {
          orderBy: { createdAt: 'desc' },
          select: { id: true, type: true, lab: true, imageUrl: true, videoUrl: true, status: true, promptJson: true },
        },
      },
    })
    if (!campaign) return fail('Not found', 404)
    return ok(campaign)
  } catch (err) {
    return wrapError('api.campaigns.detail', err)
  }
}
