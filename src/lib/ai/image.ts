// Image Generation - Ideogram, Stability, Replicate, fal, OpenAI behind one interface.

import { config, getImageProvider } from '@/lib/config'
import type { ImagePrompt } from '@/lib/prompting/image-prompts'
import { serializePrompt } from '@/lib/prompting/image-prompts'

export type ImageResult = {
  url: string
  provider: 'azure' | 'ideogram' | 'stability' | 'replicate' | 'fal' | 'openai'
  model: string
  prompt: string
  seed?: number
  metadata?: Record<string, any>
}

// Pick the best image model for an asset type automatically (internal, not
// user-facing). gpt-image-2 is the default: fast (~30-60s), reliable, excellent
// quality, and the ONLY model that renders legible brand text/labels/callouts.
// FLUX is more photoreal but far slower (>110s -> route timeouts), so it stays an
// explicit opt-in override rather than the auto-pick.
export function bestModelFor(_assetType: string): string {
  return 'gpt-image-2'
}

// Rotate an array so index `off` becomes first — used to spread parallel image
// requests across the resource pool instead of hammering the first endpoint.
function rotate<T>(arr: T[], off: number): T[] {
  if (!arr.length || !off) return arr
  const k = ((off % arr.length) + arr.length) % arr.length
  return k ? [...arr.slice(k), ...arr.slice(0, k)] : arr
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function generateImage(prompt: ImagePrompt, opts: { model?: string; poolOffset?: number } = {}): Promise<ImageResult> {
  const provider = getImageProvider()
  if (!provider) {
    throw new Error('No image provider configured. Add AZURE_IMAGE_* (GPT-image-2 / FLUX), or IDEOGRAM_API_KEY / FAL_API_KEY / STABILITY_API_KEY / REPLICATE_API_TOKEN / OPENAI_API_KEY to .env')
  }

  // PRODUCT LOCK: when we have the real product photo, generate image-to-image
  // (edit) so the product stays identical. We do NOT fall back to text-to-image on
  // failure — that would invent a DIFFERENT-looking product. A retry inside the edit
  // walks the whole pool; if it still fails we throw so the asset is marked failed
  // (a missing image is far better than showing the wrong product).
  if (prompt.referenceImageUrl && provider === 'azure') {
    return await generateWithAzureEdit(prompt, prompt.referenceImageUrl, opts.poolOffset)
  }

  switch (provider) {
    case 'azure':
      return generateWithAzure(prompt, opts.model, opts.poolOffset)
    case 'ideogram':
      return generateWithIdeogram(prompt)
    case 'stability':
      return generateWithStability(prompt)
    case 'fal':
      return generateWithFal(prompt)
    case 'replicate':
      return generateWithReplicate(prompt)
    case 'openai':
      return generateWithOpenAI(prompt)
  }
}

// ===== Azure OpenAI - GPT-image-1 =====
// Returns base64 image data (gpt-image-1 does not return hosted URLs).
const ASPECT_TO_GPTIMAGE: Record<string, string> = {
  '1:1': '1024x1024',
  '4:5': '1024x1536',
  '3:4': '1024x1536',
  '9:16': '1024x1536',
  '16:9': '1536x1024',
  '4:3': '1536x1024',
}
// FLUX caps each dimension at 1440.
const ASPECT_TO_FLUX: Record<string, string> = {
  '1:1': '1024x1024',
  '4:5': '1152x1440',
  '3:4': '1088x1440',
  '9:16': '1024x1440',
  '16:9': '1440x1024',
  '4:3': '1440x1088',
}

async function generateWithAzure(prompt: ImagePrompt, model?: string, poolOffset = 0): Promise<ImageResult> {
  // If a non-default model is selected (e.g. FLUX), use that single resource;
  // otherwise use the gpt-image-2 redundancy pool.
  const models = config.azure.image.models as Record<string, any>
  const chosen = model && model !== 'gpt-image-2' ? models[model] : null
  const isFlux = !!(chosen && /flux/i.test(chosen.deployment))
  const size = (isFlux ? ASPECT_TO_FLUX : ASPECT_TO_GPTIMAGE)[prompt.technical.aspectRatio] || '1024x1024'
  const basePool = chosen && chosen.endpoint
    ? [{ endpoint: chosen.endpoint, apiKey: chosen.apiKey, deployment: chosen.deployment, apiVersion: '2025-04-01-preview' }]
    : config.azure.image.pool.length ? config.azure.image.pool : [config.azure.image as any]
  // Rotate the pool by poolOffset so parallel workers each START on a different
  // resource (spreads load across all 4 gpt-image-2 endpoints); failover still
  // walks the rest of the pool on 429/5xx.
  const pool = rotate(basePool, poolOffset)

  // Retry across the pool with backoff to ride out the S0 tier's per-minute limit.
  let lastErr = ''
  for (let round = 0; round < 6; round++) {
    let sawRateLimit = false
    for (const entry of pool) {
      const { endpoint, apiKey, deployment } = entry
      const useV1 = endpoint.includes('/openai/v1')
      const url = useV1
        ? `${endpoint}/images/generations`
        : `${endpoint}/openai/deployments/${deployment}/images/generations?api-version=${entry.apiVersion || '2025-04-01-preview'}`
      try {
        const body: any = { model: deployment, prompt: serializePrompt(prompt), n: 1, size }
        if (!isFlux) body.quality = prompt.technical.resolution === 'standard' ? 'medium' : 'high'
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'api-key': apiKey, Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          lastErr = `${res.status} ${await res.text()}`
          if (res.status === 429) { sawRateLimit = true; continue }
          if (res.status >= 500) continue
          throw new Error(`Azure ${deployment} error: ${lastErr}`)
        }
        const data = await res.json()
        const item = data.data?.[0] || {}
        const imageUrl = item.b64_json ? `data:image/png;base64,${item.b64_json}` : item.url
        if (!imageUrl) { lastErr = 'no image in response'; continue }
        return {
          url: imageUrl,
          provider: 'azure',
          model: deployment,
          prompt: serializePrompt(prompt),
          metadata: { size, revisedPrompt: item.revised_prompt },
        }
      } catch (e: any) {
        lastErr = e.message
        continue
      }
    }
    if (round < 5) await sleep(sawRateLimit ? (round + 1) * 12000 : 3000)
  }
  throw new Error(`Azure image generation failed after retries: ${lastErr}`)
}

