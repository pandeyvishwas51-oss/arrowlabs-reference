// High-end lifestyle/model/editorial creatives with gpt-image-2 — the quality
// bar the marketing site needs (real people, brand context, magazine lighting).
// Saved to public/marketing/premium/. Run: node scripts/gen_premium_images.mjs

import { promises as fs } from 'fs'
import path from 'path'

const ENDPOINT = process.env.AZURE_IMAGE_ENDPOINT
const KEY = process.env.AZURE_IMAGE_API_KEY
const MODEL = process.env.AZURE_IMAGE_DEPLOYMENT || 'gpt-image-2'
const OUT = path.join(process.cwd(), 'public', 'marketing', 'premium')

// Shared photography recipe (fofr.ai method) appended to every prompt.
const RECIPE =
  'Editorial commercial photography, shot on Kodak Portra 400, soft diffused window light at ~4800K from upper-left, shallow depth of field, real skin texture, fine natural grain, warm considered color grade, asymmetric composition with generous negative space, ultra sharp, magazine quality. No text overlays, no watermark, no logos unless specified.'

const JOBS = [
  { name: 'model-skincare', size: '1024x1536', prompt: `A radiant woman in her early 30s applying a premium serum in a bright, airy bathroom with a linen curtain and morning light, calm confident expression, dewy skin, minimalist marble vanity, authentic candid moment. ${RECIPE}` },
  { name: 'model-athleisure', size: '1024x1536', prompt: `A fit woman in matte sage-green athleisure standing in a sunlit modern studio with a soft cream backdrop, relaxed powerful pose, natural makeup, premium activewear brand campaign feel. ${RECIPE}` },
  { name: 'lifestyle-kitchen', size: '1536x1024', prompt: `Close-up of hands pouring a fresh strawberry smoothie from a premium blender into a glass on a warm wooden kitchen counter, fruit and mint scattered, steam of morning light through a window, cozy premium home-appliance advertising. ${RECIPE}` },
  { name: 'beauty-flatlay', size: '1536x1024', prompt: `An overhead luxury skincare flat lay on warm travertine stone: an amber glass dropper bottle, a ceramic dish, dried eucalyptus sprigs, a folded linen cloth, soft shadows, refined muted palette, high-end beauty brand editorial. ${RECIPE}` },
  { name: 'onmodel-accessory', size: '1024x1024', prompt: `A cinematic close-up of a mans wrist wearing a minimalist premium watch, hand resting on a charcoal wool coat, moody directional light, luxury accessory campaign, rich shadows. ${RECIPE}` },
  { name: 'ugc-creator', size: '1024x1536', prompt: `Authentic UGC-style vertical photo: a cheerful young woman in a cozy sunlit bedroom holding a skincare product up toward a phone camera, candid natural smile, slightly imperfect handheld selfie feel, relatable creator content. ${RECIPE}` },
  { name: 'lifestyle-desk', size: '1536x1024', prompt: `A premium wireless headphone resting on a minimalist walnut desk beside a laptop and a cup of coffee in a warm home office, soft afternoon light, lifestyle tech product photography, aspirational and calm. ${RECIPE}` },
  { name: 'home-editorial', size: '1024x1024', prompt: `A styled corner of a warm modern living room: a handcrafted brass vase with dried pampas on a linen-draped side table, soft window light, artisan home-decor brand editorial, inviting and premium. ${RECIPE}` },
]

async function genOne(job) {
  const url = `${ENDPOINT.replace(/\/+$/, '')}/images/generations`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'api-key': KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, prompt: job.prompt, size: job.size, quality: 'high', n: 1 }),
  })
  if (!res.ok) throw new Error(`${job.name}: ${res.status} ${await res.text()}`)
  const data = await res.json()
  const b64 = data.data?.[0]?.b64_json
  if (!b64) throw new Error(`${job.name}: no image`)
  await fs.writeFile(path.join(OUT, `${job.name}.png`), Buffer.from(b64, 'base64'))
  console.log(`✓ ${job.name}.png (${job.size})`)
}

async function main() {
  if (!ENDPOINT || !KEY) throw new Error('AZURE_IMAGE_ENDPOINT / AZURE_IMAGE_API_KEY not set')
  await fs.mkdir(OUT, { recursive: true })
  for (const job of JOBS) {
    try { console.log(`… ${job.name}`); await genOne(job) } catch (e) { console.error(`✗ ${e.message}`) }
  }
  console.log('done')
}

main()
