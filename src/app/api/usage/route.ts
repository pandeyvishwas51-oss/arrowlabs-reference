import { NextRequest } from 'next/server'
import { ok, requireActor, wrapError } from '@/lib/api'
import { db } from '@/lib/db'

// GET: usage events. Users see their own; admins can pass ?all=1 for everyone.
export async function GET(req: NextRequest) {
  const res = await requireActor(req)
  if ('error' in res) return res.error
  const all = new URL(req.url).searchParams.get('all') === '1' && res.actor.role === 'admin'
  try {
    // Usage is org-level (whole company shares the wallet).
    const where = all ? {} : res.actor.orgId ? { orgId: res.actor.orgId } : { userId: res.actor.userId }
    const [events, byKind] = await Promise.all([
      db.usageEvent.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 }),
      db.usageEvent.groupBy({ by: ['kind'], where, _sum: { credits: true }, _count: true }),
    ])
    return ok({ events, byKind })
  } catch (err) {
    return wrapError('api.usage', err)
  }
}
