// Keyword Research + Ranking Tracker
// - researchKeywords: from a seed keyword, expand via Amazon autocomplete + related searches
// - trackRank: for a keyword + ASIN, find its current rank on Amazon SERP

import { config } from '@/lib/config'
import { getAmazonDomain } from '../scraper/asin'
import { crawlCompetitors } from '../scraper/competitors'

export type KeywordResearch = {
  seed: string
  keywords: {
    keyword: string
    source: 'autocomplete' | 'related' | 'seed'
    intent: 'informational' | 'commercial' | 'transactional'
  }[]
  provider: string
}

// Expand a seed keyword using Amazon autocomplete (free, no key) + related searches
export async function researchKeywords(seed: string, marketplace: string = 'US'): Promise<KeywordResearch> {
  console.log(`[keywords] researching: "${seed}"`)

  const [autocomplete, related] = await Promise.all([
    fetchAutocomplete(seed, marketplace),
    fetchRelated(seed, marketplace),
  ])

  const seen = new Set<string>()
  const keywords: KeywordResearch['keywords'] = []

  // Seed
  if (!seen.has(seed.toLowerCase())) {
    keywords.push({ keyword: seed, source: 'seed', intent: detectIntent(seed) })
    seen.add(seed.toLowerCase())
  }

  // Autocomplete
  for (const k of autocomplete) {
    if (!seen.has(k.toLowerCase())) {
      keywords.push({ keyword: k, source: 'autocomplete', intent: detectIntent(k) })
      seen.add(k.toLowerCase())
    }
  }

  // Related
  for (const k of related) {
    if (!seen.has(k.toLowerCase())) {
      keywords.push({ keyword: k, source: 'related', intent: detectIntent(k) })
      seen.add(k.toLowerCase())
    }
  }

  return { seed, keywords, provider: 'amazon-autocomplete' }
}

// Amazon autocomplete - free, returns suggestions
async function fetchAutocomplete(seed: string, marketplace: string): Promise<string[]> {
  const domain = getAmazonDomain(marketplace)
  const url = `https://completion.${domain}/api/2017/suggestions?q=${encodeURIComponent(seed)}&search-alias=aps&mid=ATVPDKIKX0DER&alias=aps&plattr=50&page-type=Search`
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        Accept: 'application/json',
      },
    })
    const data = await res.json()
    return (data.suggestions || []).map((s: any) => s.value).filter((v: string) => v && v !== seed)
  } catch (e) {
    console.warn('[keywords] autocomplete failed:', e)
    return []
  }
}

// Related searches - fetch Amazon search page and extract
async function fetchRelated(seed: string, marketplace: string): Promise<string[]> {
  const domain = getAmazonDomain(marketplace)
  const url = `https://www.${domain}/s?k=${encodeURIComponent(seed)}`
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })
    const html = await res.text()
    const related: string[] = []
    const regex = /data-view="[^"]*"[^>]*>([^<]{4,60})<\/a>/g
    let m
    while ((m = regex.exec(html)) !== null && related.length < 10) {
      const t = m[1].trim()
      if (t.length > 4 && !t.includes('<') && t !== seed) related.push(t)
    }
    return related
  } catch (e) {
    console.warn('[keywords] related fetch failed:', e)
    return []
  }
}

function detectIntent(keyword: string): 'informational' | 'commercial' | 'transactional' {
  const lower = keyword.toLowerCase()
  if (/\b(buy|price|cheap|best|deal|discount|sale|order|coupon)\b/.test(lower)) return 'transactional'
  if (/\b(review|vs|comparison|top|guide|how to|what is)\b/.test(lower)) return 'informational'
  return 'commercial'
}

// --- Rank tracker ---
export type RankResult = {
  asin: string
  keyword: string
  rank: number | null
  page: number | null
  found: boolean
  competitorsAhead: { asin: string; title: string }[]
  trackedAt: string
}

export async function trackRank(
  asin: string,
  keyword: string,
  marketplace: string = 'US',
  maxPages: number = 3,
): Promise<RankResult> {
  console.log(`[keywords] tracking ASIN ${asin} for "${keyword}"`)

  // Use competitor crawler to get top listings per page
  const report = await crawlCompetitors(keyword, marketplace, 10 * maxPages)
  const idx = report.topCompetitors.findIndex((c) => c.asin === asin)

  if (idx === -1) {
    return {
      asin,
      keyword,
      rank: null,
      page: null,
      found: false,
      competitorsAhead: report.topCompetitors.slice(0, 10).map((c) => ({
        asin: c.asin,
        title: c.title,
      })),
      trackedAt: new Date().toISOString(),
    }
  }

  const rank = idx + 1
  const page = Math.ceil(rank / 10)

  return {
    asin,
    keyword,
    rank,
    page,
    found: true,
    competitorsAhead: report.topCompetitors.slice(0, idx).map((c) => ({
      asin: c.asin,
      title: c.title,
    })),
    trackedAt: new Date().toISOString(),
  }
}

// Keepa integration (optional, for historical rank + volume)
export async function getKeepaData(asin: string, marketplace: string = 'US') {
  if (!config.keepa.apiKey) return null
  const domainId = keepaDomainId(marketplace)
  const params = new URLSearchParams({
    key: config.keepa.apiKey,
    domain: domainId.toString(),
    asin,
    stats: '180',
  })
  const res = await fetch(`https://api.keepa.com/product?${params}`)
  return res.json()
}

function keepaDomainId(marketplace: string): number {
  const map: Record<string, number> = {
    US: 1, GB: 2, DE: 3, FR: 4, JP: 5, CA: 6, IT: 8, ES: 9, IN: 10, MX: 11, AU: 12,
  }
  return map[marketplace] || 1
}
