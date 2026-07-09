// Voiceover - gpt-4o-mini-tts via Azure (/openai/v1/audio/speech).
// Turns a script into an mp3, persisted to public/generated. Used by VideoLab
// to narrate UGC scripts.

import { config, getVoiceProvider } from '@/lib/config'
import { saveBuffer } from '@/lib/storage'

export type VoiceRequest = {
  text: string
  voice?: string // alloy | echo | fable | onyx | nova | shimmer ...
  instructions?: string
  format?: 'mp3' | 'wav' | 'opus'
}

export type VoiceResult = {
  url: string
  provider: 'azure'
  model: string
  voice: string
  format: string
}

export async function generateVoiceover(req: VoiceRequest): Promise<VoiceResult> {
  if (!getVoiceProvider()) {
    throw new Error('No voice provider configured. Add AZURE_TTS_ENDPOINT / AZURE_TTS_API_KEY to .env')
  }
  const { endpoint, apiKey, deployment, voice } = config.azure.tts
  const format = req.format || 'mp3'
  const chosenVoice = req.voice || voice
  // v1 surface: endpoint already includes /openai/v1 -> POST /audio/speech
  const url = endpoint.includes('/openai/v1')
    ? `${endpoint}/audio/speech`
    : `${endpoint}/openai/v1/audio/speech`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'api-key': apiKey, Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: deployment,
      input: req.text,
      voice: chosenVoice,
      instructions: req.instructions,
      response_format: format,
    }),
  })
  if (!res.ok) throw new Error(`Azure TTS error: ${res.status} ${await res.text()}`)
  const buffer = Buffer.from(await res.arrayBuffer())
  const savedUrl = await saveBuffer(buffer, format, 'voice')
  return { url: savedUrl, provider: 'azure', model: deployment, voice: chosenVoice, format }
}
