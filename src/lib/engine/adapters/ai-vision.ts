// AiVision adapter. Powers the vision sanity validator by asking Azure Claude
// (Anthropic vision protocol) what looks wrong in a generated image. Only usable
// when the text model is configured with the Anthropic protocol; boot registers it
// conditionally, so when it is absent the validator simply skips instead of failing.

import type { AiVision } from '@/core'
import { config } from '@/lib/config'

/** True when the Azure Claude config can serve a vision request. */
export function visionAvailable(): boolean {
  const t = config.azure.text
  return Boolean(t.apiKey && t.endpoint && t.protocol === 'anthropic')
}

async function fetchAsBase64(url: string): Promise<{ data: string; mediaType: string }> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`vision: could not fetch image (${res.status})`)
  const mediaType = res.headers.get('content-type')?.split(';')[0] || 'image/jpeg'
  const buf = Buffer.from(await res.arrayBuffer())
  return { data: buf.toString('base64'), mediaType }
}

export function createAiVision(): AiVision {
  return {
    async critique(imageUrl: string, question: string): Promise<string> {
      const { endpoint, apiKey, deployment } = config.azure.text
      const { data, mediaType } = await fetchAsBase64(imageUrl)
      const url = endpoint.includes('/v1/messages') ? endpoint : `${endpoint}/anthropic/v1/messages`

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: deployment,
          max_tokens: 300,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'image', source: { type: 'base64', media_type: mediaType, data } },
                { type: 'text', text: question },
              ],
            },
          ],
        }),
      })
      if (!res.ok) throw new Error(`vision: model returned ${res.status}`)
      const body = await res.json()
      return body.content?.[0]?.text ?? ''
    },
  }
}
