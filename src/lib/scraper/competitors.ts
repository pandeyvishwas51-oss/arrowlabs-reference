// Competitor Crawler - for a keyword, fetch top 10 Amazon listings
// and extract their features for competitive analysis.

import { config, getAmazonProvider } from '@/lib/config'
import { getAmazonDomain } from './asin'

export type CompetitorListing = {
  asin: string
  title: string
  brand: string
  price: number
  rating: number
  reviewCount: number
  thumbnail: string
  sponsored: boolean
  bestSeller: boolean
  amazonChoice: boolean
  position: number
  url: string
}

export type CompetitorReport = {
  keyword: string
  totalResults: number
  topCompetitors: CompetitorListing[]
  priceRange: { min: number; max: number; median: number }
  avgRating: number
  avgReviewCount: number
  commonKeywords: { word: string; count: number }[]
  topBrands: { brand: string; count: number }[]
  provider: string
}

export async function crawlCompetitors(
  keyword: string,
  marketplace: string = 'US',
  maxResults: number = 10,
): Promise<CompetitorReport> {
  const provider = getAmazonProvider()
  console.log(`[competitors] keyword "${keyword}" via ${provider}`)

  let listings: CompetitorListing[] = []

  switch (provider) {
    case 'local':
      listings = await crawlLocal(keyword, marketplace, maxResults)
      break
    case 'rainforest':
      listings = await crawlRainforest(keyword, marketplace, maxResults)
      break
    case 'serpapi':
      listings = await crawlSerpapi(keyword, marketplace, maxResults)
      break
    default:
      listings = await crawlHTML(keyword, marketplace, maxResults)
  }

  return buildReport(keyword, listings, provider)
}

// --- Rainforest ---
async function crawlRainforest(keyword: string, marketplace: string, max: number): Promise<CompetitorListing[]> {
  const params = new URLSearchParams({
    api_key: config.rainforest.apiKey,
    type: 'search',
    amazon_domain: getAmazonDomain(marketplace),
    search_term: keyword,
    page: '1',
  })
  const res = await fetch(`https://api.rainforestapi.com/request?${params}`)
  const data = await res.json()
  return (data.search_results || []).slice(0, max).map((p: any, i: number): CompetitorListing => ({
    asin: p.asin,
    title: p.title || '',
    brand: p.brand || '',
    price: parseFloat(p.price?.value || '0'),
    rating: parseFloat(p.rating || '0'),
    reviewCount: parseInt(p.ratings_total || '0', 10),
    thumbnail: p.image || '',
    sponsored: !!p.sponsored,
    bestSeller: !!p.bestseller,
    amazonChoice: !!p.amazon_choice,
    position: i + 1,
    url: `https://www.${getAmazonDomain(marketplace)}/dp/${p.asin}`,
  }))
}

// --- SerpAPI ---
async function crawlSerpapi(keyword: string, marketplace: string, max: number): Promise<CompetitorListing[]> {
  const params = new URLSearchParams({
    api_key: config.serpapi.apiKey,
    engine: 'amazon_search',
    amazon_domain: getAmazonDomain(marketplace),
    search_term: keyword,
  })
  const res = await fetch(`https://serpapi.com/search?${params}`)
  const data = await res.json()
  const organic = data.organic_results || []
  return organic.slice(0, max).map((p: any, i: number): CompetitorListing => ({
    asin: p.asin,
    title: p.title || '',
    brand: p.brand || '',
    price: parseFloat((p.price || '').replace(/[^0-9.]/g, '') || '0'),
    rating: parseFloat(p.rating || '0'),
    reviewCount: parseInt(p.reviews || '0', 10),
    thumbnail: p.thumbnail || '',
    sponsored: false,
    bestSeller: false,
    amazonChoice: false,
    position: i + 1,
    url: `https://www.${getAmazonDomain(marketplace)}/dp/${p.asin}`,
  }))
}

