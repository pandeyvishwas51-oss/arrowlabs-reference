// Multi-marketplace scraper (Flipkart, Myntra, Noon, Namshi, Nykaa).
//
// Amazon has its own ASIN + review-session path (asin.ts); every other
// marketplace goes through our Python scraper-service /scrape endpoint, which
// normalizes each storefront (JSON-LD, __NEXT_DATA__, OpenGraph, per-platform
// enrichers) into one product shape. This maps that into the same ScrapeResult
// the whole pipeline (listing, keywords, A+, images) already consumes, so a
// Flipkart FSN or Myntra style-id produces the exact same rich output as an ASIN.

import { config } from '@/lib/config'
import { analyzeReviews, sentimentOf, type ScrapeResult, type ScrapedReview } from '@/lib/scraper/asin'

// Our platform ids → scraper-service platform names.
const PLATFORM_NAME: Record<string, string> = {
  flipkart: 'flipkart',
  myntra: 'myntra',
  noon: 'noon',
  namshi: 'namshi',
  nykaa: 'nykaa',
}

// Whether a platform id is scraped via the marketplace service (i.e. not Amazon).
export function isMarketplacePlatform(platformId?: string | null): boolean {
  return !!platformId && platformId !== 'amazon_in' && platformId in PLATFORM_NAME
}

export async function scrapeMarketplace(
  platformId: string,
  productId: string,
  region?: string,
): Promise<ScrapeResult> {
  // Prefer a residential-IP marketplace scraper (beats bot-walls); fall back to main.
  const base = (config.scraperService.marketplaceUrl || config.scraperService.url).replace(/\/$/, '')
  if (!base) throw new Error('No marketplace scraper configured (set MARKETPLACE_SCRAPER_URL to a residential-IP scraper).')
  const platform = PLATFORM_NAME[platformId] || platformId

  // region for GCC stores: noon → uae-en, namshi → en-ae (build_url defaults if empty).
  const reg = region === 'GCC' ? (platform === 'namshi' ? 'en-ae' : 'uae-en') : ''
  const url = `${base}/scrape?platform=${encodeURIComponent(platform)}&id=${encodeURIComponent(productId)}${reg ? `&region=${reg}` : ''}`

  let data: any = null
  let lastErr = ''
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) })
      if (res.ok) { data = await res.json(); break }
      lastErr = `HTTP ${res.status}`
      if (attempt < 2) await new Promise((r) => setTimeout(r, 1200))
    } catch (e: any) {
      lastErr = e.message
      if (attempt < 2) await new Promise((r) => setTimeout(r, 1200))
    }
  }
  if (!data || !data.title) throw new Error(`marketplace scrape failed for ${platform} ${productId}: ${lastErr || 'no product'}`)

  const reviews: ScrapedReview[] = (Array.isArray(data.reviews) ? data.reviews : []).map((r: any, i: number): ScrapedReview => {
    const rating = Number(r.rating) || 0
    return {
      id: `${platform}-${productId}-r${i}`,
      author: r.author || 'Anonymous',
      rating,
      title: r.title || '',
      body: r.body || '',
      date: r.date || '',
      verified: !!r.verified,
      helpful: Number(r.helpful) || 0,
      sentiment: sentimentOf(rating),
    }
  })

  return {
    product: {
      asin: productId,
      title: data.title,
      brand: data.brand || '',
      price: Number(data.price) || 0,
      currency: data.currency || 'INR',
      listPrice: Number(data.listPrice) || undefined,
      rating: Number(data.rating) || 0,
      reviewCount: Number(data.reviewCount) || 0,
      category: data.category || undefined,
      features: [],
      description: data.description || '',
      bullets: Array.isArray(data.bullets) ? data.bullets : [],
      images: (Array.isArray(data.images) ? data.images : []).filter((u: any) => typeof u === 'string').slice(0, 8),
      variants: [],
      availability: 'in stock',
      marketplace: platform,
      scrapedAt: new Date().toISOString(),
    },
    reviews,
    reviewInsights: analyzeReviews(reviews),
    provider: `marketplace:${platform}`,
  }
}
