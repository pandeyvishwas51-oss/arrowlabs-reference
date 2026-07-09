// Composition root. This is the one place where the pure engine meets the real
// app services. It wires the concrete adapters (AI, scrapers, generators) into the
// engine registries. Call bootAppEngine() once at the edge (a route, a job worker)
// before calling run(). It is idempotent, so calling it from many entry points is safe.

import { configureEngine, registerGenerator, registerScraper } from '@/core'
import { createAiTextAdapter } from './adapters/ai-text'
import { createAiVision, visionAvailable } from './adapters/ai-vision'
import { createBestSellerProvider } from './adapters/best-sellers'
import { createBrandStore } from './adapters/brand-store'
import { createKeywordProvider } from './adapters/keywords'
import { createAplusGenerator } from './generators/aplus'
import { createImageGenerators } from './generators/image'
import { createListingGenerator } from './generators/listing'
import { createVideoGenerator } from './generators/video'
import { createAmazonScraper } from './scrapers/amazon'
import { createMarketplaceScraper } from './scrapers/marketplace'
import { createRawProvider } from './scrapers/raw'

let booted = false

export function bootAppEngine(): void {
  if (booted) return
  booted = true

  const aiText = createAiTextAdapter()

  // Intelligence builders + validators. Vision is wired only when the Azure Claude
  // config can actually serve it, so the sanity validator cleanly skips otherwise.
  configureEngine({
    aiText,
    keywordProvider: createKeywordProvider(),
    bestSellerProvider: createBestSellerProvider(),
    brandStore: createBrandStore(),
    aiVision: visionAvailable() ? createAiVision() : undefined,
  })

  // Ingestion: raw first (no network), then Amazon, then other marketplaces.
  registerScraper(createRawProvider())
  registerScraper(createAmazonScraper())
  registerScraper(createMarketplaceScraper())

  // Generation: listing copy, the full image set (gpt-image product-lock), and
  // the Sora video, all wrapping the existing proven code.
  registerGenerator(createListingGenerator(aiText))
  for (const gen of createImageGenerators()) registerGenerator(gen)
  registerGenerator(createAplusGenerator())
  registerGenerator(createVideoGenerator())
}
