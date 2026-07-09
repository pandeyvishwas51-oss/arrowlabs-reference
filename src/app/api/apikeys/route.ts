import { NextRequest } from 'next/server'
import { z } from 'zod'
import { ok, parseBody, requireActor, wrapError } from '@/lib/api'
import { listApiKeys, createApiKey } from '@/lib/apikeys'

// GET: list the signed-in user's API keys (no secrets).
export async function GET(req: NextRequest) {
  const res = await requireActor(req)
  if ('error' in res) return res.error
  try {
    return ok(await listApiKeys(res.actor.userId))
  } catch (err) {
    return wrapError('api.apikeys.list', err)
  }
}

const schema = z.object({ name: z.string().trim().min(1).max(60).default('Default key') })

// POST: create a new API key. The raw key is returned exactly once.
export async function POST(req: NextRequest) {
  const res = await requireActor(req)
  if ('error' in res) return res.error
  const parsed = await parseBody(req, schema)
  if ('error' in parsed) return parsed.error
  try {
    const key = await createApiKey(res.actor.userId, parsed.data.name)
    return ok(key, { notice: 'Store this key now - it will not be shown again.' })
  } catch (err) {
    return wrapError('api.apikeys.create', err)
  }
}
