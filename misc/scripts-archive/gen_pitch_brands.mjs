// Generate product + lifestyle creatives for real rising D2C brands (pitch
// targets). Brand names rendered clearly and legibly. Saved to
// public/marketing/pitch/. Run: node scripts/gen_pitch_brands.mjs

import { promises as fs } from 'fs'
import path from 'path'

const ENDPOINT = process.env.AZURE_IMAGE_ENDPOINT
const KEY = process.env.AZURE_IMAGE_API_KEY
const MODEL = process.env.AZURE_IMAGE_DEPLOYMENT || 'gpt-image-2'
const OUT = path.join(process.cwd(), 'public', 'marketing', 'pitch')

const QUAL = 'Ultra sharp, photorealistic, premium D2C brand photography, soft studio lighting, warm editorial color grade, generous negative space. The brand name must be spelled EXACTLY and rendered clearly and legibly on the product/label. No misspellings, no gibberish text, no watermark.'

// Real, fast-rising Indian D2C brands across categories.
const BRANDS = [
  { key: 'peeko', name: 'Peeko', cat: 'Baby & kids wear',
    hero: 'A premium Amazon main product image of a soft pastel baby romper neatly folded on a pure white seamless background, a small woven label reading "Peeko" clearly visible on the collar.',
    life: 'A warm lifestyle photo of a smiling toddler in a soft "Peeko" branded romper in a bright sunlit nursery, cozy and aspirational.' },
  { key: 'minimalist', name: 'Minimalist', cat: 'Skincare',
    hero: 'A premium skincare serum bottle with a clean minimalist white label reading "Minimalist" and "10% Niacinamide", on a pale beige plaster pedestal, dermatological aesthetic.',
    life: 'A woman applying a "Minimalist" branded serum in a bright modern bathroom, dewy skin, clean beauty editorial.' },
  { key: 'thewholetruth', name: 'The Whole Truth', cat: 'Healthy food',
    hero: 'A "The Whole Truth" protein bar in a bold matte wrapper with the brand name clearly printed, standing upright with a few almonds and dark chocolate pieces, clean studio.',
    life: 'A person unwrapping a "The Whole Truth" protein bar at a sunlit gym, energetic clean-label lifestyle.' },
  { key: 'snitch', name: 'Snitch', cat: 'Mens fashion',
    hero: 'A folded premium mens shirt on a charcoal surface with a small woven tag reading "Snitch", moody fashion product shot.',
    life: 'A stylish young man in a "Snitch" branded shirt on an urban street, confident streetwear editorial.' },
  { key: 'superbottoms', name: 'SuperBottoms', cat: 'Baby care',
    hero: 'A colorful reusable cloth diaper with a soft waistband label reading "SuperBottoms", flat lay on a sage matte board, cheerful.',
    life: 'A mother holding a happy baby wearing a "SuperBottoms" cloth diaper in a bright warm nursery, tender and authentic.' },
  { key: 'pilgrim', name: 'Pilgrim', cat: 'Beauty',
    hero: 'A premium violet "Pilgrim" branded face serum bottle with clearly legible label, on a soft lilac gradient with dried flowers, luxe beauty.',
    life: 'A woman using a "Pilgrim" branded beauty product at a vanity with soft window light, aspirational glow.' },
  { key: 'wakao', name: 'Wakao Foods', cat: 'Plant-based food',
    hero: 'A "Wakao Foods" jackfruit product pack with the brand name clearly printed, beside fresh jackfruit slices on a rustic wooden board, appetizing.',
    life: 'A plated jackfruit burger with a "Wakao Foods" pack beside it on a bright kitchen counter, fresh plant-based lifestyle.' },
  { key: 'sleepcompany', name: 'The Sleep Company', cat: 'Home & sleep',
    hero: 'A premium mattress corner with a clean band label reading "The Sleep Company", on a light minimal bedroom set, product hero.',
    life: 'A couple relaxing on a "The Sleep Company" branded mattress in a serene sunlit bedroom, calm and premium.' },
]

async function genOne(prompt, file) {
  const res = await fetch(`${ENDPOINT.replace(/\/+$/, '')}/images/generations`, {
    method: 'POST',
    headers: { 'api-key': KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, prompt: `${prompt} ${QUAL}`, size: '1024x1024', quality: 'high', n: 1 }),
  })
  if (!res.ok) throw new Error(`${file}: ${res.status} ${(await res.text()).slice(0, 120)}`)
  const data = await res.json()
  const b64 = data.data?.[0]?.b64_json
  if (!b64) throw new Error(`${file}: no image`)
  await fs.writeFile(path.join(OUT, file), Buffer.from(b64, 'base64'))
  console.log(`✓ ${file}`)
}

async function main() {
  if (!ENDPOINT || !KEY) throw new Error('AZURE_IMAGE_ENDPOINT / AZURE_IMAGE_API_KEY not set')
  await fs.mkdir(OUT, { recursive: true })
  for (const b of BRANDS) {
    for (const [suffix, prompt] of [['hero', b.hero], ['life', b.life]]) {
      const file = `${b.key}-${suffix}.png`
      try { console.log(`… ${b.name} ${suffix}`); await genOne(prompt, file) }
      catch (e) { console.error(`✗ ${e.message}`) }
    }
  }
  console.log('done')
}
main()
