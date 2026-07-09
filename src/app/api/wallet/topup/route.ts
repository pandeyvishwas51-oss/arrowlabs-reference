import { NextRequest } from 'next/server'
import { z } from 'zod'
import { ok, fail, parseBody, requireActor, wrapError } from '@/lib/api'
import { config } from '@/lib/config'
import { grantCredits } from '@/lib/credits'
import { isRazorpayConfigured, createOrder } from '@/lib/razorpay'

const schema = z.object({ credits: z.number().int().min(1).max(100000) })

// Start a credit top-up.
//  - Razorpay configured -> create an order; client opens Razorpay Checkout, then
//    calls /api/wallet/verify. Credits are granted on verified payment (+ webhook).
//  - Not configured (dev) -> grant immediately so the wallet flow is testable.
export async function POST(req: NextRequest) {
  const res = await requireActor(req)
  if ('error' in res) return res.error
  if (!res.actor.orgId) return fail('No organization on this account.', 400)

  const parsed = await parseBody(req, schema)
  if ('error' in parsed) return parsed.error
  const { credits } = parsed.data
  const amountPaise = credits * config.billing.creditPricePaise

  try {
    if (isRazorpayConfigured()) {
      const order = await createOrder({ amountPaise, credits, orgId: res.actor.orgId, userId: res.actor.userId })
      return ok({
        provider: 'razorpay',
        keyId: config.billing.razorpay.keyId,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        credits,
        name: 'ArrowLabs',
        description: `${credits} credits`,
        prefillEmail: res.actor.email,
      })
    }

    // Dev fallback - no billing configured. Never allowed in production.
    if (config.app.nodeEnv === 'production') {
      return fail('Billing is not configured. Add Razorpay keys to enable top-ups.', 503)
    }
    const wallet = await grantCredits(res.actor.orgId, credits, 'topup', 'Dev top-up (no billing configured)', { amountPaise })
    return ok({ granted: credits, balance: wallet.balance, dev: true })
  } catch (err) {
    return wrapError('api.wallet.topup', err)
  }
}
