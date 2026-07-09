// Razorpay integration - order creation, signature verification, and idempotent
// credit granting. Fully wired; activates the moment RAZORPAY_KEY_ID/SECRET are
// set in .env. Uses the REST API directly (no SDK dependency).

import { createHmac } from 'crypto'
import { config } from '@/lib/config'
import { db } from '@/lib/db'
import { grantCredits, getBalance } from '@/lib/credits'

export function isRazorpayConfigured(): boolean {
  return !!(config.billing.razorpay.keyId && config.billing.razorpay.keySecret)
}

function authHeader(): string {
  const { keyId, keySecret } = config.billing.razorpay
  return 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64')
}

export type RazorpayOrder = { id: string; amount: number; currency: string; status: string; receipt?: string }

// Create an order for a credit purchase. notes carry orgId/userId/credits so the
// webhook (and verify step) can attribute the grant.
export async function createOrder(params: {
  amountPaise: number
  credits: number
  orgId: string
  userId: string
}): Promise<RazorpayOrder> {
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: params.amountPaise,
      currency: 'INR',
      receipt: `credits_${params.orgId}_${params.credits}`,
      notes: { orgId: params.orgId, userId: params.userId, credits: String(params.credits) },
    }),
  })
  if (!res.ok) throw new Error(`Razorpay order error: ${res.status} ${await res.text()}`)
  return res.json()
}

// Verify the checkout callback signature: HMAC_SHA256(secret, order_id|payment_id).
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  const expected = createHmac('sha256', config.billing.razorpay.keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex')
  return timingSafeEqual(expected, signature)
}

// Verify a webhook body signature: HMAC_SHA256(webhookSecret, rawBody).
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const expected = createHmac('sha256', config.billing.razorpay.webhookSecret).update(rawBody).digest('hex')
  return timingSafeEqual(expected, signature)
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return mismatch === 0
}

// Grant credits for a payment exactly once (idempotent across verify + webhook).
export async function grantTopupOnce(params: {
  orgId: string
  paymentId: string
  credits: number
  source: 'verify' | 'webhook'
}): Promise<{ granted: boolean; balance: number }> {
  const wallet = await db.wallet.findUnique({ where: { orgId: params.orgId } })
  if (!wallet) return { granted: false, balance: 0 }

  // Idempotency: has this payment already been credited? (DB-agnostic JS scan -
  // top-up rows per org are few. Swap for a JSON-path filter on Postgres.)
  const topups = await db.creditTransaction.findMany({
    where: { walletId: wallet.id, type: 'topup' },
    select: { metadata: true },
  })
  const already = topups.some((t) => (t.metadata as any)?.razorpayPaymentId === params.paymentId)
  if (already) return { granted: false, balance: await getBalance(params.orgId) }

  const updated = await grantCredits(params.orgId, params.credits, 'topup', 'Razorpay top-up', {
    razorpayPaymentId: params.paymentId,
    source: params.source,
  })
  return { granted: true, balance: updated.balance }
}
