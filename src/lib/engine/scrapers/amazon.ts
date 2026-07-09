// Amazon ScrapeProvider. Delegates to the existing scrapeAsin (curl_cffi service),
// then maps the result into the engine domain.

import type { ScrapeProvider } from '@/core'
import { scrapeAsin } from '@/lib/scraper/asin'
import { amazonMarketplaceCode, toEngineProduct } from '../map'

export function createAmazonScraper(): ScrapeProvider {
  return {
    id: 'scraper.amazon',
    supports: (ref) => !ref.raw && ref.platform.startsWith('amazon'),
    async fetch(ref) {
      const result = await scrapeAsin(ref.externalId, amazonMarketplaceCode(ref.platform, ref.region))
      return toEngineProduct(result, ref.platform)
    },
  }
}
