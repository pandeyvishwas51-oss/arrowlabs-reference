import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireActor, wrapError } from '@/lib/api'

// List the signed-in actor's campaigns (org-scoped). Also opportunistically marks
// stale in-flight jobs (no update for >15 min — e.g. killed by a deploy) as failed
// so they don't show as "generating" forever or leak across accounts.
export async function GET(req: NextRequest) {
  const res = await requireActor(req)
  if ('error' in res) return res.error
  const scope = res.actor.orgId ? { orgId: res.actor.orgId } : { userId: res.actor.userId }

  try {
    const staleBefore = new Date(Date.now() - 15 * 60 * 1000)
    await db.campaign
      .updateMany({
        where: { ...scope, status: { in: ['scraping', 'generating'] }, updatedAt: { lt: staleBefore } },
        data: { status: 'failed', error: 'Job stalled (timed out or interrupted).' },
      })
      .catch(() => {})

    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (id) {
      const campaign = await db.campaign.findFirst({ where: { id, ...scope }, include: { assets: true, keywords: true } })
      if (!campaign) return fail('Campaign not found', 404)
      return ok(campaign)
    }

    const campaigns = await db.campaign.findMany({
      where: scope,
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, asin: true, productName: true, status: true, createdAt: true, updatedAt: true, _count: { select: { assets: true, keywords: true } } },
    })
    return ok(campaigns)
  } catch (err) {
    return wrapError('api.campaigns.list', err)
  }
}
