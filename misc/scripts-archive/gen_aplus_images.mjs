// Detailed, high-quality A+ content module images with gpt-image-2.
// Saved to public/marketing/aplus/. Run: node scripts/gen_aplus_images.mjs

import { promises as fs } from 'fs'
import path from 'path'

const ENDPOINT = process.env.AZURE_IMAGE_ENDPOINT
const KEY = process.env.AZURE_IMAGE_API_KEY
const MODEL = process.env.AZURE_IMAGE_DEPLOYMENT || 'gpt-image-2'
const OUT = path.join(process.cwd(), 'public', 'marketing', 'aplus')

const RECIPE = 'Amazon A+ content premium module, clean editorial layout with generous negative space, soft studio lighting, crisp modern sans-serif callout labels, refined muted palette with a single warm accent, magazine-grade, ultra sharp, photorealistic. No lorem ipsum, legible short labels only, no watermark.'

const JOBS = [
  { name: 'aplus-hero', size: '1536x1024', prompt: `A wide Amazon A+ brand hero banner for a premium skincare serum: an amber glass dropper bottle on a travertine plinth, dried botanicals, soft morning light, a short elegant brand tagline area on the left, three small benefit icons along the bottom (Dermatologist Tested, Clean Formula, Cruelty Free). ${RECIPE}` },
  { name: 'aplus-features', size: '1536x1024', prompt: `A wide Amazon A+ feature-callout module: a premium stainless steel insulated bottle centered, four thin leader lines pointing to labeled features around it (Double Wall Insulation, Leak-Proof Lid, 24h Cold, BPA-Free), clean light-grey gradient background, crisp icons, technical yet warm. ${RECIPE}` },
  { name: 'aplus-comparison', size: '1536x1024', prompt: `A wide Amazon A+ comparison module: a clean side-by-side comparison table styled premium, "Ours" column highlighted in warm accent with check marks vs generic competitor column with muted marks, minimal product thumbnails at top, soft shadows, modern. ${RECIPE}` },
  { name: 'aplus-lifestyle', size: '1536x1024', prompt: `A wide Amazon A+ lifestyle story module: a woman in a sunlit modern kitchen using a premium blender to make a fresh smoothie, warm inviting tones, a short story headline area on the right, authentic and aspirational. ${RECIPE}` },
]

async function genOne(job) {
  const res = await fetch(`${ENDPOINT.replace(/\/+$/, '')}/images/generations`, {
    method: 'POST',
    headers: { 'api-key': KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, prompt: job.prompt, size: job.size, quality: 'high', n: 1 }),
  })
  if (!res.ok) throw new Error(`${job.name}: ${res.status} ${await res.text()}`)
  const data = await res.json()
  const b64 = data.data?.[0]?.b64_json
  if (!b64) throw new Error(`${job.name}: no image`)
  await fs.writeFile(path.join(OUT, `${job.name}.png`), Buffer.from(b64, 'base64'))
  console.log(`✓ ${job.name}.png`)
}

async function main() {
  if (!ENDPOINT || !KEY) throw new Error('AZURE_IMAGE_ENDPOINT / AZURE_IMAGE_API_KEY not set')
  await fs.mkdir(OUT, { recursive: true })
  for (const job of JOBS) { try { console.log(`… ${job.name}`); await genOne(job) } catch (e) { console.error(`✗ ${e.message}`) } }
  console.log('done')
}
main()
