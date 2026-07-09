// Core primitives shared across every stage of the engine.
//
// Design note: identifiers like PlatformKey, ModuleKey and AssetKind are plain
// string aliases on purpose, not TypeScript unions. A new marketplace, a new
// generator, or a new validator is registered at runtime by its string key, so
// nothing here needs editing to add one. The constant maps below give ergonomic
// autocomplete for the keys that ship today without closing the type.

export type Id = string

/** Where a product is scraped from, or generated for. e.g. 'amazon_in', 'flipkart'. */
export type PlatformKey = string

/** Identifies a registered module. e.g. 'image.hero', 'keywords.helium', 'validator.mobile'. */
export type ModuleKey = string

/** The category of a generated asset. e.g. 'image.hero', 'aplus', 'video'. */
export type AssetKind = string

/** Buyer-intent classification for a keyword, used to rank listing copy. */
export type KeywordIntent = 'transactional' | 'commercial' | 'informational'

/** The ordered stages every campaign walks through. */
export const STAGES = ['ingest', 'intelligence', 'assemble', 'generate', 'validate', 'publish'] as const
export type Stage = (typeof STAGES)[number]

/** Well-known asset kinds that ship today. The AssetKind type stays open for more. */
export const AssetKinds = {
  listing: 'listing',
  imageHero: 'image.hero',
  imageLifestyle: 'image.lifestyle',
  imageInfographic: 'image.infographic',
  imageDimension: 'image.dimension',
  imageDetail: 'image.detail',
  imageProduct: 'image.product',
  aplus: 'aplus',
  video: 'video',
  banner: 'banner',
} as const

/** A minimal structured logger so modules never reach for console directly. */
export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void
  info(message: string, meta?: Record<string, unknown>): void
  warn(message: string, meta?: Record<string, unknown>): void
  error(message: string, meta?: Record<string, unknown>): void
}

/**
 * The context handed to every module. It carries tenant scoping (so a module
 * physically cannot read another org's data), the current campaign, a logger,
 * and a cancellation signal. Concrete services (db, storage, ai clients) are
 * attached by the runtime in a later phase; kept out of the contract so the
 * interfaces stay pure and testable.
 */
export interface Ctx {
  orgId: Id
  userId?: Id
  campaignId?: Id
  signal?: AbortSignal
  log: Logger
  /** Injected clock. Modules never call Date.now() directly, which keeps them deterministic in tests. */
  now(): Date
}
