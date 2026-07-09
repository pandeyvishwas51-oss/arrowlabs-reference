// Actor resolution for API routes. An "actor" is either a signed-in user
// (NextAuth session) or a valid API key, always resolved to their Organization
// (which holds the wallet + plan). Billable routes require generation access.

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { verifyApiKey, extractApiKey } from '@/lib/apikeys'
import { getBalance, planStatus } from '@/lib/credits'
import { config } from '@/lib/config'

export type Actor = {
  userId: string
  orgId: string | null
  email: string
  role: string
  plan: string
  domain: string | null
  trialEndsAt: Date | null
  balance: number
  canGenerate: boolean
  trialDaysLeft: number
  via: 'session' | 'apikey'
}

export async function getSessionUser() {
  const session = await getServerSession(authOptions)
  return (session?.user as any) || null
}

async function actorFromUserId(userId: string, via: Actor['via']): Promise<Actor | null> {
  const user = await db.user.findUnique({ where: { id: userId }, include: { org: true } })
  if (!user) return null
  const org = user.org
  const balance = org ? await getBalance(org.id) : 0
  const status = planStatus({ plan: org?.plan || 'expired', trialEndsAt: org?.trialEndsAt || null }, balance)
  // Platform admin = DB role 'admin' OR email in ADMIN_EMAILS. Company "owner"
  // is a company role, NOT a platform admin (admin panel shows global data).
  const isPlatformAdmin = user.role === 'admin' || config.auth.adminEmails.includes(user.email.toLowerCase())
  return {
    userId: user.id,
    orgId: org?.id || null,
    email: user.email,
    role: isPlatformAdmin ? 'admin' : user.role,
    plan: org?.plan || 'expired',
    domain: org?.domain || null,
    trialEndsAt: org?.trialEndsAt || null,
    balance,
    canGenerate: status.canGenerate,
    trialDaysLeft: status.trialDaysLeft,
    via,
  }
}

// Resolve an actor directly from a raw API key string (used by the MCP server,
// which accepts the key in the URL path so remote clients like Claude — whose
// connector UI takes only a URL, no headers — can authenticate).
export async function actorFromApiKey(rawKey: string): Promise<Actor | null> {
  const verified = await verifyApiKey(rawKey)
  if (!verified) return null
  return actorFromUserId(verified.userId, 'apikey')
}

// Resolve the current actor from a request (API key wins if present, else session).
export async function resolveActor(req: Request): Promise<Actor | null> {
  const rawKey = extractApiKey(req)
  if (rawKey) {
    const verified = await verifyApiKey(rawKey)
    if (verified) return actorFromUserId(verified.userId, 'apikey')
  }
  const session = await getServerSession(authOptions)
  const uid = (session?.user as any)?.id
  if (uid) return actorFromUserId(uid, 'session')
  return null
}
