// Service ports. Behavior modules (intelligence builders, generators, validators)
// depend on these small interfaces rather than on concrete SDKs. Real adapters
// (Azure Claude/gpt-image/Sora, Prisma, the scraper service, Helium/Amazon PI)
// are wired in Phase 4. Everything here is optional: a module that needs a port
// which is not configured degrades gracefully instead of throwing.

import type { BrandColors, BrandCompliance, BrandFonts, KeywordEntry } from './domain'
import type { PlatformKey } from './types'

/** Text generation (listing copy, keywords, brand DNA). */
export interface AiText {
  complete(prompt: string, opts?: { system?: string; maxTokens?: number }): Promise<string>
}

/** Vision critique for the self-checking image validator. */
export interface AiVision {
  /** Ask a question about an image and get a free-text answer. */
  critique(imageUrl: string, question: string): Promise<string>
}

/** The uploaded brand identity inputs (logo, colors, fonts, voice). */
export interface BrandInputs {
  brandId: string
  name: string
  logoUrl?: string
  colors: BrandColors
  fonts: BrandFonts
  voice?: string
  compliance?: BrandCompliance
}

export interface BrandStore {
  get(brandId: string): Promise<BrandInputs | null>
}

/** A source of volume-ranked keywords for a category node (scrape, Helium, Amazon PI). */
export interface KeywordProvider {
  id: string
  keywords(nodeKey: string, platform: PlatformKey): Promise<KeywordEntry[]>
}

/** A competing product from a category best-seller list (used to mine winning keywords). */
export interface CompetitorProduct {
  externalId?: string
  title?: string
  bullets?: string[]
  price?: number
  bsr?: number
}

/** A source of the top-ranking products in a category node (best-seller scrape). */
export interface BestSellerProvider {
  id: string
  topSellers(nodeKey: string, platform: PlatformKey): Promise<CompetitorProduct[]>
}

/** The full set of injectable services. All optional; modules adapt to what exists. */
export interface Services {
  aiText?: AiText
  aiVision?: AiVision
  brandStore?: BrandStore
  keywordProvider?: KeywordProvider
  bestSellerProvider?: BestSellerProvider
}
