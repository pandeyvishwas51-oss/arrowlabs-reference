// Raw ScrapeProvider. When the user uploads their own product instead of scraping
// (the bulk / from-my-images path), this turns the raw input into a ScrapedProduct.
// No network, so it never fails on a bot wall.

import type { ScrapeProvider } from '@/core'

export function createRawProvider(): ScrapeProvider {
  return {
    id: 'scraper.raw',
    supports: (ref) => Boolean(ref.raw),
    async fetch(ref) {
      const raw = ref.raw
      if (!raw) throw new Error('scraper.raw: no raw input on source ref')
      return {
        externalId: ref.externalId || 'raw',
        platform: ref.platform,
        title: raw.title,
        brand: raw.brand,
        bullets: raw.bullets ?? [],
        features: raw.features ?? [],
        description: raw.description,
        images: raw.images ?? [],
        dims: raw.dims,
        reviews: { samples: [] },
        raw,
      }
    },
  }
}
