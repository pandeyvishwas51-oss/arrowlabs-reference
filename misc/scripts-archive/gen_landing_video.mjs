// Generate a landing-page hero video with Sora-2 (create -> poll -> download).
// Saved to public/marketing/landing-hero.mp4.

import { promises as fs } from 'fs'
import path from 'path'

const EP = process.env.AZURE_VIDEO_ENDPOINT
const KEY = process.env.AZURE_VIDEO_API_KEY
const MODEL = process.env.AZURE_VIDEO_MODEL || 'sora-2'
const V = process.env.AZURE_VIDEO_API_VERSION || 'preview'
const OUT = path.join(process.cwd(), 'public', 'marketing')

const PROMPT =
  'A cinematic 8 second product commercial: a premium amber glass skincare serum bottle rotating slowly on a travertine pedestal, soft morning light with drifting dust motes, a single drop of serum falling in slow motion, warm editorial color grade, shallow depth of field, luxury beauty brand aesthetic. No text, no watermark.'

async function main() {
  if (!EP || !KEY) throw new Error('AZURE_VIDEO_ENDPOINT / AZURE_VIDEO_API_KEY not set')
  const headers = { 'api-key': KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

  console.log('… creating sora job')
  const create = await fetch(`${EP}/openai/v1/videos?api-version=${V}`, {
    method: 'POST', headers,
    body: JSON.stringify({ model: MODEL, prompt: PROMPT, seconds: '8', size: '1280x720' }),
  })
  if (!create.ok) throw new Error(`create ${create.status}: ${await create.text()}`)
  const job = await create.json()
  console.log('job', job.id, job.status)

  for (let i = 0; i < 90; i++) {
    await new Promise((r) => setTimeout(r, 6000))
    const s = await (await fetch(`${EP}/openai/v1/videos/${job.id}?api-version=${V}`, { headers })).json()
    console.log(`poll ${i}: ${s.status} ${s.progress ?? ''}`)
    if (s.status === 'completed' || s.status === 'succeeded') {
      const buf = Buffer.from(await (await fetch(`${EP}/openai/v1/videos/${job.id}/content?api-version=${V}`, { headers })).arrayBuffer())
      await fs.writeFile(path.join(OUT, 'landing-hero.mp4'), buf)
      console.log(`✓ landing-hero.mp4 (${(buf.length / 1e6).toFixed(1)}MB)`)
      return
    }
    if (s.status === 'failed' || s.status === 'cancelled') throw new Error(`job ${s.status}`)
  }
  throw new Error('timed out')
}
main()
