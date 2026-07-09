// Ingestion stage. A ScrapeProvider turns a SourceRef into a normalized
// ScrapedProduct. New marketplaces are added by registering a new provider;
// the pipeline picks whichever one supports() the requested source.

import type { Dimensions, ScrapedProduct } from './domain'
import type { Ctx, ModuleKey, PlatformKey } from './types'

/** A raw product supplied by the user instead of scraped (bulk upload path). */
export interface RawInput {
  title: string
  description?: string
  brand?: string
  images: string[]
  bullets?: string[]
  features?: string[]
  dims?: Dimensions
}

/** Points the ingestion stage at a product to source. */
export interface SourceRef {
  /** Marketplace to scrape FROM. */
  platform: PlatformKey
  /** ASIN, marketplace product id, or a full product URL. */
  externalId: string
  region?: string
  /** When present, skip scraping and build the product from this instead. */
  raw?: RawInput
}

export interface ScrapeProvider {
  id: ModuleKey
  /** True if this provider can handle the given source. */
  supports(ref: SourceRef): boolean
  fetch(ref: SourceRef, ctx: Ctx): Promise<ScrapedProduct>
}
