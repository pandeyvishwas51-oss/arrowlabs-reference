import { NextRequest } from 'next/server'
import { z } from 'zod'
import { ok, fail, parseBody, requireActor, wrapError } from '@/lib/api'
import { db } from '@/lib/db'
import { domainOf, isCompanyEmail } from '@/lib/domains'
import { sendEmail, inviteEmail } from '@/lib/email'

// GET: list company members.
export async function GET(req: NextRequest) {
  const res = await requireActor(req)
  if ('error' in res) return res.error
  if (!res.actor.orgId) return fail('No organization.', 404)
  try {
    const members = await db.user.findMany({
      where: { orgId: res.actor.orgId },
      select: { id: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })
    return ok({ members, you: res.actor.userId })
  } catch (err) {
    return wrapError('api.org.members.get', err)
  }
}

// POST: invite a teammate by email (must share the company domain).
const inviteSchema = z.object({ email: z.string().trim().email() })
export async function POST(req: NextRequest) {
  const res = await requireActor(req)
  if ('error' in res) return res.error
  if (!res.actor.orgId || !res.actor.domain) return fail('No organization.', 404)
  if (!['owner', 'admin'].includes(res.actor.role)) return fail('Only the owner or an admin can invite.', 403)

  const parsed = await parseBody(req, inviteSchema)
  if ('error' in parsed) return parsed.error
  const email = parsed.data.email.toLowerCase()

  if (!isCompanyEmail(email)) return fail('Invitees must use a company email.', 422)
  if (domainOf(email) !== res.actor.domain) {
    return fail(`Invitees must be on the @${res.actor.domain} domain.`, 422)
  }

  try {
    const org = await db.organization.findUnique({ where: { id: res.actor.orgId } })
    const { subject, html, text } = inviteEmail(res.actor.email, org?.name || res.actor.domain)
    const sent = await sendEmail({ to: email, subject, html, text })
    return ok({ invited: email, emailSent: sent.ok, dev: sent.dev })
  } catch (err) {
    return wrapError('api.org.members.invite', err)
  }
}

// PATCH: role actions - promote | demote | transfer | remove (owner only).
const actionSchema = z.object({
  userId: z.string(),
  action: z.enum(['promote', 'demote', 'transfer', 'remove']),
})
export async function PATCH(req: NextRequest) {
  const res = await requireActor(req)
  if ('error' in res) return res.error
  if (!res.actor.orgId) return fail('No organization.', 404)
  if (res.actor.role !== 'owner') return fail('Only the company owner can manage roles.', 403)

  const parsed = await parseBody(req, actionSchema)
  if ('error' in parsed) return parsed.error
  const { userId, action } = parsed.data

  const target = await db.user.findFirst({ where: { id: userId, orgId: res.actor.orgId } })
  if (!target) return fail('Member not found in your company.', 404)
  if (target.id === res.actor.userId && action !== 'transfer') {
    return fail('You cannot change your own role here.', 400)
  }

  try {
    if (action === 'promote') await db.user.update({ where: { id: userId }, data: { role: 'admin' } })
    else if (action === 'demote') await db.user.update({ where: { id: userId }, data: { role: 'member' } })
    else if (action === 'remove') await db.user.delete({ where: { id: userId } })
    else if (action === 'transfer') {
      // Hand ownership to target; demote self to admin.
      await db.$transaction([
        db.user.update({ where: { id: userId }, data: { role: 'owner' } }),
        db.user.update({ where: { id: res.actor.userId }, data: { role: 'admin' } }),
      ])
    }
    return ok({ userId, action })
  } catch (err) {
    return wrapError('api.org.members.patch', err)
  }
}
