// Brand DNA builder. This is the brand-manager onboarding step: given a D2C site
// URL, a brand or product name, and optionally brand images, it synthesizes the
// Brand DNA (colors, fonts, voice, positioning, values, target customer). The result
// is saved on the org so the engine's brandStore reads it and every future generation
// is on-brand. It degrades gracefully: no site, or a site that will not load, still
// yields a usable DNA from the name alone.

import { generateJSON } from '@/lib/ai/text'

export interface BrandDnaInput {
  siteUrl?: string
  brandName?: string
  productName?: string
  images?: string[]
}

export interface BrandDna {
  brandName: string
  tagline?: string
  voice: string
  positioning: string
  values: string[]
  targetCustomer: string
  colors: { primary?: string; secondary?: string; accent?: string; neutrals?: string[] }
  fonts: { display?: string; body?: string }
  logoUrl?: string
  sources: string[]
}

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'

function pick(re: RegExp, html: string): string | undefined {
  const m = html.match(re)
  return m?.[1]?.trim() || undefined
}

/** Pull light signals from a site's HTML: title, description, theme color, dominant hexes. */
function extractSiteSignals(html: string) {
  const title = pick(/<title[^>]*>([^<]{2,160})<\/title>/i, html)
  const description =
    pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{10,300})["']/i, html) ||
    pick(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']{10,300})["']/i, html)
  const siteName = pick(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']{2,80})["']/i, html)
  const themeColor = pick(/<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)["']/i, html)
  const logoUrl =
    pick(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i, html) || undefined

  // Dominant colors: most frequent 6-digit hexes, ignoring pure black and white.
  const counts = new Map<string, number>()
  for (const m of html.matchAll(/#([0-9a-fA-F]{6})\b/g)) {
    const hex = `#${m[1].toLowerCase()}`
    if (hex === '#ffffff' || hex === '#000000') continue
    counts.set(hex, (counts.get(hex) ?? 0) + 1)
  }
  const topHexes = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([h]) => h)

  // Visible-ish text sample for the model, tags stripped and capped.
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 3000)

  return { title, description, siteName, themeColor, logoUrl, topHexes, text }
}

async function fetchSite(url: string): Promise<string | null> {
  try {
    const normalized = url.startsWith('http') ? url : `https://${url}`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 12000)
    const res = await fetch(normalized, { headers: { 'User-Agent': UA }, signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

export async function buildBrandDna(input: BrandDnaInput): Promise<BrandDna> {
  const sources: string[] = []
  let signals: ReturnType<typeof extractSiteSignals> | null = null

  if (input.siteUrl) {
    const html = await fetchSite(input.siteUrl)
    if (html) {
      signals = extractSiteSignals(html)
      sources.push(`site:${input.siteUrl}`)
    }
  }
  if (input.brandName) sources.push('brandName')
  if (input.productName) sources.push('productName')
  if (input.images?.length) sources.push(`images:${input.images.length}`)

  const brandName = input.brandName || signals?.siteName || signals?.title || input.productName || 'Brand'
  const colorHints = [signals?.themeColor, ...(signals?.topHexes ?? [])].filter(Boolean)

  const system =
    'You are a brand strategist. From the signals provided, infer a concise, honest Brand DNA. ' +
    'Return ONLY minified JSON with keys: tagline, voice, positioning, values (array of 3 to 5), ' +
    'targetCustomer, colors (object with primary, secondary, accent as hex strings), ' +
    'fonts (object with display, body font family names). Never use em dashes or en dashes.'

  const prompt = [
    `Brand or product name: ${brandName}.`,
    input.productName ? `Flagship product: ${input.productName}.` : '',
    signals?.description ? `Site description: ${signals.description}` : '',
    signals?.text ? `Site content sample: ${signals.text}` : '',
    colorHints.length ? `Observed brand colors (hex), most prominent first: ${colorHints.join(', ')}. Prefer these for the palette.` : '',
    'If a signal is missing, infer a sensible, understated default rather than leaving it blank.',
  ]
    .filter(Boolean)
    .join('\n')

  let parsed: Partial<BrandDna> = {}
  try {
    const { data } = await generateJSON<Partial<BrandDna>>(
      [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      { maxTokens: 700 },
    )
    parsed = data || {}
  } catch {
    // Model unavailable: fall back to name plus observed colors only.
  }

  const colors = {
    primary: parsed.colors?.primary || colorHints[0],
    secondary: parsed.colors?.secondary || colorHints[1],
    accent: parsed.colors?.accent || colorHints[2],
    neutrals: signals?.topHexes?.slice(3),
  }

  return {
    brandName,
    tagline: parsed.tagline,
    voice: parsed.voice || 'clear, warm, and confident',
    positioning: parsed.positioning || `${brandName} products for everyday quality`,
    values: Array.isArray(parsed.values) && parsed.values.length ? parsed.values.slice(0, 5) : ['quality', 'trust', 'value'],
    targetCustomer: parsed.targetCustomer || 'modern, quality-conscious shoppers',
    colors,
    fonts: { display: parsed.fonts?.display, body: parsed.fonts?.body },
    logoUrl: signals?.logoUrl,
    sources,
  }
}

/** Shape the DNA into the brandData JSON the brandStore adapter reads. */
export function dnaToBrandData(dna: BrandDna): Record<string, unknown> {
  return {
    colors: dna.colors,
    fonts: dna.fonts,
    voice: dna.voice,
    logoUrl: dna.logoUrl,
    dna: {
      tagline: dna.tagline,
      positioning: dna.positioning,
      values: dna.values,
      targetCustomer: dna.targetCustomer,
      sources: dna.sources,
    },
  }
}
