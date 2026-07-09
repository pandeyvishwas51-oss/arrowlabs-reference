import { NextRequest } from 'next/server'
import { ok, requireActor, wrapError } from '@/lib/api'
import { revokeApiKey } from '@/lib/apikeys'

// DELETE: revoke one of the signed-in user's API keys.
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const res = await requireActor(req)
  if ('error' in res) return res.error
  try {
    const { id } = await ctx.params
    await revokeApiKey(res.actor.userId, id)
    return ok({ revoked: id })
  } catch (err) {
    return wrapError('api.apikeys.revoke', err)
  }
}
