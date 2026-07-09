// Generate short UGC-style videos for pitch brands with Sora-2.
// Saved to public/marketing/pitch/{key}.mp4. Run: node scripts/gen_pitch_videos.mjs

import { promises as fs } from 'fs'
import path from 'path'

const EP = process.env.AZURE_VIDEO_ENDPOINT
const KEY = process.env.AZURE_VIDEO_API_KEY
const MODEL = process.env.AZURE_VIDEO_MODEL || 'sora-2'
const V = process.env.AZURE_VIDEO_API_VERSION || 'preview'
const OUT = path.join(process.cwd(), 'public', 'marketing', 'pitch')

const JOBS = [
  { key: 'ugc-skincare', prompt: 'Vertical UGC style video: a young woman in a sunlit bedroom holds a skincare serum bottle toward the camera, smiles, applies a drop to her cheek, authentic handheld selfie feel, warm natural light. No text, no watermark.' },
  { key: 'ugc-food', prompt: 'Vertical UGC style video: a person at a bright kitchen counter unwraps a chocolate protein bar, takes a bite, gives a thumbs up, energetic clean-label vibe, handheld. No text, no watermark.' },
  { key: 'ugc-fashion', prompt: 'Vertical UGC style video: a stylish young man does a quick outfit reveal turn in a premium shirt on an urban rooftop at golden hour, confident streetwear energy, handheld. No text, no watermark.' },
]

async function run(job) {
  const headers = { 'api-key': KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }
  const create = await fetch(`${EP}/openai/v1/videos?api-version=${V}`, {
    method: 'POST', headers,
    body: JSON.stringify({ model: MODEL, prompt: job.prompt, seconds: '4', size: '720x1280' }),
  })
  if (!create.ok) throw new Error(`${job.key} create ${create.status}`)
  const j = await create.json()
  console.log(`${job.key}: job ${j.id}`)
  for (let i = 0; i < 90; i++) {
    await new Promise((r) => setTimeout(r, 6000))
    const s = await (await fetch(`${EP}/openai/v1/videos/${j.id}?api-version=${V}`, { headers })).json()
    if (s.status === 'completed' || s.status === 'succeeded') {
      const buf = Buffer.from(await (await fetch(`${EP}/openai/v1/videos/${j.id}/content?api-version=${V}`, { headers })).arrayBuffer())
      await fs.writeFile(path.join(OUT, `${job.key}.mp4`), buf)
      console.log(`✓ ${job.key}.mp4 (${(buf.length / 1e6).toFixed(1)}MB)`)
      return
    }
    if (s.status === 'failed' || s.status === 'cancelled') throw new Error(`${job.key} ${s.status}`)
  }
}

async function main() {
  if (!EP || !KEY) throw new Error('AZURE_VIDEO_ENDPOINT / AZURE_VIDEO_API_KEY not set')
  await fs.mkdir(OUT, { recursive: true })
  for (const job of JOBS) { try { console.log(`… ${job.key}`); await run(job) } catch (e) { console.error(`✗ ${e.message}`) } }
  console.log('done')
}
main()
