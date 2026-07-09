import { NextRequest } from 'next/server'
import { ok, guardRate } from '@/lib/api'
import { track } from '@/lib/analytics'
import { resolveActor } from '@/lib/session'

// Public page-view beacon. Called by the client PageTracker on route changes.
export async function POST(req: NextRequest) {
  const limited = guardRate(req, 'track', 120)
  if (limited) return ok({ skipped: true }) // never error the beacon
  const body = await req.json().catch(() => ({}))
  const path = typeof body.path === 'string' ? body.path.slice(0, 300) : undefined
  const actor = await resolveActor(req).catch(() => null)
  await track({
    type: 'pageview',
    path,
    userId: actor?.userId,
    orgId: actor?.orgId,
    referrer: (body.referrer || '').toString().slice(0, 300) || undefined,
    ua: req.headers.get('user-agent')?.slice(0, 300),
  })
  return ok({ tracked: true })
}
