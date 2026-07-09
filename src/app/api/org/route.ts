import { NextRequest } from 'next/server'
import { z } from 'zod'
import { ok, fail, parseBody, requireActor, wrapError } from '@/lib/api'
import { db } from '@/lib/db'
import { updateOrg } from '@/lib/org'

// GET: the current user's organization (company) profile + brand data + members.
export async function GET(req: NextRequest) {
  const res = await requireActor(req)
  if ('error' in res) return res.error
  if (!res.actor.orgId) return fail('No organization on this account.', 404)
  try {
    const org = await db.organization.findUnique({
      where: { id: res.actor.orgId },
      include: {
        wallet: true,
        users: { select: { id: true, email: true, role: true, createdAt: true } },
        _count: { select: { users: true } },
      },
    })
    return ok(org)
  } catch (err) {
    return wrapError('api.org.get', err)
  }
}

const schema = z.object({
  name: z.string().trim().max(120).optional(),
  website: z.string().trim().max(200).optional(),
  brandName: z.string().trim().max(120).optional(),
  brandData: z.record(z.string(), z.any()).optional(), // colors, voice, guidelines, etc.
})

// PATCH: save company / brand data (owner or admin only).
export async function PATCH(req: NextRequest) {
  const res = await requireActor(req)
  if ('error' in res) return res.error
  if (!res.actor.orgId) return fail('No organization on this account.', 404)
  if (!['owner', 'admin'].includes(res.actor.role)) return fail('Only the company owner or an admin can edit company settings.', 403)

  const parsed = await parseBody(req, schema)
  if ('error' in parsed) return parsed.error
  try {
    const org = await updateOrg(res.actor.orgId, parsed.data)
    return ok(org)
  } catch (err) {
    return wrapError('api.org.patch', err)
  }
}
