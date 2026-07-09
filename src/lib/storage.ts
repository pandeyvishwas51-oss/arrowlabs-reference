// Local media storage - persists generated images/videos and returns a public
// URL path (/generated/<name>). Keeps the DB light (no giant base64 blobs).
//
// MEDIA_DIR lets prod write to a STABLE directory outside .next (which is wiped
// on every rebuild) so generated media survives redeploys. In production, a
// reverse proxy (Caddy/Nginx) serves /generated/* straight from MEDIA_DIR, which
// is faster and avoids Next's standalone server not serving runtime public files.
// This is also the seam to swap for S3/R2/Azure Blob.

import { promises as fs } from 'fs'
import path from 'path'

const MEDIA_DIR =
  process.env.MEDIA_DIR || path.join(process.cwd(), 'public', 'generated')

async function ensureDir() {
  await fs.mkdir(MEDIA_DIR, { recursive: true })
}

// Simple id without external deps (crypto is available in Node runtime).
function rid(prefix: string): string {
  const rand = Buffer.from(
    Array.from({ length: 8 }, (_, i) => (Date.now() >> (i * 3)) & 0xff),
  ).toString('hex')
  return `${prefix}_${Date.now().toString(36)}${rand.slice(0, 8)}`
}

export async function saveBuffer(buffer: Buffer, ext: string, prefix = 'asset'): Promise<string> {
  await ensureDir()
  const name = `${rid(prefix)}.${ext}`
  await fs.writeFile(path.join(MEDIA_DIR, name), buffer)
  return `/generated/${name}`
}

// Accepts a data URL (data:image/png;base64,...) or raw base64 + ext.
export async function saveBase64(dataOrB64: string, ext = 'png', prefix = 'asset'): Promise<string> {
  const b64 = dataOrB64.includes(',') ? dataOrB64.split(',')[1] : dataOrB64
  return saveBuffer(Buffer.from(b64, 'base64'), ext, prefix)
}
