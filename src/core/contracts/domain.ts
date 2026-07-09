// The domain nouns. These are the data artifacts that flow between stages.
// They mirror DATA_MODEL.md but as in-memory shapes (the Prisma models are the
// persisted form). Keeping these framework-free means the engine can be unit
// tested without a database.

import type { AssetKind, Id, KeywordIntent, ModuleKey, PlatformKey } from './types'

// ---------------------------------------------------------------------------
// Ingestion output
// ---------------------------------------------------------------------------

export interface Dimensions {
  l?: number
  w?: number
  h?: number
  unit?: 'cm' | 'in'
}

export interface ReviewSample {
  rating?: number
  text: string
  media?: string[]
}

export interface ReviewData {
  count?: number
  average?: number
  samples: ReviewSample[]
}

/** A normalized product, however it was sourced (scrape or raw upload). */
export interface ScrapedProduct {
  externalId: string
  platform: PlatformKey
  title: string
  brand?: string
  bullets: string[]
  features: string[]
  description?: string
  price?: number
  currency?: string
  images: string[]
  dims?: Dimensions
  categoryPath?: string[]
  nodeExternalId?: string
  reviews?: ReviewData
  /** Untouched source payload, for debugging and re-parsing. */
  raw?: unknown
}

// ---------------------------------------------------------------------------
// Brand intelligence (built once per brand, versioned, reused everywhere)
// ---------------------------------------------------------------------------

export interface BrandColors {
  primary?: string
  secondary?: string
  accent?: string
  neutrals?: string[]
}

export interface BrandFonts {
  display?: string
  body?: string
}

export interface BrandCompliance {
  /** Hard content rules, e.g. ['em-dash', 'competitor-names']. */
  forbidden: string[]
  toneRules?: string[]
}

export interface BrandFile {
  brandId: Id
  version: number
  name: string
  logoUrl?: string
  colors: BrandColors
  fonts: BrandFonts
  voice?: string
  compliance: BrandCompliance
}

// ---------------------------------------------------------------------------
// Category / node intelligence (built once per node, refreshed on schedule)
// ---------------------------------------------------------------------------

export interface KeywordEntry {
  term: string
  volume?: number
  intent: KeywordIntent
  source: string
  score?: number
}

export interface BestSellerEntry {
  externalId: string
  bsr?: number
  title?: string
  brand?: string
  price?: number
  signals?: Record<string, unknown>
}

export interface NodeInsightEntry {
  kind: 'pain_point' | 'customer_love' | 'improvement' | 'trend'
  text: string
  weight?: number
  evidence?: Record<string, unknown>
}

export interface NodeFile {
  nodeKey: string
  platform: PlatformKey
  version: number
  keywords: KeywordEntry[]
  bestSellers: BestSellerEntry[]
  insights: NodeInsightEntry[]
}

// ---------------------------------------------------------------------------
// The Listing File: the single source of truth handed to generation.
// It PINS the exact brand + node versions it consumed, so generation is
// reproducible and a later intelligence refresh can never corrupt it.
// ---------------------------------------------------------------------------

export interface ListingFile {
  id: Id
  orgId: Id
  productId: Id
  /** Where the assets are being generated FOR (may differ from the scrape source). */
  targetPlatform: PlatformKey
  product: ScrapedProduct
  brand?: BrandFile
  node?: NodeFile
  /** User comments captured from the feedback loop, replayed on regeneration. */
  overrides: string[]
}

// ---------------------------------------------------------------------------
// Generation output
// ---------------------------------------------------------------------------

export type ValidationStatus = 'pending' | 'passed' | 'failed' | 'needs_review'

export interface Asset {
  id: Id
  kind: AssetKind
  /** Which generator produced it. */
  moduleKey: ModuleKey
  url: string
  storageKey?: string
  meta: Record<string, unknown>
  version: number
  validationStatus: ValidationStatus
}
