// Generate real branded product creatives with Azure gpt-image-2, saved to
// public/marketing/brands/. These make the landing page feel like a real studio.
// Run: node scripts/gen_brand_images.mjs (needs AZURE_IMAGE_ENDPOINT + KEY).

import { promises as fs } from 'fs'
import path from 'path'

const ENDPOINT = process.env.AZURE_IMAGE_ENDPOINT
const KEY = process.env.AZURE_IMAGE_API_KEY
const MODEL = process.env.AZURE_IMAGE_DEPLOYMENT || 'gpt-image-2'
const OUT = path.join(process.cwd(), 'public', 'marketing', 'brands')

const JOBS = [
  {
    name: 'cerave',
    brand: 'CeraVe',
    size: '1024x1024',
    prompt:
      'Premium e-commerce product photo: a white CeraVe moisturizing cream tube and pump bottle with the CeraVe logo clearly printed, on a clean white bathroom counter with a few water droplets, soft dermatological studio lighting, crisp, minimal, editorial. No extra text, no watermark.',
  },
  {
    name: 'owala',
    brand: 'Owala',
    size: '1024x1024',
    prompt:
      'Premium product photo of an Owala FreeSip insulated stainless-steel water bottle in teal-and-navy, condensation droplets, the Owala brand mark visible, seamless soft-gray studio background, dramatic rim light, ultra sharp. No extra text, no watermark.',
  },
  {
    name: 'sony',
    brand: 'Sony',
    size: '1024x1024',
    prompt:
      'Premium tech product photo of black Sony WH-1000XM5 wireless over-ear headphones with the Sony logo visible, resting on a minimalist matte pedestal, dramatic studio lighting with soft reflections, dark elegant background, cinematic, high-end. No extra text, no watermark.',
  },
  {
    name: 'prime',
    brand: 'PRIME',
    size: '1024x1536',
    prompt:
      'Bold vertical social ad creative: a tall can of PRIME hydration drink in blue raspberry with the PRIME logo, splashing with ice cubes and water, vibrant blue-to-cream gradient background, dynamic motion, glossy, high energy commercial photography. Clean space top and bottom. No extra text, no watermark.',
  },
  {
    name: 'gymshark',
    brand: 'Gymshark',
    size: '1024x1536',
    prompt:
      'Premium fitness brand vertical creative: a Gymshark athletic set (sports bra and leggings) flat-lay next to a dumbbell and towel with the Gymshark logo on the waistband, moody gym lighting, charcoal background, sweat-and-steel aesthetic, editorial. No extra text, no watermark.',
  },
  {
    name: 'ninja',
    brand: 'Ninja',
    size: '1536x1024',
    prompt:
      'Bright lifestyle product photo of a Ninja blender with the Ninja logo on a modern kitchen counter, a fresh strawberry-banana smoothie inside, fruit scattered around, morning sunlight, clean and vibrant, premium home-appliance advertising. No extra text, no watermark.',
  },
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
  console.log(`✓ ${job.name}.png (${job.brand})`)
}

async function main() {
  if (!ENDPOINT || !KEY) throw new Error('AZURE_IMAGE_ENDPOINT / AZURE_IMAGE_API_KEY not set')
  await fs.mkdir(OUT, { recursive: true })
  for (const job of JOBS) {
    try {
      console.log(`… generating ${job.name}`)
      await genOne(job)
    } catch (e) {
      console.error(`✗ ${e.message}`)
    }
  }
  console.log('done')
}

main()