// --- Local curl_cffi microservice (our own scraper) ---
async function crawlLocal(keyword: string, marketplace: string, max: number): Promise<CompetitorListing[]> {
  const base = config.scraperService.url.replace(/\/$/, '')
  const domain = getAmazonDomain(marketplace)
  try {
    const res = await fetch(
      `${base}/search?q=${encodeURIComponent(keyword)}&domain=${domain}&limit=${max}`,
      { signal: AbortSignal.timeout(30000) },
    )
    if (!res.ok) throw new Error(`scraper-service /search HTTP ${res.status}`)
    const j = await res.json()
    const results = Array.isArray(j.results) ? j.results : []
    if (!results.length) throw new Error('scraper-service returned no results')
    return results.slice(0, max).map((p: any, i: number): CompetitorListing => ({
      asin: p.asin,
      title: p.title || '',
      brand: p.brand || '',
      price: Number(p.price) || 0,
      rating: Number(p.rating) || 0,
      reviewCount: Number(p.reviewCount) || 0,
      thumbnail: p.thumbnail || '',
      sponsored: !!p.sponsored,
      bestSeller: !!p.bestSeller,
      amazonChoice: !!p.amazonChoice,
      position: p.position || i + 1,
      url: p.url || `https://www.${domain}/dp/${p.asin}`,
    }))
  } catch (err) {
    console.warn(`[competitors] local service failed (${(err as Error).message}); falling back to HTML.`)
    return crawlHTML(keyword, marketplace, max)
  }
}

// --- Free HTML fallback ---
async function crawlHTML(keyword: string, marketplace: string, max: number): Promise<CompetitorListing[]> {
  const url = `https://www.${getAmazonDomain(marketplace)}/s?k=${encodeURIComponent(keyword)}`
  console.log(`[competitors] Free HTML fetch: ${url}`)

  const userAgents = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ]

  let html = ''
  for (const ua of userAgents) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': ua,
          'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'follow',
      })
      if (res.ok) {
        html = await res.text()
        if (html.length > 5000) break
      }
    } catch {}
  }

  if (!html || html.length < 5000 || !html.includes('data-asin')) {
    console.warn(`[competitors] Free HTML crawl failed (no product data). Returning demo data. Add SERPAPI_KEY for real data.`)
    return demoCompetitors(keyword, marketplace, max)
  }

  // Slice the page into per-result cards, then parse each. Amazon's markup is
  // currency-agnostic here — prices come from <span class="a-offscreen">₹999</span>
  // (₹, $, AED, …), so we strip to digits rather than matching a "$".
  const domain = getAmazonDomain(marketplace)
  const listings: CompetitorListing[] = []
  const seen = new Set<string>()
  // Card boundaries: each search result carries data-component-type="s-search-result".
  const starts = [...html.matchAll(/data-asin="(B0[A-Z0-9]{8})"[^>]*data-component-type="s-search-result"|data-component-type="s-search-result"[^>]*data-asin="(B0[A-Z0-9]{8})"/g)]
  const positions = starts.map((s) => ({ asin: s[1] || s[2], idx: s.index || 0 }))
  for (let k = 0; k < positions.length && listings.length < max; k++) {
    const asin = positions[k].asin
    if (!asin || seen.has(asin)) continue
    const block = html.slice(positions[k].idx, positions[k + 1]?.idx ?? positions[k].idx + 6000)

    // Title: the h2's aria-label is the cleanest source (strip "Sponsored Ad - ").
    const t1 = block.match(/<h2[^>]*aria-label="([^"]{12,})"/i)
    const t2 = block.match(/<h2[\s\S]{0,400}?<span[^>]*>([^<]{12,})<\/span>/i)
    const title = decodeEntities((t1?.[1] || t2?.[1] || '').replace(/^Sponsored Ad\s*-\s*/i, '').trim())
    if (!title) continue

    // Price: first non-MRP a-offscreen value, digits only (handles ₹/$/AED).
    let price = 0
    for (const pm of block.matchAll(/<span class="a-offscreen">([^<]+)<\/span>/gi)) {
      if (/m\.?r\.?p/i.test(block.slice(Math.max(0, (pm.index || 0) - 30), pm.index))) continue
      const n = parseFloat(pm[1].replace(/[^0-9.]/g, ''))
      if (n > 0) { price = n; break }
    }

    const ratingMatch = block.match(/(\d(?:\.\d)?)\s*out of\s*5/i)
    // Review count: the underlined count next to the stars, or an aria-label.
    const reviewMatch =
      block.match(/s-underline-text">\s*([\d,]+)\s*<\/span>/i) ||
      block.match(/aria-label="([\d,]+)(?:\s+ratings?| reviews?)/i)
    const thumbMatch = block.match(/<img[^>]*class="s-image"[^>]*src="([^"]+)"/i)

    seen.add(asin)
    listings.push({
      asin,
      title,
      brand: '',
      price,
      rating: ratingMatch ? parseFloat(ratingMatch[1]) : 0,
      reviewCount: reviewMatch ? parseInt(reviewMatch[1].replace(/,/g, ''), 10) : 0,
      thumbnail: thumbMatch ? thumbMatch[1] : '',
      sponsored: /Sponsored/i.test(block),
      bestSeller: /best\s*seller/i.test(block),
      amazonChoice: /amazon'?s?\s*choice/i.test(block),
      position: listings.length + 1,
      url: `https://www.${domain}/dp/${asin}`,
    })
  }

  if (listings.length === 0) {
    console.warn(`[competitors] Free HTML crawl parsed 0 cards. Returning demo data.`)
    return demoCompetitors(keyword, marketplace, max)
  }

  console.log(`[competitors] Free HTML crawl: parsed ${listings.length} real competitors.`)
  return listings
}

