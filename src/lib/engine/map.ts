// Adapters between the existing scraper shapes and the engine domain types.
// Keeping the mapping in one place means the legacy ScrapeResult can change
// without rippling into the engine.

import type { ScrapedProduct as EngineProduct } from '@/core'
import type { ScrapeResult } from '@/lib/scraper/asin'

/** Map a legacy amazon marketplace region code from an engine platform key. */
export function amazonMarketplaceCode(platform: string, region?: string): string {
  switch (platform) {
    case 'amazon_in':
      return 'IN'
    case 'amazon_com':
      return 'US'
    case 'amazon_co_uk':
      return 'UK'
    default:
      return region || 'US'
  }
}

/** Convert the existing ScrapeResult into the engine's ScrapedProduct. */
export function toEngineProduct(result: ScrapeResult, platform: string): EngineProduct {
  const p = result.product
  const insights = result.reviewInsights
  return {
    externalId: p.asin,
    platform,
    title: p.title,
    brand: p.brand || undefined,
    bullets: p.bullets ?? [],
    features: p.features ?? [],
    description: p.description || undefined,
    price: typeof p.price === 'number' ? p.price : undefined,
    currency: p.currency || undefined,
    images: p.images ?? [],
    dims: p.dimensions
      ? { unit: 'cm' } // legacy stores free-text size/weight; kept minimal here
      : undefined,
    categoryPath: p.category ? [p.category] : undefined,
    nodeExternalId: p.category || undefined,
    reviews: {
      count: insights?.total,
      average: insights?.avgRating,
      samples: (result.reviews ?? []).slice(0, 20).map((r) => ({
        rating: r.rating,
        text: r.body || r.title || '',
        media: [],
      })),
    },
    raw: result,
  }
}
