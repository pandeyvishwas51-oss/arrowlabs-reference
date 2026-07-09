// Simple in-memory sliding-window rate limiter (per key, e.g. IP or userId).
// Good enough for a single-node deploy; swap for Redis when scaling out.

import { config } from '@/lib/config'

const hits = new Map<string, number[]>()

export function rateLimit(
  key: string,
  limit: number = config.app.rateLimitPerMin,
  windowMs: number = 60_000,
): { ok: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now()
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs)
  if (arr.length >= limit) {
    const retryAfterMs = windowMs - (now - arr[0])
    hits.set(key, arr)
    return { ok: false, remaining: 0, retryAfterMs }
  }
  arr.push(now)
  hits.set(key, arr)
  return { ok: true, remaining: limit - arr.length, retryAfterMs: 0 }
}

export function clientKey(req: Request, suffix = ''): string {
  const fwd = req.headers.get('x-forwarded-for') || ''
  const ip = fwd.split(',')[0].trim() || req.headers.get('x-real-ip') || 'local'
  return `${ip}${suffix ? ':' + suffix : ''}`
}

// Occasionally prune to bound memory.
let lastPrune = Date.now()
export function maybePrune(windowMs = 60_000) {
  const now = Date.now()
  if (now - lastPrune < windowMs) return
  lastPrune = now
  for (const [k, arr] of hits) {
    const live = arr.filter((t) => now - t < windowMs)
    if (live.length) hits.set(k, live)
    else hits.delete(k)
  }
}