// Minimal HTML entity decode for the handful that show up in Amazon titles.
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

// Demo data - returned when no API key is configured AND free HTML fails.
function demoCompetitors(keyword: string, marketplace: string, max: number): CompetitorListing[] {
  // Never fabricate competitors in production - return empty so the gap analysis
  // is simply skipped rather than showing fake competitors.
  if (process.env.NODE_ENV === 'production') return []
  const demoBrands = ['Anker', 'BELI', 'Soundcore', 'JBL', 'Beats', 'Sony', 'Bose', 'Tribit', 'EarFun', 'Treblab']
  const listings: CompetitorListing[] = []
  for (let i = 0; i < Math.min(max, 8); i++) {
    const asin = `B0${Math.random().toString(36).slice(2, 9).toUpperCase()}`
    listings.push({
      asin,
      title: `[DEMO] ${demoBrands[i % demoBrands.length]} ${keyword} - Premium Quality, Wireless, Long Battery`,
      brand: demoBrands[i % demoBrands.length],
      price: Math.round((19.99 + i * 7.5) * 100) / 100,
      rating: 4.0 + (i % 5) * 0.1,
      reviewCount: Math.floor(500 + Math.random() * 5000),
      thumbnail: '',
      sponsored: i === 0,
      bestSeller: i === 1,
      amazonChoice: i === 2,
      position: i + 1,
      url: `https://www.${getAmazonDomain(marketplace)}/dp/${asin}`,
    })
  }
  return listings
}

function buildReport(keyword: string, listings: CompetitorListing[], provider: string): CompetitorReport {
  const prices = listings.map((l) => l.price).filter((p) => p > 0).sort((a, b) => a - b)
  const ratings = listings.map((l) => l.rating).filter((r) => r > 0)
  const reviewCounts = listings.map((l) => l.reviewCount).filter((r) => r > 0)

  const wordCounts: Record<string, number> = {}
  for (const l of listings) {
    const words = l.title.toLowerCase().match(/\b[a-z]{4,}\b/g) || []
    for (const w of words) wordCounts[w] = (wordCounts[w] || 0) + 1
  }
  const commonKeywords = Object.entries(wordCounts)
    .map(([word, count]) => ({ word, count }))
    .filter((x) => !STOPWORDS.has(x.word))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)

  const brandCounts: Record<string, number> = {}
  for (const l of listings) {
    const b = l.brand || 'Unknown'
    brandCounts[b] = (brandCounts[b] || 0) + 1
  }
  const topBrands = Object.entries(brandCounts)
    .map(([brand, count]) => ({ brand, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return {
    keyword,
    totalResults: listings.length,
    topCompetitors: listings,
    priceRange: {
      min: prices[0] || 0,
      max: prices[prices.length - 1] || 0,
      median: prices[Math.floor(prices.length / 2)] || 0,
    },
    avgRating: ratings.length ? ratings.reduce((s, r) => s + r, 0) / ratings.length : 0,
    avgReviewCount: reviewCounts.length ? reviewCounts.reduce((s, r) => s + r, 0) / reviewCounts.length : 0,
    commonKeywords,
    topBrands,
    provider,
  }
}

const STOPWORDS = new Set([
  'the','and','for','with','this','that','from','your','have','will','they','what','about','out','can','one','all','would','there','their','which','when','them','then','than','these','those','been','were','into','over','also','more','very','some','just','like','only','such','here','where','when','who','how','why','use','used','using','really','quite','much','many','most','other',
])
