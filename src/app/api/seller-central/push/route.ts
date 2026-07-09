import { NextRequest } from 'next/server'
import { z } from 'zod'
import { ok, fail, parseBody, requireActor, wrapError } from '@/lib/api'
import { isSpapiConfigured, pushListing } from '@/lib/spapi'

const schema = z.object({
  sku: z.string().trim().min(1),
  title: z.string().trim().optional(),
  bullets: z.array(z.string()).optional(),
  description: z.string().trim().optional(),
})

// GET: is SP-API configured? (drives the "Push to Seller Central" button state)
export async function GET() {
  return ok({ configured: isSpapiConfigured() })
}

// POST: push an optimized listing to Seller Central via SP-API.
export async function POST(req: NextRequest) {
  const res = await requireActor(req, { needGenerate: false })
  if ('error' in res) return res.error
  const parsed = await parseBody(req, schema)
  if ('error' in parsed) return parsed.error
  try {
    const result = await pushListing(parsed.data)
    if (!result.ok) return fail(result.error || 'Push failed', 400)
    return ok({ submissionId: result.submissionId })
  } catch (err) {
    return wrapError('api.seller-central.push', err)
  }
}
