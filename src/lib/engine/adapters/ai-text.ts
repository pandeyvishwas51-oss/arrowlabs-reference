// AiText port adapter. Delegates to the existing multi-provider generateText
// (Azure Claude Opus first). The engine depends only on the small AiText
// interface, so swapping providers later never touches the modules.

import type { AiText } from '@/core'
import { generateText } from '@/lib/ai/text'

export function createAiTextAdapter(): AiText {
  return {
    async complete(prompt, opts) {
      const messages = opts?.system
        ? ([
            { role: 'system' as const, content: opts.system },
            { role: 'user' as const, content: prompt },
          ])
        : ([{ role: 'user' as const, content: prompt }])
      const result = await generateText(messages, { maxTokens: opts?.maxTokens })
      return result.content
    },
  }
}
