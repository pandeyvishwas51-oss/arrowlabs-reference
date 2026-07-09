// Shared API helpers - consistent JSON envelope, zod validation, rate limiting,
// and actor/access guards. Every route returns { ok, data?, error? }.

import { NextResponse } from 'next/server'
import { ZodSchema } from 'zod'
import { resolveActor, type Actor } from '@/lib/session'
import { rateLimit, clientKey, maybePrune } from '@/lib/ratelimit'
import { logError } from '@/lib/logger'

export function ok(data?: any, extra?: Record<string, any>) {
  return NextResponse.json({ ok: true, ...(data !== undefined ? { data } : {}), ...extra })
}

export function fail(error: string, status = 400, extra?: Record<string, any>) {
  return NextResponse.json({ ok: false, error, ...extra }, { status })
}

export async function parseBody<T>(req: Request, schema: ZodSchema<T>): Promise<{ data: T } | { error: NextResponse }> {
  const body = await req.json().catch(() => ({}))
  const result = schema.safeParse(body)
  if (!result.success) {
    const msg = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    return { error: fail(`Invalid input: ${msg}`, 422) }
  }
  return { data: result.data }
}

// Enforce a per-client rate limit. Returns a 429 NextResponse if exceeded.
export function guardRate(req: Request, suffix = '', limit?: number): NextResponse | null {
  maybePrune()
  const rl = rateLimit(clientKey(req, suffix), limit)
  if (!rl.ok) {
    return fail(`Rate limit exceeded. Try again in ${Math.ceil(rl.retryAfterMs / 1000)}s.`, 429)
  }
  return null
}

// Require a signed-in user or valid API key. Optionally require generation access
// (active trial or positive balance). Returns the Actor or an error NextResponse.
export async function requireActor(
  req: Request,
  opts: { needGenerate?: boolean } = {},
): Promise<{ actor: Actor } | { error: NextResponse }> {
  const actor = await resolveActor(req)
  if (!actor) return { error: fail('Authentication required. Sign in or provide an API key.', 401) }
  if (opts.needGenerate && !actor.canGenerate) {
    return {
      error: fail(
        'No generation access. Your trial has ended and your credit balance is 0. Top up to continue.',
        402,
        { code: 'insufficient_access', balance: actor.balance },
      ),
    }
  }
  return { actor }
}

export async function requireAdmin(req: Request): Promise<{ actor: Actor } | { error: NextResponse }> {
  const res = await requireActor(req)
  if ('error' in res) return res
  if (res.actor.role !== 'admin') return { error: fail('Admin access required.', 403) }
  return res
}

export function wrapError(context: string, err: unknown): NextResponse {
  void logError(context, err)
  // Respect an explicit status set on the error (e.g. 404 for "product not
  // found", 503 for "AI service briefly at capacity") instead of a blanket 500.
  const status = (err as any)?.status
  const code = typeof status === 'number' && status >= 400 && status < 600 ? status : 500
  return fail(err instanceof Error ? err.message : 'Unknown error', code)
}
