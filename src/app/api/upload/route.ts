// Image upload — stores a user's raw product photo and returns an ABSOLUTE URL
// (so it can drive image-to-image product lock, which fetches the reference over
// HTTP). Used by the raw-image generation flow.

import { NextRequest } from 'next/server'
import { ok, fail, requireActor, wrapError } from '@/lib/api'
import { saveBuffer } from '@/lib/storage'
import { config } from '@/lib/config'

export const maxDuration = 60

const MAX_BYTES = 12 * 1024 * 1024 // 12 MB
const EXT: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }

export async function POST(req: NextRequest) {
  const res = await requireActor(req)
  if ('error' in res) return res.error
  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof Blob)) return fail('No file uploaded (field "file").', 400)
    const type = file.type || 'image/png'
    const ext = EXT[type]
    if (!ext) return fail('Unsupported image type. Use PNG, JPG or WebP.', 400)
    if (file.size > MAX_BYTES) return fail('Image too large (max 12 MB).', 400)

    const buf = Buffer.from(await file.arrayBuffer())
    const path = await saveBuffer(buf, ext, 'upload')
    // Absolute URL so downstream image-to-image can fetch it.
    const url = path.startsWith('http') ? path : `${config.app.url}${path}`
    return ok({ url })
  } catch (err) {
    return wrapError('api.upload', err)
  }
}
