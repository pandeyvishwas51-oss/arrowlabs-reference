import { NextRequest } from 'next/server'
import { z } from 'zod'
import { ok, fail, guardRate, requireActor, wrapError } from '@/lib/api'
import { generateVoiceover } from '@/lib/ai/voice'
import { getVoiceProvider } from '@/lib/config'

export const maxDuration = 120

const schema = z.object({
  text: z.string().trim().min(1).max(4000),
  voice: z.string().optional(),
  instructions: z.string().optional(),
})

// Generate a voiceover (mp3) from text. Metered but not charged separately
// (bundled into video credits when used by VideoLab; free-standing here).
export async function POST(req: NextRequest) {
  const limited = guardRate(req, 'tts')
  if (limited) return limited
  const res = await requireActor(req, { needGenerate: true })
  if ('error' in res) return res.error
  if (!getVoiceProvider()) return fail('No voice provider configured.', 503)

  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) return fail('Invalid input', 422)

  try {
    const result = await generateVoiceover(parsed.data)
    return ok(result)
  } catch (err) {
    return wrapError('api.tts', err)
  }
}
