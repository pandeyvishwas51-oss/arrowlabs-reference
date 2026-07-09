// The platform layer is DATA, not code. A PlatformSpec captures everything that
// differs between Amazon, Flipkart, Myntra, Noon, and Namshi: image rules, title and
// bullet limits, backend-keyword rules, A+ counts, and the IDQ rules to score against.
// Values are grounded in each marketplace's published 2025/2026 seller guidelines
// (see MARKETPLACES.md for the sources). Generators, validators, the IDQ scorer, and
// the optimizer all read the spec, so switching marketplaces changes the numbers, not
// the logic.

import type { PlatformKey } from './types'

export interface ImageSpec {
  /** Catalog image aspect ratio, e.g. '1:1', '3:4'. */
  aspect: string
  /** Minimum longest edge in pixels. */
  minPx: number
  /** Recommended longest edge in pixels. */
  recommendedPx?: number
  /** How much on-image text the marketplace tolerates. Drives mobile-first copy. */
  textDensity: 'low' | 'medium'
  /** Primary image must be on a pure white background. */
  whiteBgRequired?: boolean
  /** Apparel categories require a real, gender-matched model (Myntra). */
  modelRequired?: boolean
  /** Max images the marketplace accepts. */
  maxImages?: number
}

export interface VideoSpec {
  allowed: boolean
  aspect: string
  /** Target clip length in seconds. */
  seconds: number
}

export interface TitleRule {
  /** Hard character cap. */
  max: number
  /** Characters visible before mobile truncation (front-load within this). */
  mobileTruncate?: number
  /** Characters that must never appear in the title. */
  forbiddenChars?: string[]
  /** Whether the brand name belongs in the title (Myntra bans it). */
  allowBrand?: boolean
  /** The marketplace builds the title from attributes rather than free text (Flipkart). */
  attributeDriven?: boolean
}

export interface BulletRule {
  count: number
  /** Max characters per bullet. */
  max: number
  /** Only the first N bytes across all bullets are indexed for search. */
  indexedBytes?: number
}

export interface SearchTermsRule {
  /** Backend search-term budget in BYTES (not characters). */
  maxBytes: number
  /** Some marketplaces cap by word count instead (Flipkart: 3 words). */
  maxWords?: number
  /** Whether brand names are allowed in backend terms. */
  allowBrand?: boolean
  /** Whether commas/punctuation are allowed (Amazon: no). */
  allowPunctuation?: boolean
}

/** A single scored dimension of Item Data Quality. */
export interface IdqRule {
  key: string
  label: string
  weight: number
}

export interface PlatformSpec {
  key: PlatformKey
  label: string
  region: 'IN' | 'GCC' | 'US' | 'UK' | string
  image: ImageSpec
  aplusImage: ImageSpec
  title: TitleRule
  bullets: BulletRule
  features: { count: number }
  description: { max: number }
  searchTerms: SearchTermsRule
  aplus: { modules: number }
  video: VideoSpec
  idqRules: IdqRule[]
  /** Freeform notes surfaced to the copywriter and the optimizer. */
  guidelines?: string[]
}
