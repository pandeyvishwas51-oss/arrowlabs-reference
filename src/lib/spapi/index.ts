// Amazon Selling Partner API - push an optimized listing to Seller Central.
// Uses LWA (Login with Amazon) refresh-token grant for the access token, then
// PATCHes the Listings Items API. Requires the seller's SP-API app credentials
// (SPAPI_* env). Without them, isConfigured() is false and the UI shows setup.

import { config } from '@/lib/config'

export function isSpapiConfigured(): boolean {
  const s = config.spapi
  return !!(s.clientId && s.clientSecret && s.refreshToken && s.sellerId)
}

let tokenCache: { token: string; exp: number } | null = null

async function getAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.exp > Date.now() + 60_000) return tokenCache.token
  const s = config.spapi
  const res = await fetch('https://api.amazon.com/auth/o2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: s.refreshToken,
      client_id: s.clientId,
      client_secret: s.clientSecret,
    }),
  })
  if (!res.ok) throw new Error(`LWA token failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  tokenCache = { token: data.access_token, exp: Date.now() + (data.expires_in || 3600) * 1000 }
  return tokenCache.token
}

export type PushListingInput = {
  sku: string // the seller SKU for this ASIN (required by the Listings API)
  title?: string
  bullets?: string[]
  description?: string
}

// PATCH the listing's editable attributes. Returns the submission result.
export async function pushListing(input: PushListingInput): Promise<{ ok: boolean; submissionId?: string; error?: string }> {
  if (!isSpapiConfigured()) {
    return { ok: false, error: 'SP-API not configured. Add SPAPI_* credentials to enable 1-click push.' }
  }
  try {
    const token = await getAccessToken()
    const s = config.spapi
    const patches: any[] = []
    if (input.title) patches.push({ op: 'replace', path: '/attributes/item_name', value: [{ value: input.title, marketplace_id: s.marketplaceId }] })
    if (input.bullets?.length) patches.push({ op: 'replace', path: '/attributes/bullet_point', value: input.bullets.map((v) => ({ value: v, marketplace_id: s.marketplaceId })) })
    if (input.description) patches.push({ op: 'replace', path: '/attributes/product_description', value: [{ value: input.description, marketplace_id: s.marketplaceId }] })
    if (!patches.length) return { ok: false, error: 'Nothing to push.' }

    const url = `${s.endpoint}/listings/2021-08-01/items/${s.sellerId}/${encodeURIComponent(input.sku)}?marketplaceIds=${s.marketplaceId}`
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-amz-access-token': token },
      body: JSON.stringify({ productType: 'PRODUCT', patches }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: `SP-API ${res.status}: ${JSON.stringify(data).slice(0, 300)}` }
    return { ok: true, submissionId: data.submissionId }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'push failed' }
  }
}
