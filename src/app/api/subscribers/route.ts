import { NextRequest } from 'next/server'
import { ok, fail, requireAdmin, wrapError } from '@/lib/api'
import { db } from '@/lib/db'

// GET: list subscribers (admin only).
export async function GET(req: NextRequest) {
  const res = await requireAdmin(req)
  if ('error' in res) return res.error
  try {
    const subscribers = await db.subscriber.findMany({ orderBy: { createdAt: 'desc' }, take: 500 })
    return ok(subscribers, { count: subscribers.length })
  } catch (err) {
    return wrapError('api.subscribers.list', err)
  }
}

// DELETE ?email=... : unsubscribe (admin only).
export async function DELETE(req: NextRequest) {
  const res = await requireAdmin(req)
  if ('error' in res) return res.error
  const email = new URL(req.url).searchParams.get('email')?.trim().toLowerCase()
  if (!email) return fail('email required', 400)
  try {
    await db.subscriber.updateMany({ where: { email }, data: { status: 'unsubscribed' } })
    return ok({ unsubscribed: email })
  } catch (err) {
    return wrapError('api.subscribers.delete', err)
  }
}
