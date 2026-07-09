// Google Vertex AI - Imagen-4 (image) + Veo-3 (video, native audio).
//
// Auth: org policy blocks SA keys, so we mint short-lived tokens and cache them.
// Order of preference:
//   1. GOOGLE_APPLICATION_CREDENTIALS (SA JSON) via google-auth-library, if set
//   2. Application Default Credentials (`gcloud auth application-default login`)
//   3. Fallback: shell out to `gcloud auth print-access-token` (local/VM only)
// Tokens are cached ~50 min. For serverless deploys, use ADC or Workload Identity.

import { execFile } from 'child_process'
import { promisify } from 'util'
import { config } from '@/lib/config'
import { saveBuffer } from '@/lib/storage'

const execFileP = promisify(execFile)

let cachedToken = ''
let cachedAt = 0

async function viaGcloud(args: string[]): Promise<string> {
  const { stdout } = await execFileP('gcloud', args, { maxBuffer: 1024 * 1024 })
  return stdout.trim()
}

export async function getGcpToken(): Promise<string> {
  if (cachedToken && Date.now() - cachedAt < 50 * 60 * 1000) return cachedToken
  let token = ''
  // 1/2. google-auth-library (SA key or ADC) - loaded lazily so it's optional.
  try {
    const { GoogleAuth } = await import('google-auth-library')
    const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] })
    const client = await auth.getClient()
    const t = await client.getAccessToken()
    token = (typeof t === 'string' ? t : t?.token) || ''
  } catch {
    /* fall through to gcloud */
  }
  // 3. gcloud fallback (ADC token, then user token).
  if (!token) {
    try { token = await viaGcloud(['auth', 'application-default', 'print-access-token']) } catch {}
  }
  if (!token) {
    try { token = await viaGcloud(['auth', 'print-access-token']) } catch {}
  }
  if (!token) throw new Error('No GCP credentials. Run: gcloud auth application-default login')
  cachedToken = token
  cachedAt = Date.now()
  return token
}

function base(model: string, action: string) {
  const { projectId, region } = config.gcp
  return `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/${model}:${action}`
}

// ===== Imagen-4 =====
export async function generateImagen(prompt: string, aspectRatio = '1:1', model = 'imagen-4.0-generate-001') {
  const token = await getGcpToken()
  const res = await fetch(base(model, 'predict'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ instances: [{ prompt }], parameters: { sampleCount: 1, aspectRatio } }),
  })
  if (!res.ok) throw new Error(`Imagen error: ${res.status} ${await res.text()}`)
  const data = await res.json()
  const b64 = data.predictions?.[0]?.bytesBase64Encoded
  if (!b64) throw new Error('Imagen returned no image')
  return { b64, model }
}

// ===== Veo-3 (async long-running) =====
export async function startVeoJob(prompt: string, opts: { aspectRatio?: string; seconds?: number } = {}, model = 'veo-3.0-generate-001') {
  const token = await getGcpToken()
  const res = await fetch(base(model, 'predictLongRunning'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1, durationSeconds: opts.seconds || 8, aspectRatio: opts.aspectRatio || '16:9' },
    }),
  })
  if (!res.ok) throw new Error(`Veo create error: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return { operationName: data.name as string, model }
}

export async function pollVeoJob(operationName: string, model = 'veo-3.0-generate-001') {
  const token = await getGcpToken()
  const res = await fetch(base(model, 'fetchPredictOperation'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ operationName }),
  })
  if (!res.ok) throw new Error(`Veo poll error: ${res.status} ${await res.text()}`)
  return res.json()
}

// Convenience: start + poll + persist. Returns a public /generated URL.
export async function generateVeoVideo(prompt: string, opts: { aspectRatio?: string; seconds?: number; maxWaitMs?: number } = {}) {
  const { operationName, model } = await startVeoJob(prompt, opts)
  const deadline = Date.now() + (opts.maxWaitMs ?? 6 * 60 * 1000)
  while (Date.now() < deadline) {
    const op = await pollVeoJob(operationName, model)
    if (op.done) {
      if (op.error) throw new Error(`Veo failed: ${op.error.message}`)
      const v = op.response?.videos?.[0] || op.response?.predictions?.[0]
      const b64 = v?.bytesBase64Encoded
      if (b64) {
        const url = await saveBuffer(Buffer.from(b64, 'base64'), 'mp4', 'veo')
        return { url, model, prompt }
      }
      if (v?.gcsUri) return { url: v.gcsUri, model, prompt } // caller must fetch from GCS
      throw new Error('Veo returned no video content')
    }
    await new Promise((r) => setTimeout(r, 8000))
  }
  throw new Error('Veo job timed out')
}
