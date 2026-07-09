import { NextRequest } from 'next/server'
import { z } from 'zod'
import { ok, fail, parseBody, requireActor, wrapError } from '@/lib/api'
import { verifyPaymentSignature, grantTopupOnce, isRazorpayConfigured } from '@/lib/razorpay'

const schema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
  credits: z.number().int().min(1).max(100000),
})

// Called by the client after Razorpay Checkout succeeds. Verifies the signature
// and grants credits to the org (idempotent - the webhook is the backstop).
export async function POST(req: NextRequest) {
  const res = await requireActor(req)
  if ('error' in res) return res.error
  if (!res.actor.orgId) return fail('No organization on this account.', 400)
  if (!isRazorpayConfigured()) return fail('Billing not configured.', 503)

  const parsed = await parseBody(req, schema)
  if ('error' in parsed) return parsed.error
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, credits } = parsed.data

  if (!verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    return fail('Payment signature verification failed.', 400)
  }

  try {
    const result = await grantTopupOnce({
      orgId: res.actor.orgId,
      paymentId: razorpay_payment_id,
      credits,
      source: 'verify',
    })
    return ok({ granted: result.granted, balance: result.balance })
  } catch (err) {
    return wrapError('api.wallet.verify', err)
  }
}
