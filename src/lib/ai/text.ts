// Text Generation - OpenAI, Anthropic, Gemini behind one interface.
// First available provider wins. All return the same shape.

import { config, getLLMProvider } from '@/lib/config'

export type TextMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type TextOptions = {
  temperature?: number
  maxTokens?: number
  json?: boolean // force JSON output
}

export type TextResult = {
  content: string
  provider: 'azure' | 'openai' | 'anthropic' | 'gemini'
  model: string
  tokensIn?: number
  tokensOut?: number
}

// POST with retry on transient upstream failures (429 rate-limit, 5xx). Azure
// rate limits usually clear within a couple seconds, so a short backoff turns a
// user-facing 500 into a successful retry.
async function postWithRetry(url: string, init: RequestInit, tries = 4): Promise<Response> {
  let res: Response | null = null
  for (let i = 0; i < tries; i++) {
    res = await fetch(url, init)
    if (res.status !== 429 && res.status !== 503 && res.status !== 502 && res.status !== 500) return res
    if (i < tries - 1) await new Promise((r) => setTimeout(r, 800 * Math.pow(2, i))) // 0.8s,1.6s,3.2s
  }
  return res as Response
}

// Never leak provider name / model id / region to the client. Map upstream
// failures to a clean, retryable error with the right HTTP status.
function llmError(status: number): Error & { status: number } {
  const msg =
    status === 429 || status === 503 || status === 502
      ? 'The AI service is briefly at capacity. Please try again in a moment.'
      : 'The AI service is temporarily unavailable. Please try again.'
  const e = new Error(msg) as Error & { status: number }
  e.status = status === 429 ? 503 : status >= 500 ? 503 : 502
  return e
}

export async function generateText(
  messages: TextMessage[],
  options: TextOptions = {},
): Promise<TextResult> {
  const provider = getLLMProvider()
  if (!provider) {
    throw new Error('No LLM provider configured. Add AZURE_FOUNDRY_* (Claude Sonnet), or OPENAI_API_KEY / ANTHROPIC_API_KEY / GEMINI_API_KEY to .env')
  }

  switch (provider) {
    case 'azure':
      return generateWithAzure(messages, options)
    case 'openai':
      return generateWithOpenAI(messages, options)
    case 'anthropic':
      return generateWithAnthropic(messages, options)
    case 'gemini':
      return generateWithGemini(messages, options)
  }
}

// ===== Azure AI Foundry (Claude Sonnet) =====
// Supports two protocols, selected by AZURE_FOUNDRY_PROTOCOL:
//   - 'openai'    -> OpenAI-compatible /chat/completions (default; works for most
//                    Foundry serverless deployments incl. Claude via the unified API)
//   - 'anthropic' -> Anthropic Messages API /v1/messages at the Azure endpoint
async function generateWithAzure(messages: TextMessage[], options: TextOptions): Promise<TextResult> {
  const { endpoint, apiKey, deployment, apiVersion, protocol, maxTokens } = config.azure.text

  if (protocol === 'anthropic') {
    const system = messages.find((m) => m.role === 'system')?.content
    const userMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }))
    // Azure Foundry Claude: native Anthropic Messages API at /anthropic/v1/messages.
    const url = endpoint.includes('/v1/messages') ? endpoint : `${endpoint}/anthropic/v1/messages`
    const res = await postWithRetry(url, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      // Note: newer Claude models (Opus 4.8) reject `temperature` - omit it.
      body: JSON.stringify({
        model: deployment,
        system,
        messages: userMessages,
        max_tokens: options.maxTokens ?? maxTokens ?? 1500,
      }),
    })
    if (!res.ok) throw llmError(res.status)
    const data = await res.json()
    return {
      content: data.content?.[0]?.text ?? '',
      provider: 'azure',
      model: deployment,
      tokensIn: data.usage?.input_tokens,
      tokensOut: data.usage?.output_tokens,
    }
  }

  // OpenAI-compatible chat completions.
  // Azure OpenAI-style deployment route first; if endpoint already includes the
  // full path the caller can point AZURE_FOUNDRY_ENDPOINT at it.
  const url = endpoint.includes('/chat/completions')
    ? `${endpoint}?api-version=${apiVersion}`
    : `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`
  const res = await postWithRetry(url, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: deployment,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 1500,
      response_format: options.json ? { type: 'json_object' } : undefined,
    }),
  })
  if (!res.ok) throw llmError(res.status)
  const data = await res.json()
  return {
    content: data.choices?.[0]?.message?.content ?? '',
    provider: 'azure',
    model: deployment,
    tokensIn: data.usage?.prompt_tokens,
    tokensOut: data.usage?.completion_tokens,
  }
}

async function generateWithOpenAI(messages: TextMessage[], options: TextOptions): Promise<TextResult> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.openai.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.openai.model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 1000,
      response_format: options.json ? { type: 'json_object' } : undefined,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw llmError(res.status)
  }
  const data = await res.json()
  return {
    content: data.choices[0].message.content,
    provider: 'openai',
    model: config.openai.model,
    tokensIn: data.usage?.prompt_tokens,
    tokensOut: data.usage?.completion_tokens,
  }
}

async function generateWithAnthropic(messages: TextMessage[], options: TextOptions): Promise<TextResult> {
  const system = messages.find((m) => m.role === 'system')?.content
  const userMessages = messages.filter((m) => m.role !== 'system').map((m) => ({
    role: m.role,
    content: m.content,
  }))

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': config.anthropic.apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.anthropic.model,
      system,
      messages: userMessages,
      max_tokens: options.maxTokens ?? 1000,
      temperature: options.temperature ?? 0.7,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw llmError(res.status)
  }
  const data = await res.json()
  return {
    content: data.content[0].text,
    provider: 'anthropic',
    model: config.anthropic.model,
    tokensIn: data.usage?.input_tokens,
    tokensOut: data.usage?.output_tokens,
  }
}

async function generateWithGemini(messages: TextMessage[], options: TextOptions): Promise<TextResult> {
  const system = messages.find((m) => m.role === 'system')?.content || ''
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.model}:generateContent?key=${config.gemini.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxTokens ?? 1000,
          responseMimeType: options.json ? 'application/json' : undefined,
        },
      }),
    },
  )
  if (!res.ok) {
    const err = await res.text()
    throw llmError(res.status)
  }
  const data = await res.json()
  return {
    content: data.candidates[0].content.parts[0].text,
    provider: 'gemini',
    model: config.gemini.model,
  }
}

// Convenience: generate JSON
export async function generateJSON<T = any>(
  messages: TextMessage[],
  options: TextOptions = {},
): Promise<{ data: T; raw: TextResult }> {
  const result = await generateText(messages, { ...options, json: true })
  try {
    const data = JSON.parse(result.content) as T
    return { data, raw: result }
  } catch (e) {
    // Try to extract JSON from the response
    const match = result.content.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
    if (match) {
      const data = JSON.parse(match[0]) as T
      return { data, raw: result }
    }
    throw new Error(`LLM did not return valid JSON: ${result.content.slice(0, 200)}`)
  }
}
