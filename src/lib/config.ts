// Central config - single source of truth for all API keys + platform settings.
// Every key is optional. The platform degrades gracefully (demo data) when a
// provider is missing, and lights up automatically when keys are present.
//
// PRIMARY AI STACK: Azure AI Foundry
//   - Text  (Claude Sonnet)  -> Azure AI Foundry model inference
//   - Image (GPT-image-1)    -> Azure OpenAI
//   - Video (Sora)           -> Azure OpenAI
// Direct OpenAI/Anthropic/etc. remain as fallbacks.

export type PoolEntry = { endpoint: string; apiKey: string; deployment: string; apiVersion: string }

// Build a redundancy pool from numbered env vars, e.g. for prefix "AZURE_IMAGE":
//   AZURE_IMAGE_ENDPOINT / _API_KEY / _DEPLOYMENT  (primary)
//   AZURE_IMAGE_ENDPOINT_2 / _API_KEY_2 / _DEPLOYMENT_2  (fallback) ... up to _6
// On a 429/5xx the adapter rotates to the next entry.
function buildPool(prefix: string): PoolEntry[] {
  const out: PoolEntry[] = []
  for (let i = 1; i <= 6; i++) {
    const s = i === 1 ? '' : `_${i}`
    const endpoint = (process.env[`${prefix}_ENDPOINT${s}`] || '').replace(/\/+$/, '')
    const apiKey = process.env[`${prefix}_API_KEY${s}`] || ''
    if (!endpoint || !apiKey) continue
    out.push({
      endpoint,
      apiKey,
      deployment: process.env[`${prefix}_DEPLOYMENT${s}`] || process.env[`${prefix}_MODEL${s}`] || 'gpt-image-2',
      apiVersion: process.env[`${prefix}_API_VERSION${s}`] || '2025-04-01-preview',
    })
  }
  return out
}

