// Marketplace ScrapeProvider (Flipkart, Myntra, Noon, Namshi). Delegates to the
// existing scrapeMarketplace, which routes through the residential scraper.

import type { ScrapeProvider } from '@/core'
import { isMarketplacePlatform, scrapeMarketplace } from '@/lib/scraper/marketplace'
import { toEngineProduct } from '../map'

export function createMarketplaceScraper(): ScrapeProvider {
  return {
    id: 'scraper.marketplace',
    supports: (ref) => !ref.raw && isMarketplacePlatform(ref.platform),
    async fetch(ref) {
      const result = await scrapeMarketplace(ref.platform, ref.externalId, ref.region)
      return toEngineProduct(result, ref.platform)
    },
  }
}
