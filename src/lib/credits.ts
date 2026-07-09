// Credits engine - org-level wallet, atomic debit/grant, usage metering.
// Credits belong to the Organization (company), so teammates share one balance.

import { db } from '@/lib/db'

// ===== Pricing (credits per action) =====
export const CREDIT_COSTS = {
  scrape: 2,
  keywords: 1,
  competitors: 2,
  listing: 3,
  angles: 3,
  image: 5,
  video: 40,
} as const

export type UsageKind = keyof typeof CREDIT_COSTS

export function costOf(kind: UsageKind, quantity = 1): number {
  return CREDIT_COSTS[kind] * quantity
}

export class InsufficientCreditsError extends Error {
  constructor(public required: number, public available: number) {
    super(`Insufficient credits: need ${required}, have ${available}`)
    this.name = 'InsufficientCreditsError'
  }
}

// ===== Wallet (per organization) =====

export async function getOrCreateWallet(orgId: string) {
  const existing = await db.wallet.findUnique({ where: { orgId } })
  if (existing) return existing
  return db.wallet.create({ data: { orgId, balance: 0 } })
}

export async function getBalance(orgId: string): Promise<number> {
  const w = await db.wallet.findUnique({ where: { orgId } })
  return w?.balance ?? 0
}

// Grant credits (trial, top-up, refund, admin adjustment).
export async function grantCredits(
  orgId: string,
  amount: number,
  type: 'grant' | 'topup' | 'refund' | 'adjustment',
  reason?: string,
  metadata?: any,
) {
  return db.$transaction(async (tx) => {
    let wallet = await tx.wallet.findUnique({ where: { orgId } })
    if (!wallet) wallet = await tx.wallet.create({ data: { orgId, balance: 0 } })
    const balanceAfter = wallet.balance + amount
    const updated = await tx.wallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } })
    await tx.creditTransaction.create({ data: { walletId: wallet.id, amount, type, reason, balanceAfter, metadata } })
    return updated
  })
}

// Debit for a billable action + record a usage event. Atomic; throws if broke.
export async function debitForUsage(params: {
  orgId?: string | null
  userId?: string | null
  kind: UsageKind
  quantity?: number
  campaignId?: string | null
  provider?: string | null
  model?: string | null
  meta?: any
}): Promise<{ charged: number; balanceAfter: number | null }> {
  const quantity = params.quantity ?? 1
  const charged = costOf(params.kind, quantity)

  // No org context (anonymous/system) - metered but not charged.
  if (!params.orgId) {
    await db.usageEvent.create({
      data: {
        userId: params.userId ?? undefined,
        kind: params.kind,
        credits: 0,
        provider: params.provider ?? undefined,
        model: params.model ?? undefined,
        campaignId: params.campaignId ?? undefined,
        meta: params.meta,
      },
    })
    return { charged: 0, balanceAfter: null }
  }

  const orgId = params.orgId

  // COMPLETELY FREE during the 7-day trial: meter usage but never deduct or block.
  const org = await db.organization.findUnique({ where: { id: orgId } })
  if (org && isTrialActive({ plan: org.plan, trialEndsAt: org.trialEndsAt })) {
    await db.usageEvent.create({
      data: {
        userId: params.userId ?? undefined,
        orgId,
        kind: params.kind,
        credits: 0,
        provider: params.provider ?? undefined,
        model: params.model ?? undefined,
        campaignId: params.campaignId ?? undefined,
        meta: { ...params.meta, freeTrial: true },
      },
    })
    return { charged: 0, balanceAfter: null }
  }

  const result = await db.$transaction(async (tx) => {
    let wallet = await tx.wallet.findUnique({ where: { orgId } })
    if (!wallet) wallet = await tx.wallet.create({ data: { orgId, balance: 0 } })
    if (wallet.balance < charged) throw new InsufficientCreditsError(charged, wallet.balance)
    const balanceAfter = wallet.balance - charged
    await tx.wallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter, lifetimeSpent: { increment: charged } } })
    await tx.creditTransaction.create({
      data: { walletId: wallet.id, amount: -charged, type: 'debit', reason: params.kind, balanceAfter, metadata: params.meta },
    })
    await tx.usageEvent.create({
      data: {
        userId: params.userId ?? undefined,
        orgId,
        kind: params.kind,
        credits: charged,
        provider: params.provider ?? undefined,
        model: params.model ?? undefined,
        campaignId: params.campaignId ?? undefined,
        meta: params.meta,
      },
    })
    return { charged, balanceAfter }
  })

  // Automated low-credit alert (fires once, on crossing the threshold).
  void maybeLowCreditAlert(orgId, result.balanceAfter + result.charged, result.balanceAfter)
  return result
}

const LOW_CREDIT_THRESHOLD = 50
async function maybeLowCreditAlert(orgId: string, before: number, after: number) {
  try {
    if (!(before >= LOW_CREDIT_THRESHOLD && after < LOW_CREDIT_THRESHOLD)) return
    const owner = await db.user.findFirst({ where: { orgId, role: 'owner' } })
    if (!owner?.email) return
    const { sendEmail, lowCreditsEmail } = await import('@/lib/email')
    const { subject, html, text } = lowCreditsEmail(after)
    await sendEmail({ to: owner.email, subject, html, text })
  } catch {
    /* best-effort */
  }
}

// ===== Plan / trial state (org-level) =====

type OrgLike = { plan: string; trialEndsAt: Date | null }

export function isTrialActive(org: OrgLike): boolean {
  return org.plan === 'trial' && !!org.trialEndsAt && org.trialEndsAt.getTime() > Date.now()
}

export function planStatus(org: OrgLike, balance: number) {
  const trialActive = isTrialActive(org)
  const trialDaysLeft = org.trialEndsAt
    ? Math.max(0, Math.ceil((org.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0
  const paid = ['pro', 'agency'].includes(org.plan)
  const canGenerate = paid || trialActive || balance > 0
  return { trialActive, trialDaysLeft, paid, canGenerate, balance }
}
