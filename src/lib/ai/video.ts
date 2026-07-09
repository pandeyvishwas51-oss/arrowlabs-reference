// Video Generation - Sora-2 via Azure (/openai/v1/videos, api-version=preview).
//
// Flow (OpenAI-compatible Videos API):
//   1. POST {endpoint}/openai/v1/videos?api-version=preview      -> { id, status }
//   2. GET  {endpoint}/openai/v1/videos/{id}?api-version=preview -> poll status
//   3. GET  {endpoint}/openai/v1/videos/{id}/content?api-version=preview -> mp4 bytes
//
// generateVideo() starts a job and polls to completion (bounded), saving the
// mp4 to public/generated and returning its URL. For long jobs, drive
// startVideoJob() + pollVideoJob() from an async route + client polling.

import { config, getVideoProvider } from '@/lib/config'
import { saveBuffer } from '@/lib/storage'

export type VideoRequest = {
  prompt: string
  aspectRatio?: '16:9' | '9:16' | '1:1'
  seconds?: number
}

export type VideoJob = {
  id: string
  status: 'queued' | 'in_progress' | 'preprocessing' | 'running' | 'processing' | 'completed' | 'succeeded' | 'failed' | 'cancelled'
  error?: string
  progress?: number
  url?: string // set by pollVideoJob when the job finishes
}

export type VideoResult = {
  url: string
  provider: 'azure' | 'gcp'
  model: string
  prompt: string
  durationSeconds: number
  jobId: string
}

const SIZE_FOR: Record<string, string> = {
  '16:9': '1280x720',
  '9:16': '720x1280',
  '1:1': '720x1280',
}

function base() {
  const { endpoint, apiKey, deployment, apiVersion } = config.azure.video
  return { endpoint, apiKey, deployment, apiVersion }
}

const isTerminalOk = (s: string) => s === 'completed' || s === 'succeeded'
const isTerminalBad = (s: string) => s === 'failed' || s === 'cancelled'

// Sora-2 only supports these clip durations.
const ALLOWED_SECONDS = [4, 8, 12]
function snapSeconds(s?: number): number {
  const want = s || 8
  return ALLOWED_SECONDS.reduce((best, v) => (Math.abs(v - want) < Math.abs(best - want) ? v : best), ALLOWED_SECONDS[0])
}

export async function startVideoJob(req: VideoRequest): Promise<VideoJob> {
  const provider = getVideoProvider()
  if (!provider) {
    throw new Error('No video provider configured. Add AZURE_VIDEO_* (Sora-2) to .env')
  }
  // Sora-2 (Azure) only.
  const { endpoint, apiKey, deployment, apiVersion } = base()
  const size = SIZE_FOR[req.aspectRatio || '9:16']
  const seconds = snapSeconds(req.seconds)
  const url = `${endpoint}/openai/v1/videos?api-version=${apiVersion}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'api-key': apiKey, Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: deployment,
      prompt: req.prompt,
      seconds: String(seconds),
      size,
    }),
  })
  if (!res.ok) throw new Error(`Sora create error: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return { id: data.id, status: data.status || 'queued', progress: data.progress }
}

export async function pollVideoJob(jobId: string): Promise<VideoJob> {
  const { endpoint, apiKey, apiVersion } = base()
  const url = `${endpoint}/openai/v1/videos/${jobId}?api-version=${apiVersion}`
  const res = await fetch(url, { headers: { 'api-key': apiKey, Authorization: `Bearer ${apiKey}` } })
  if (!res.ok) throw new Error(`Sora poll error: ${res.status} ${await res.text()}`)
  const data = await res.json()
  const status = data.status
  const out: VideoJob = { id: jobId, status, progress: data.progress, error: data.error?.message || data.failure_reason }
  // For Sora, fetch + persist the content the moment it completes so callers get a URL.
  if (isTerminalOk(status)) {
    const buffer = await fetchVideoContent(jobId)
    out.url = await saveBuffer(buffer, 'mp4', 'video')
  }
  return out
}

export async function fetchVideoContent(jobId: string): Promise<Buffer> {
  const { endpoint, apiKey, apiVersion } = base()
  const url = `${endpoint}/openai/v1/videos/${jobId}/content?api-version=${apiVersion}`
  const res = await fetch(url, { headers: { 'api-key': apiKey, Authorization: `Bearer ${apiKey}` } })
  if (!res.ok) throw new Error(`Sora content error: ${res.status} ${await res.text()}`)
  return Buffer.from(await res.arrayBuffer())
}

// Convenience: start + poll to completion (bounded), persist, return URL.
export async function generateVideo(
  req: VideoRequest,
  opts: { maxWaitMs?: number; intervalMs?: number } = {},
): Promise<VideoResult> {
  // Video is Sora-2 (Azure) ONLY — Veo / Google video is disabled.
  const { deployment } = base()
  const maxWait = opts.maxWaitMs ?? 5 * 60 * 1000
  const interval = opts.intervalMs ?? 5000
  const seconds = snapSeconds(req.seconds)

  const job = await startVideoJob(req)
  const deadline = Date.now() + maxWait
  let status = job
  while (Date.now() < deadline) {
    status = await pollVideoJob(job.id)
    if (isTerminalOk(status.status)) break
    if (isTerminalBad(status.status)) {
      throw new Error(`Sora job ${status.status}: ${status.error || 'unknown'}`)
    }
    await new Promise((r) => setTimeout(r, interval))
  }
  if (!isTerminalOk(status.status)) throw new Error('Sora job timed out before completion')

  const url = status.url || (await saveBuffer(await fetchVideoContent(job.id), 'mp4', 'video'))
  return { url, provider: 'azure', model: deployment, prompt: req.prompt, durationSeconds: seconds, jobId: job.id }
}
