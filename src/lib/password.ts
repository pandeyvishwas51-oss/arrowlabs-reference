// Email + password auth that coexists with NextAuth's magic-link (database
// sessions). We can't use NextAuth's Credentials provider here because it forces
// JWT sessions and would conflict with the Email provider's database sessions.
// Instead we verify credentials ourselves and create a real database Session row
// + the standard next-auth session cookie, which getServerSession then resolves.

import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { config } from '@/lib/config'

const SESSION_DAYS = 30

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const derived = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${derived}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, key] = stored.split(':')
  if (!salt || !key) return false
  const derived = scryptSync(password, salt, 64)
  const keyBuf = Buffer.from(key, 'hex')
  return keyBuf.length === derived.length && timingSafeEqual(keyBuf, derived)
}

// Cookie name matches NextAuth defaults so getServerSession picks it up.
export function sessionCookieName(): string {
  return config.app.nodeEnv === 'production'
    ? '__Secure-next-auth.session-token'
    : 'next-auth.session-token'
}

// Create a DB session for a user and attach the session cookie to a response.
export async function createSession(userId: string, res: NextResponse): Promise<NextResponse> {
  const sessionToken = randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
  await db.session.create({ data: { sessionToken, userId, expires } })
  res.cookies.set(sessionCookieName(), sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: config.app.nodeEnv === 'production',
    expires,
  })
  return res
}
