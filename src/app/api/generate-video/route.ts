import { NextRequest } from 'next/server'
import { z } from 'zod'
import { ok, fail, guardRate, requireActor, wrapError } from '@/lib/api'
import { startVideoJob, pollVideoJob, generateVideo } from '@/lib/ai/video'
import { getVideoProvider } from '@/lib/config'
import { debitForUsage, InsufficientCreditsError } from '@/lib/credits'
import { logError } from '@/lib/logger'
import { db } from '@/lib/db'

export const maxDuration = 300

const schema = z.object({
  prompt: z.string().trim().min(3).optional(),
  aspectRatio: z.enum(['16:9', '9:16', '1:1']).optional(),
  seconds: z.number().int().min(1).max(20).optional(),
  assetId: z.string().optional(), // regenerate an existing video asset
  comment: z.string().max(600).optional(), // "what to change" — refines + saved for self-learning
})

// POST: start a Sora job (returns { jobId }). With assetId, REGENERATE that video
// asset synchronously (comment refines the script) and update it — landscape.
export async function POST(req: NextRequest) {
  const limited = guardRate(req, 'video')
  if (limited) return limited
  const res = await requireActor(req, { needGenerate: true })
  if ('error' in res) return res.error
  if (!getVideoProvider()) return fail('No video provider configured.', 503)

  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) return fail('Invalid input', 422)
  const { prompt, aspectRatio, seconds, assetId, comment } = parsed.data

  try {
    await debitForUsage({ orgId: res.actor.orgId, userId: res.actor.userId, kind: 'video', provider: 'azure', model: 'sora-2' })

    // Regenerate flow: build the prompt from the asset's script + the comment,
    // render to completion, update the asset, and log the feedback.
    if (assetId) {
      const asset = await db.asset.findUnique({ where: { id: assetId } })
      if (!asset) return fail('Asset not found', 404)
      const base = prompt || asset.prompt || 'A clean, premium product overview video'
      const finalPrompt = comment?.trim() ? `${base}\n\nREFINEMENT — apply precisely: ${comment.trim()}` : base
      const result = await generateVideo({ prompt: finalPrompt, aspectRatio: aspectRatio || '16:9', seconds: seconds || 12 }, { maxWaitMs: 12 * 60 * 1000 })
      const feedback = comment?.trim()
        ? [ ...(((asset.metadata as any)?.feedback) || []), { comment: comment.trim(), at: new Date().toISOString() } ]
        : ((asset.metadata as any)?.feedback || [])
      await db.asset.update({ where: { id: assetId }, data: { videoUrl: result.url, status: 'completed', prompt: finalPrompt, metadata: { ...(asset.metadata as any), feedback } as any } })
      return ok({ url: result.url, assetId })
    }

    if (!prompt) return fail('Provide a prompt or assetId.', 400)
    const job = await startVideoJob({ prompt, aspectRatio, seconds })
    return ok({ jobId: job.id, status: job.status })
  } catch (err) {
    if (err instanceof InsufficientCreditsError) return fail(err.message, 402)
    return wrapError('api.generate-video.start', err)
  }
}

// GET ?jobId=... : poll status; when completed, download + persist + return url.
export async function GET(req: NextRequest) {
  const res = await requireActor(req)
  if ('error' in res) return res.error
  const jobId = new URL(req.url).searchParams.get('jobId')
  if (!jobId) return fail('jobId required', 400)

  try {
    const job = await pollVideoJob(jobId)
    if ((job.status === 'completed' || job.status === 'succeeded') && job.url) {
      return ok({ status: 'completed', url: job.url, jobId })
    }
    if (job.status === 'failed' || job.status === 'cancelled') {
      return ok({ status: job.status, error: job.error, jobId })
    }
    return ok({ status: job.status, progress: job.progress, jobId })
  } catch (err) {
    // Return a clean terminal status so the client stops polling instead of
    // treating it as a hard 500. Log for diagnostics.
    void logError('api.generate-video.poll', err, { jobId })
    return ok({ status: 'failed', error: 'Could not fetch job status. Try again.', jobId })
  }
}
