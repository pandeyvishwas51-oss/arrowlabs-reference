import { NextRequest } from 'next/server'
import { ok, fail } from '@/lib/api'
import { config } from '@/lib/config'
import { verifyWebhookSignature, grantTopupOnce } from '@/lib/razorpay'
import { db } from '@/lib/db'
import { logError } from '@/lib/logger'

// Razorpay webhook - backstop that grants credits on payment.captured even if the
// client-side verify call never lands. Idempotent with /api/wallet/verify.
export async function POST(req: NextRequest) {
  const raw = await req.text()
  const signature = req.headers.get('x-razorpay-signature') || ''
  const secret = config.billing.razorpay.webhookSecret

  if (!secret) {
    // Not configured yet - acknowledge so Razorpay doesn't retry.
    return ok({ received: true, stub: true, note: 'Razorpay webhook secret not configured.' })
  }
  if (!verifyWebhookSignature(raw, signature)) return fail('Invalid signature', 400)

  try {
    const event = JSON.parse(raw)
    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const entity = event.payload?.payment?.entity || {}
      const notes = entity.notes || {}
      let orgId = notes.orgId as string | undefined
      if (!orgId && notes.userId) {
        const user = await db.user.findUnique({ where: { id: notes.userId } })
        orgId = user?.orgId || undefined
      }
      const credits = parseInt(notes.credits || '0', 10)
      if (orgId && credits > 0 && entity.id) {
        await grantTopupOnce({ orgId, paymentId: entity.id, credits, source: 'webhook' })
      }
    }
    return ok({ received: true })
  } catch (err) {
    await logError('webhook.razorpay', err)
    return fail('Webhook processing failed', 500)
  }
}
