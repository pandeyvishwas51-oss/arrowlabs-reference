// BestSellerProvider adapter. Reuses the existing scraper-service /search endpoint (which
// already parses Amazon result cards) to get the top-ranking products for a node keyword.
// Search rank is a strong proxy for the category's winners, and their titles are what we
// mine for keywords. Degrades to an empty list on any failure, so it never blocks a
// campaign. (BSR-per-product enrichment would need individual product fetches; tracked in
// BACKLOG as a follow-up.)

import type { BestSellerProvider, CompetitorProduct } from '@/core'
import { config } from '@/lib/config'

// Map an engine platform key to the Amazon domain used for the category-keyword search.
// Non-Amazon marketplaces use the region's Amazon as a category proxy for keyword mining.
function searchDomain(platform: string): string {
  if (platform === 'amazon_com') return 'amazon.com'
  if (platform === 'amazon_in' || platform === 'flipkart' || platform === 'myntra') return 'amazon.in'
  if (platform === 'noon' || platform === 'namshi') return 'amazon.ae'
  return 'amazon.in'
}

interface SearchResult {
  asin?: string
  title?: string
  price?: number
}

export function createBestSellerProvider(): BestSellerProvider {
  return {
    id: 'bestsellers.search',
    async topSellers(nodeKey, platform): Promise<CompetitorProduct[]> {
      const base = config.scraperService.url?.replace(/\/$/, '')
      if (!base || !nodeKey) return []
      try {
        const domain = searchDomain(platform)
        const url = `${base}/search?q=${encodeURIComponent(nodeKey)}&domain=${domain}&limit=12`
        const res = await fetch(url, { signal: AbortSignal.timeout(20000) })
        if (!res.ok) return []
        const data = (await res.json()) as { results?: SearchResult[] }
        const items = Array.isArray(data.results) ? data.results : []
        return items.map((p) => ({ externalId: p.asin, title: p.title, price: p.price }))
      } catch {
        return []
      }
    },
  }
}
