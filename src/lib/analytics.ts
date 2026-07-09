// Lightweight analytics - records traffic + auth events. Best-effort (never
// throws into the request path).

import { db } from '@/lib/db'

type EventInput = {
  type: 'pageview' | 'signin' | 'signup' | 'logout' | 'api'
  userId?: string | null
  orgId?: string | null
  path?: string | null
  referrer?: string | null
  ua?: string | null
  meta?: any
}

export async function track(e: EventInput) {
  try {
    await db.event.create({
      data: {
        type: e.type,
        userId: e.userId ?? undefined,
        orgId: e.orgId ?? undefined,
        path: e.path ?? undefined,
        referrer: e.referrer ?? undefined,
        ua: e.ua ?? undefined,
        meta: e.meta,
      },
    })
  } catch {
    /* swallow */
  }
}
