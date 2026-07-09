// Public entry point for the ArrowLabs engine (v2).
//
// Import this once at app startup to load the built-in modules (their registration
// runs as an import side effect), then call `run(...)` to execute a campaign.
//
//   import { run } from '@/core'
//
// The contracts and registry are re-exported so modules and callers share one
// import surface.

export * from './contracts'
export * from './registry'
export { run } from './pipeline/orchestrator'
export type { RunPlan, RunResult, ProgressReporter } from './pipeline/orchestrator'
export { configureEngine, _resetEngineForTests } from './bootstrap'
export { scoreIdq } from './idq/score'
export type { IdqResult, IdqBreakdownRow } from './idq/score'
export { scoreListingQuality } from './idq/listing-quality'
export type { ListingCopy, QualityResult, QualityDimension } from './idq/listing-quality'
export { optimizeListing } from './intelligence/optimizer'
export type { Diagnosis, ListingRewriter, OptimizeOptions, OptimizeResult } from './intelligence/optimizer'
export { mineKeywordsFromCompetitors } from './intelligence/best-sellers'
export type { BestSellerSignals, CompetitorItem } from './intelligence/best-sellers'
export { estimateMonthlySales, bsrDemandScore, parseBsr } from './intelligence/demand'

// Load built-in modules for their registration side effects.
// Platform specs are pure data and register on import. Behavior modules
// (intelligence builders, validators, and in Phase 4 the generators/scrapers)
// register via configureEngine(services) at app startup.
import './modules/platforms'
