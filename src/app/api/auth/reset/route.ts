import { NextRequest } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'
import { ok, fail, parseBody, guardRate, wrapError } from '@/lib/api'
import { db } from '@/lib/db'
import { hashPassword, createSession } from '@/lib/password'
import { config } from '@/lib/config'
import { sendEmail, resetPasswordEmail } from '@/lib/email'

// Password reset: request a link, then confirm a new password with the token.
// Tokens are stored in VerificationToken under a "reset:<email>" identifier so
// no schema change is needed. Tokens are single-use and expire in 1 hour.
const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('request'), email: z.string().trim().email() }),
  z.object({
    action: z.literal('confirm'),
    email: z.string().trim().email(),
    token: z.string().min(10),
    password: z.string().min(8).max(200),
  }),
])

export async function POST(req: NextRequest) {
  const limited = guardRate(req, 'password')
  if (limited) return limited

  const parsed = await parseBody(req, schema)
  if ('error' in parsed) return parsed.error
  const body = parsed.data
  const addr = body.email.toLowerCase()
  const identifier = `reset:${addr}`

  try {
    if (body.action === 'request') {
      const user = await db.user.findUnique({ where: { email: addr } })
      // Only send for real accounts, but always return ok (don't leak existence).
      if (user) {
        const token = crypto.randomBytes(32).toString('hex')
        await db.verificationToken.deleteMany({ where: { identifier } }).catch(() => {})
        await db.verificationToken.create({
          data: { identifier, token, expires: new Date(Date.now() + 60 * 60 * 1000) },
        })
        const url = `${config.app.url}/reset?token=${token}&email=${encodeURIComponent(addr)}`
        const { subject, html, text } = resetPasswordEmail(url)
        await sendEmail({ to: addr, subject, html, text })
      }
      return ok({ sent: true })
    }

    // confirm
    const record = await db.verificationToken.findFirst({
      where: { identifier, token: body.token },
    })
    if (!record || record.expires < new Date()) {
      return fail('This reset link is invalid or has expired. Request a new one.', 400)
    }
    const user = await db.user.findUnique({ where: { email: addr } })
    if (!user) return fail('Account not found.', 404)

    await db.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(body.password) } })
    await db.verificationToken.deleteMany({ where: { identifier } }).catch(() => {})

    // Log them straight in after a successful reset.
    const res = ok({ reset: true, email: addr })
    return createSession(user.id, res)
  } catch (err) {
    return wrapError('api.auth.reset', err)
  }
}