export const config = {
  // ===== Azure AI Foundry (primary) =====
  azure: {
    // Text - Claude (Opus 4.8) served via Azure AI Foundry.
    // Accepts either AZURE_FOUNDRY_* or the ANTHROPIC_*/ANTHROPIC_AZURE_RESOURCE vars.
    text: {
      endpoint: (
        process.env.AZURE_FOUNDRY_ENDPOINT ||
        (process.env.ANTHROPIC_AZURE_RESOURCE ? `https://${process.env.ANTHROPIC_AZURE_RESOURCE}.services.ai.azure.com` : '')
      ).replace(/\/+$/, ''),
      apiKey: process.env.AZURE_FOUNDRY_API_KEY || process.env.ANTHROPIC_API_KEY || '',
      deployment:
        process.env.AZURE_FOUNDRY_SONNET_DEPLOYMENT || process.env.ANTHROPIC_DEFAULT_MODEL || 'claude-opus-4-8',
      apiVersion: process.env.AZURE_FOUNDRY_API_VERSION || '',
      maxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS || '4096', 10),
      // 'anthropic' = /anthropic/v1/messages; 'openai' = /chat/completions.
      // Azure Foundry Claude models use the native Anthropic protocol.
      protocol: (process.env.AZURE_FOUNDRY_PROTOCOL ||
        (process.env.ANTHROPIC_AZURE_RESOURCE ? 'anthropic' : 'openai')) as 'openai' | 'anthropic',
    },
    // Image - GPT-image-2 via Azure AI Foundry.
    // A POOL of resources is supported for redundancy: on 429/5xx the adapter
    // rotates to the next resource, so heavy batch generation never stalls.
    image: {
      endpoint: (process.env.AZURE_IMAGE_ENDPOINT || process.env.AZURE_OPENAI_ENDPOINT || '').replace(/\/+$/, ''),
      apiKey: process.env.AZURE_IMAGE_API_KEY || process.env.AZURE_OPENAI_API_KEY || '',
      deployment: process.env.AZURE_IMAGE_DEPLOYMENT || 'gpt-image-2',
      apiVersion: process.env.AZURE_IMAGE_API_VERSION || '2025-04-01-preview',
      pool: buildPool('AZURE_IMAGE'),
      // Selectable alternate image models (paid resource). gpt-image-2 stays the
      // default (best at brand text); FLUX = best pure photoreal.
      models: (() => {
        const ep = (process.env.AZURE_PAID_ENDPOINT || '').replace(/\/+$/, '')
        const key = process.env.AZURE_PAID_API_KEY || ''
        const mk = (deployment: string, label: string, textSafe: boolean) => ({ endpoint: ep, apiKey: key, deployment, label, textSafe })
        const list: Record<string, { endpoint: string; apiKey: string; deployment: string; label: string; textSafe: boolean }> = {
          'gpt-image-2': { endpoint: '', apiKey: '', deployment: 'gpt-image-2', label: 'GPT-image-2 (best for brand text)', textSafe: true },
        }
        if (ep && key) {
          list['flux-1.1-pro'] = mk('FLUX-1.1-pro', 'FLUX 1.1 Pro (photoreal)', false)
          list['flux-kontext'] = mk('FLUX.1-Kontext-pro', 'FLUX Kontext (photoreal)', false)
          list['gpt-image-1.5'] = mk('gpt-image-1.5', 'GPT-image-1.5', true)
        }
        return list
      })(),
    },
    // Video - Sora-2 via Azure (/openai/v1/videos?api-version=preview).
    // Endpoint is the resource base (WITHOUT /openai/v1); adapter appends it.
    video: {
      endpoint: (process.env.AZURE_VIDEO_ENDPOINT || '').replace(/\/+$/, ''),
      apiKey: process.env.AZURE_VIDEO_API_KEY || '',
      deployment: process.env.AZURE_VIDEO_MODEL || process.env.AZURE_VIDEO_DEPLOYMENT || 'sora-2',
      apiVersion: process.env.AZURE_VIDEO_API_VERSION || 'preview',
    },
    // Voiceover - gpt-4o-mini-tts (/openai/v1/audio/speech).
    // Endpoint is expected to already include /openai/v1.
    tts: {
      endpoint: (process.env.AZURE_TTS_ENDPOINT || '').replace(/\/+$/, ''),
      apiKey: process.env.AZURE_TTS_API_KEY || '',
      deployment: process.env.AZURE_TTS_DEPLOYMENT || 'gpt-4o-mini-tts',
      voice: process.env.AZURE_TTS_VOICE || 'onyx',
    },
  },

  // ===== Google Vertex AI (Imagen-4 image, Veo-3 video) =====
  gcp: {
    projectId: process.env.GCP_PROJECT_ID || '',
    region: process.env.GCP_REGION || 'us-central1',
    imagenModel: process.env.GCP_IMAGEN_MODEL || 'imagen-4.0-generate-001',
    veoModel: process.env.GCP_VEO_MODEL || 'veo-3.0-generate-001',
  },

  // ===== Direct LLM providers (fallback) =====
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  },

  // ===== Image providers (fallback) =====
  stability: { apiKey: process.env.STABILITY_API_KEY || '' },
  ideogram: { apiKey: process.env.IDEOGRAM_API_KEY || '' },
  replicate: { apiKey: process.env.REPLICATE_API_TOKEN || '' },
  fal: { apiKey: process.env.FAL_API_KEY || '' },

  // ===== Amazon / SERP =====
  scraperapi: { apiKey: process.env.SCRAPERAPI_KEY || '' },
  serpapi: { apiKey: process.env.SERPAPI_KEY || '' },
  rainforest: { apiKey: process.env.RAINFOREST_API_KEY || '' },
  keepa: { apiKey: process.env.KEEPA_API_KEY || '' },
  // Local curl_cffi microservice (Chrome TLS impersonation) - our own scraper.
  // marketplaceUrl: optional separate scraper for non-Amazon marketplaces (Flipkart/
  // Myntra/Noon/Namshi) — point it at a residential-IP scraper (e.g. a tunnelled
  // machine) to beat their datacenter bot-walls. Falls back to the main scraper.
  scraperService: {
    url: process.env.SCRAPER_SERVICE_URL || '',
    marketplaceUrl: process.env.MARKETPLACE_SCRAPER_URL || '',
  },

  // ===== Email =====
  resend: {
    apiKey: process.env.RESEND_API_KEY || '',
    from: process.env.RESEND_FROM || 'ArrowLabs <hello@arrowlabs.art>',
  },

  // ===== Amazon associate =====
  amazon: {
    associateTag: process.env.AMAZON_ASSOCIATE_TAG || 'arrowlabs-20',
  },

  // ===== Auth / admin =====
  auth: {
    secret: process.env.NEXTAUTH_SECRET || 'dev-insecure-secret-change-me',
    adminToken: process.env.ADMIN_TOKEN || 'arrowlabs-admin',
    adminEmails: (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
    // Google OAuth (optional). Set GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET to
    // enable "Continue with Google" on the login page.
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    },
  },

  // Amazon Selling Partner API - 1-click push to Seller Central. Activates when
  // the seller's SP-API app credentials are set.
  spapi: {
    clientId: process.env.SPAPI_CLIENT_ID || '',
    clientSecret: process.env.SPAPI_CLIENT_SECRET || '',
    refreshToken: process.env.SPAPI_REFRESH_TOKEN || '',
    sellerId: process.env.SPAPI_SELLER_ID || '',
    endpoint: process.env.SPAPI_ENDPOINT || 'https://sellingpartnerapi-na.amazon.com',
    marketplaceId: process.env.SPAPI_MARKETPLACE_ID || 'ATVPDKIKX0DER', // US
  },

  // ===== Billing / trial / credits =====
  billing: {
    trialDays: parseInt(process.env.TRIAL_DAYS || "7", 10),
    trialCredits: parseInt(process.env.TRIAL_CREDITS || '500', 10),
    // Razorpay is intentionally left as a stub for later wiring.
    razorpay: {
      keyId: process.env.RAZORPAY_KEY_ID || '',
      keySecret: process.env.RAZORPAY_KEY_SECRET || '',
      webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
    },
    // How many INR (paise) one credit costs when topping up. 1 credit = ₹2 default.
    creditPricePaise: parseInt(process.env.CREDIT_PRICE_PAISE || '200', 10),
  },

  app: {
    url: process.env.APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000',
    nodeEnv: process.env.NODE_ENV || 'development',
    rateLimitPerMin: parseInt(process.env.RATE_LIMIT_PER_MIN || '20', 10),
  },

  db: {
    url: process.env.DATABASE_URL || 'file:./db/custom.db',
  },
} as const

