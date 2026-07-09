// Generate premium marketing / A+ style images with Azure gpt-image-2 and save
// them to public/marketing/. Run: node scripts/gen_marketing_images.mjs
// Requires AZURE_IMAGE_ENDPOINT + AZURE_IMAGE_API_KEY in the environment.

import { promises as fs } from 'fs'
import path from 'path'

const ENDPOINT = process.env.AZURE_IMAGE_ENDPOINT
const KEY = process.env.AZURE_IMAGE_API_KEY
const MODEL = process.env.AZURE_IMAGE_DEPLOYMENT || 'gpt-image-2'
const OUT = path.join(process.cwd(), 'public', 'marketing')

const JOBS = [
  {
    name: 'hero-studio',
    size: '1536x1024',
    prompt:
      'Ultra premium editorial product photography hero image for a modern commerce creative studio. A sleek matte-black skincare serum bottle and a minimalist white cosmetic jar arranged on a smooth pale-beige plaster pedestal, soft directional studio light, gentle long shadows, a single subtle vermillion-red accent card floating behind, lots of clean negative space, shot on medium format, shallow depth of field, crisp, luxurious, magazine quality. No text, no watermark.',
  },
  {
    name: 'aplus-lifestyle',
    size: '1536x1024',
    prompt:
      'High-end Amazon A+ content lifestyle module. A premium amber glass skincare dropper bottle on a white marble bathroom counter, fresh eucalyptus leaves, morning sunlight through a window casting soft leaf shadows, water droplets, calm spa mood, muted natural palette, photorealistic, editorial, ultra sharp. No text overlays, no watermark.',
  },
  {
    name: 'amazon-listing',
    size: '1024x1024',
    prompt:
      'Amazon main product image, e-commerce compliant. A single premium stainless-steel insulated water bottle centered on a pure white seamless background, professional three-quarter angle, crisp studio lighting, soft reflection beneath, ultra sharp focus, no props, no people, no text, no watermark.',
  },
  {
    name: 'ad-creative',
    size: '1024x1536',
    prompt:
      'Scroll-stopping vertical D2C social ad creative. A vibrant matcha green energy drink can splashing with liquid and fresh mint leaves against a bold gradient background of cream and vermillion red, dynamic motion, dramatic rim light, glossy, high energy, commercial photography. Leave clean space at the top and bottom for copy. No text, no watermark.',
  },
  {
    name: 'ugc-creator',
    size: '1024x1536',
    prompt:
      'Authentic UGC style vertical photo. A cheerful young woman in a cozy sunlit kitchen holding up a skincare product toward a phone camera, natural candid smile, handheld selfie feel, warm morning light, slightly imperfect authentic look, relatable creator content, photorealistic. No text, no watermark.',
  },
  {
    name: 'dashboard',
    size: '1536x1024',
    prompt:
      'A clean, modern SaaS analytics dashboard UI displayed on a floating browser window, light theme with soft glassmorphism cards, a product listing preview, ranked ad-angle bars, a grid of generated product photos, subtle vermillion-red accents, crisp typography feel, minimal, premium, rendered as a sleek product mockup on a soft off-white background. No real readable text needed, no watermark.',
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
  if (!b64) throw new Error(`${job.name}: no image in response`)
  await fs.writeFile(path.join(OUT, `${job.name}.png`), Buffer.from(b64, 'base64'))
  console.log(`✓ ${job.name}.png (${job.size})`)
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
