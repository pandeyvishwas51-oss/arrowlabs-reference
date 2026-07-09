import { NextRequest } from 'next/server'
import { z } from 'zod'
import { ok, fail, parseBody, guardRate, wrapError } from '@/lib/api'
import { db } from '@/lib/db'
import { isCompanyEmail } from '@/lib/domains'
import { hashPassword, verifyPassword, createSession } from '@/lib/password'
import { provisionUserOrg } from '@/lib/org'
import { config } from '@/lib/config'
import { sendEmail, welcomeEmail } from '@/lib/email'
import { track } from '@/lib/analytics'

const schema = z.object({
  action: z.enum(['login', 'register']),
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
  name: z.string().trim().max(120).optional(),
})

// Email + password login / registration. Company-domain only (same gate as
// magic-link). On success, sets a database session cookie and returns the user.
export async function POST(req: NextRequest) {
  const limited = guardRate(req, 'password')
  if (limited) return limited

  const parsed = await parseBody(req, schema)
  if ('error' in parsed) return parsed.error
  const { action, email, password, name } = parsed.data
  const addr = email.toLowerCase()

  if (!isCompanyEmail(addr)) {
    return fail('Please use your company email. Personal inboxes are not supported.', 422)
  }

  try {
    if (action === 'register') {
      const existing = await db.user.findUnique({ where: { email: addr } })
      if (existing?.passwordHash) return fail('An account with this email already exists. Try logging in.', 409)

      const user = existing
        ? await db.user.update({ where: { id: existing.id }, data: { passwordHash: hashPassword(password), name: name || existing.name } })
        : await db.user.create({ data: { email: addr, name, passwordHash: hashPassword(password), emailVerified: new Date() } })

      // Provision company org + trial (once per domain) if not already linked.
      if (!user.orgId) {
        const isAdmin = config.auth.adminEmails.includes(addr)
        if (isAdmin) await db.user.update({ where: { id: user.id }, data: { role: 'admin' } })
        const { isNewOrg } = await provisionUserOrg(user.id, addr)
        if (isNewOrg) {
          const { subject, html, text } = welcomeEmail(config.billing.trialDays, config.billing.trialCredits)
          await sendEmail({ to: addr, subject, html, text })
        }
      }

      await track({ type: 'signup', userId: user.id, orgId: user.orgId, meta: { method: 'password' } })
      const res = ok({ email: addr, registered: true })
      return createSession(user.id, res)
    }

    // login
    const user = await db.user.findUnique({ where: { email: addr } })
    if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      return fail('Invalid email or password.', 401)
    }
    await track({ type: 'signin', userId: user.id, orgId: user.orgId, meta: { method: 'password' } })
    const res = ok({ email: addr, loggedIn: true })
    return createSession(user.id, res)
  } catch (err) {
    return wrapError('api.auth.password', err)
  }
}