// ===== Provider detection =====

// Which LLM provider to use (Azure Foundry first, then direct APIs).
export function getLLMProvider(): 'azure' | 'openai' | 'anthropic' | 'gemini' | null {
  if (config.azure.text.endpoint && config.azure.text.apiKey) return 'azure'
  if (config.openai.apiKey) return 'openai'
  if (config.anthropic.apiKey) return 'anthropic'
  if (config.gemini.apiKey) return 'gemini'
  return null
}

// Which image provider to use (Azure GPT-image-1 first).
export function getImageProvider(): 'azure' | 'ideogram' | 'fal' | 'stability' | 'replicate' | 'openai' | null {
  if (config.azure.image.endpoint && config.azure.image.apiKey) return 'azure'
  if (config.ideogram.apiKey) return 'ideogram'
  if (config.fal.apiKey) return 'fal'
  if (config.stability.apiKey) return 'stability'
  if (config.replicate.apiKey) return 'replicate'
  if (config.openai.apiKey) return 'openai'
  return null
}

// Which video provider to use. Sora (Azure) is the default (works serverlessly);
// Veo-3 (GCP) is preferred when GCP is enabled, but needs gcloud/ADC auth.
export function getVideoProvider(): 'azure' | null {
  // Video is Sora-2 (Azure) ONLY. Veo / any Google video model is intentionally
  // disabled — do not fall back to GCP (avoids Vertex/Veo billing entirely).
  if (config.azure.video.endpoint && config.azure.video.apiKey) return 'azure'
  return null
}

export function isGcpEnabled(): boolean {
  return !!config.gcp.projectId
}

// Which voiceover provider to use (Azure TTS).
export function getVoiceProvider(): 'azure' | null {
  if (config.azure.tts.endpoint && config.azure.tts.apiKey) return 'azure'
  return null
}

// Which Amazon data provider to use.
export function getAmazonProvider(): 'local' | 'rainforest' | 'serpapi' | 'scraperapi' | 'html' {
  if (config.scraperService.url) return 'local' // our curl_cffi service (preferred)
  if (config.rainforest.apiKey) return 'rainforest'
  if (config.serpapi.apiKey) return 'serpapi'
  if (config.scraperapi.apiKey) return 'scraperapi'
  return 'html' // free fallback, rate-limited
}

// Health check - what's configured?
export function getHealth() {
  const llm = getLLMProvider()
  return {
    llm,
    llmModel: llm === 'azure' ? config.azure.text.deployment : llm === 'anthropic' ? config.anthropic.model : llm === 'openai' ? config.openai.model : null,
    image: getImageProvider(),
    imageModel: getImageProvider() === 'azure' ? config.azure.image.deployment : null,
    video: getVideoProvider(),
    videoModel: getVideoProvider() === 'azure' ? config.azure.video.deployment : null,
    gcp: isGcpEnabled(),
    voice: getVoiceProvider(),
    amazon: getAmazonProvider(),
    keepa: !!config.keepa.apiKey,
    resend: !!config.resend.apiKey,
    razorpay: !!config.billing.razorpay.keyId,
    trialDays: config.billing.trialDays,
    trialCredits: config.billing.trialCredits,
    timestamp: new Date().toISOString(),
  }
}