// Image-to-image via gpt-image-2 EDITS: takes the real product photo and
// re-renders only the scene/background, keeping the product 100% identical.
// This is what guarantees the generated creative shows the ACTUAL product.
async function generateWithAzureEdit(prompt: ImagePrompt, referenceUrl: string, poolOffset = 0): Promise<ImageResult> {
  const size = ASPECT_TO_GPTIMAGE[prompt.technical.aspectRatio] || '1024x1024'
  const pool = rotate(config.azure.image.pool.length ? config.azure.image.pool : [config.azure.image as any], poolOffset)

  // Download the real product image.
  const imgRes = await fetch(referenceUrl, { signal: AbortSignal.timeout(20000) })
  if (!imgRes.ok) throw new Error(`reference image fetch ${imgRes.status}`)
  const contentType = imgRes.headers.get('content-type') || 'image/jpeg'
  const buf = Buffer.from(await imgRes.arrayBuffer())
  if (buf.length < 1000) throw new Error('reference image too small')

  // Strong preservation instruction + the scene we want. The PRINT/PATTERN and
  // COLOUR are the #1 rule — image-to-image tends to reinterpret the design, so we
  // forbid that explicitly and demand pixel-faithful reproduction of the reference.
  const editPrompt =
    `Use the product shown in the provided reference image and keep it 100% IDENTICAL in every render. ` +
    `THE PRODUCT'S PRINT/PATTERN IS SACRED — reproduce the EXACT same motif, floral/graphic design, its layout, scale, spacing and placement pixel-faithfully from the reference. Do NOT redraw, reinterpret, invent, simplify, rearrange or vary the pattern in ANY way; it must be recognisably the SAME product with the SAME print across all images. ` +
    `Preserve the EXACT original colours, saturation and vibrancy of the product (match the reference precisely — same shades); do NOT desaturate, dull, lighten, wash out, fade or shift any hue. Keep the same shape, materials, logo, labels and text. ` +
    `Change ONLY the background, scene and lighting as follows: ${serializePrompt(prompt)}`

  // Retry across the pool with backoff: the S0 tier has a low per-minute call
  // limit, so on 429 we rotate resources and, if the whole pool is momentarily
  // rate-limited, wait for the window to reset instead of failing the asset.
  let lastErr = ''
  for (let round = 0; round < 6; round++) {
    let sawRateLimit = false
    for (const entry of pool) {
      const { endpoint, apiKey, deployment } = entry
      const useV1 = endpoint.includes('/openai/v1')
      const url = useV1
        ? `${endpoint}/images/edits`
        : `${endpoint}/openai/deployments/${deployment}/images/edits?api-version=${entry.apiVersion || '2025-04-01-preview'}`
      try {
        const form = new FormData()
        const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
        form.append('image', new Blob([new Uint8Array(buf)], { type: contentType }), `product.${ext}`)
        form.append('prompt', editPrompt)
        form.append('n', '1')
        form.append('size', size)
        form.append('quality', prompt.technical.resolution === 'standard' ? 'medium' : 'high')
        form.append('input_fidelity', 'high')
        if (useV1) form.append('model', deployment)
        const res = await fetch(url, { method: 'POST', headers: { 'api-key': apiKey, Authorization: `Bearer ${apiKey}` }, body: form })
        if (!res.ok) {
          lastErr = `${res.status} ${(await res.text()).slice(0, 200)}`
          if (res.status === 429) { sawRateLimit = true; continue }
          if (res.status >= 500) continue
          throw new Error(`Azure edit ${deployment}: ${lastErr}`)
        }
        const data = await res.json()
        const b64 = data.data?.[0]?.b64_json
        if (!b64) { lastErr = 'no image in edit response'; continue }
        return {
          url: `data:image/png;base64,${b64}`,
          provider: 'azure',
          model: deployment,
          prompt: editPrompt,
          metadata: { size, mode: 'edit', reference: referenceUrl },
        }
      } catch (e: any) {
        lastErr = e.message
        continue
      }
    }
    // Whole pool failed this round. If rate-limited, wait for the per-minute
    // window to reset (12s, 24s, …); otherwise a short pause before retrying.
    if (round < 5) await sleep(sawRateLimit ? (round + 1) * 12000 : 3000)
  }
  throw new Error(`Azure image edit failed after retries: ${lastErr}`)
}

