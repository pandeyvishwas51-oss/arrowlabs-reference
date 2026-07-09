// Intelligence stage. Builders produce the cached Brand File and Node File that
// every listing reuses. They are the reason the tool does not re-scrape the whole
// category for every ASIN: build once per node, refresh on a schedule.

import type { BrandFile, NodeFile, ScrapedProduct } from './domain'
import type { Ctx, Id, ModuleKey, PlatformKey } from './types'

/** What a builder needs to produce or refresh an intelligence file. */
export interface IntelBuildInput {
  brandId?: Id
  nodeKey?: string
  platform?: PlatformKey
  /** A representative product, when the build is seeded from one. */
  seed?: ScrapedProduct
}

/**
 * Builds a Brand File. Brand identity (logo, colors, fonts, voice) comes from
 * uploaded inputs, so a builder mostly assembles and validates rather than guesses.
 */
export interface BrandIntelligenceBuilder {
  id: ModuleKey
  kind: 'brand'
  build(input: IntelBuildInput, ctx: Ctx): Promise<BrandFile>
}

/**
 * Builds a Node File for a category node: volume-ranked keywords, best-seller
 * signals, and aggregated review insights (pain points, customer love, trends).
 */
export interface NodeIntelligenceBuilder {
  id: ModuleKey
  kind: 'node'
  build(input: IntelBuildInput, ctx: Ctx): Promise<NodeFile>
}

export type IntelligenceBuilder = BrandIntelligenceBuilder | NodeIntelligenceBuilder
