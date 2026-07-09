import { NextRequest } from 'next/server'
import { z } from 'zod'
import { ok, fail, guardRate, requireActor, wrapError } from '@/lib/api'
import { generateImage, bestModelFor } from '@/lib/ai/image'
import { getImageProvider } from '@/lib/config'
import { saveBase64 } from '@/lib/storage'
import { debitForUsage, InsufficientCreditsError } from '@/lib/credits'
import { db } from '@/lib/db'
import type { ImagePrompt } from '@/lib/prompting/image-prompts'

export const maxDuration = 120

const schema = z.object({
  assetId: z.string().optional(),
  prompt: z.any().optional(), // full ImagePrompt JSON
  text: z.string().optional(), // freeform text prompt
  aspectRatio: z.enum(['1:1', '4:5', '16:9', '9:16', '3:4', '4:3']).optional(),
  model: z.string().optional(), // gpt-image-2 (default) | flux-1.1-pro | flux-kontext | gpt-image-1.5
  comment: z.string().max(600).optional(), // "what to change" — refines the prompt + is saved for self-learning
})

function promptFromText(text: string, aspectRatio: ImagePrompt['technical']['aspectRatio']): ImagePrompt {
  return {
    version: '1.0',
    type: 'product_photo',
    lab: 'PhotoLab',
    product: { name: text.slice(0, 60), brand: '', category: 'general', keyFeatures: [] },
    scene: { background: 'studio', setting: 'studio', lighting: 'studio', mood: 'premium' },
    composition: { angle: 'three-quarter', shot: 'medium', framing: 'centered', focusPoint: 'product' },
    styling: { palette: ['#FFFFFF', '#000000'] },
    technical: { aspectRatio, resolution: 'high', style: 'photographic' },
    negativePrompts: ['text', 'watermark', 'low quality'],
    textPrompt: text,
  }
}

// Generate a single image from an asset, a full ImagePrompt, or freeform text.
export async function POST(req: NextRequest) {
  const limited = guardRate(req, 'image')
  if (limited) return limited

  const res = await requireActor(req, { needGenerate: true })
  if ('error' in res) return res.error
  if (!getImageProvider()) return fail('No image provider configured.', 503)

  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) return fail('Invalid input', 422)
  const { assetId, prompt, text, aspectRatio, model, comment } = parsed.data

  let imagePrompt: ImagePrompt | null = null
  if (assetId) {
    const asset = await db.asset.findUnique({ where: { id: assetId } })
    if (!asset) return fail('Asset not found', 404)
    imagePrompt = (asset.promptJson as any) || promptFromText(asset.prompt || 'product', '1:1')
  } else if (prompt && typeof prompt === 'object') {
    imagePrompt = prompt as ImagePrompt
  } else if (text) {
    imagePrompt = promptFromText(text, aspectRatio || '1:1')
  } else {
    return fail('Provide assetId, prompt, or text.', 400)
  }
  if (!imagePrompt) return fail('Could not resolve an image prompt.', 400)

  // Regenerate-with-feedback: fold the user's comment into the prompt so the new
  // render reflects exactly what they asked to change.
  if (comment && comment.trim()) {
    imagePrompt = { ...imagePrompt, textPrompt: `${imagePrompt.textPrompt}\n\nUSER REFINEMENT — apply this change precisely while keeping the real product identical: ${comment.trim()}` }
  }

  // Auto-select the best model for this asset type (internal). An explicit
  // `model` in the request can still override for power/testing use.
  const chosenModel = model || bestModelFor(imagePrompt.type)

  try {
    const result = await generateImage(imagePrompt, { model: chosenModel })
    const url = result.url.startsWith('data:')
      ? await saveBase64(result.url, 'png', imagePrompt.type)
      : result.url

    await debitForUsage({
      orgId: res.actor.orgId,
      userId: res.actor.userId,
      kind: 'image',
      provider: result.provider,
      model: result.model,
      meta: { assetId },
    })

    if (assetId) {
      // Persist the feedback trail on the asset (self-learning data we can mine per
      // brand/product to steer future prompts).
      let feedback: any[] = []
      if (comment && comment.trim()) {
        const existing = await db.asset.findUnique({ where: { id: assetId }, select: { metadata: true } })
        feedback = [ ...(((existing?.metadata as any)?.feedback) || []), { comment: comment.trim(), at: new Date().toISOString() } ]
      }
      await db.asset.update({
        where: { id: assetId },
        data: { imageUrl: url, status: 'completed', metadata: { provider: result.provider, model: result.model, ...(feedback.length ? { feedback } : {}) } as any },
      })
    }
    return ok({ url, provider: result.provider, model: result.model })
  } catch (err) {
    if (err instanceof InsufficientCreditsError) return fail(err.message, 402)
    return wrapError('api.generate-image', err)
  }
}