const ASPECT_TO_IDEOGRAM: Record<string, string> = {
  '1:1': 'ASPECT_RATIO_1_1',
  '4:5': 'ASPECT_RATIO_4_5',
  '16:9': 'ASPECT_RATIO_16_9',
  '9:16': 'ASPECT_RATIO_9_16',
  '3:4': 'ASPECT_RATIO_3_4',
  '4:3': 'ASPECT_RATIO_4_3',
}

async function generateWithIdeogram(prompt: ImagePrompt): Promise<ImageResult> {
  const res = await fetch('https://api.ideogram.ai/generate', {
    method: 'POST',
    headers: {
      'Api-Key': config.ideogram.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_request: {
        prompt: serializePrompt(prompt),
        aspect_ratio: ASPECT_TO_IDEOGRAM[prompt.technical.aspectRatio] || 'ASPECT_RATIO_1_1',
        model: 'V_2',
        magic_prompt_option: 'OFF',
        style_type: 'REALISTIC',
      },
    }),
  })
  if (!res.ok) throw new Error(`Ideogram error: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return {
    url: data.data[0].url,
    provider: 'ideogram',
    model: 'V_2',
    prompt: serializePrompt(prompt),
  }
}

async function generateWithStability(prompt: ImagePrompt): Promise<ImageResult> {
  const aspectMap: Record<string, string> = {
    '1:1': '1:1', '4:5': '4:5', '16:9': '16:9', '9:16': '9:16', '3:4': '3:4', '4:3': '4:3',
  }
  const formData = new FormData()
  formData.append('prompt', serializePrompt(prompt))
  formData.append('output_format', 'png')
  formData.append('aspect_ratio', aspectMap[prompt.technical.aspectRatio] || '1:1')
  if (prompt.negativePrompts.length) {
    formData.append('negative_prompt', prompt.negativePrompts.join(', '))
  }

  const res = await fetch('https://api.stability.ai/v2beta/stable-image/generate/sd3', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.stability.apiKey}`,
      Accept: 'image/*',
    },
    body: formData,
  })
  if (!res.ok) throw new Error(`Stability error: ${res.status} ${await res.text()}`)

  const buffer = await res.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')
  return {
    url: `data:image/png;base64,${base64}`,
    provider: 'stability',
    model: 'sd3',
    prompt: serializePrompt(prompt),
  }
}

async function generateWithFal(prompt: ImagePrompt): Promise<ImageResult> {
  const res = await fetch('https://fal.run/fal-ai/flux/schnell', {
    method: 'POST',
    headers: {
      Authorization: `Key ${config.fal.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: serializePrompt(prompt),
      image_size: prompt.technical.aspectRatio,
      num_inference_steps: 4,
    }),
  })
  if (!res.ok) throw new Error(`fal.ai error: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return {
    url: data.images[0].url,
    provider: 'fal',
    model: 'flux-schnell',
    prompt: serializePrompt(prompt),
  }
}

async function generateWithReplicate(prompt: ImagePrompt): Promise<ImageResult> {
  const res = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      Authorization: `Token ${config.replicate.apiKey}`,
      'Content-Type': 'application/json',
      Prefer: 'wait',
    },
    body: JSON.stringify({
      input: {
        prompt: serializePrompt(prompt),
        aspect_ratio: prompt.technical.aspectRatio,
        negative_prompt: prompt.negativePrompts.join(', '),
      },
      model: 'stability-ai/sdxl',
    }),
  })
  if (!res.ok) throw new Error(`Replicate error: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return {
    url: data.output?.[0] || data.output,
    provider: 'replicate',
    model: 'sdxl',
    prompt: serializePrompt(prompt),
  }
}

async function generateWithOpenAI(prompt: ImagePrompt): Promise<ImageResult> {
  const sizeMap: Record<string, string> = {
    '1:1': '1024x1024',
    '16:9': '1792x1024',
    '9:16': '1024x1792',
  }
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.openai.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: serializePrompt(prompt),
      n: 1,
      size: sizeMap[prompt.technical.aspectRatio] || '1024x1024',
      quality: prompt.technical.resolution === '4k' ? 'hd' : 'standard',
    }),
  })
  if (!res.ok) throw new Error(`OpenAI error: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return {
    url: data.data[0].url,
    provider: 'openai',
    model: 'dall-e-3',
    prompt: serializePrompt(prompt),
  }
}
