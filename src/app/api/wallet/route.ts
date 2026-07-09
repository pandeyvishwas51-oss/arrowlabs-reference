import { NextRequest } from 'next/server'
import { ok, requireActor, wrapError } from '@/lib/api'
import { db } from '@/lib/db'
import { getOrCreateWallet } from '@/lib/credits'

// Wallet balance + recent ledger for the signed-in user.
export async function GET(req: NextRequest) {
  const res = await requireActor(req)
  if ('error' in res) return res.error
  if (!res.actor.orgId) return ok({ balance: 0, transactions: [], plan: res.actor.plan })
  try {
    const wallet = await getOrCreateWallet(res.actor.orgId)
    const transactions = await db.creditTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return ok({
      balance: wallet.balance,
      lifetimeSpent: wallet.lifetimeSpent,
      plan: res.actor.plan,
      domain: res.actor.domain,
      trialDaysLeft: res.actor.trialDaysLeft,
      transactions,
    })
  } catch (err) {
    return wrapError('api.wallet', err)
  }
}
