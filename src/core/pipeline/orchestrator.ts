// The orchestrator. It walks the stages in order and delegates every unit of
// real work to a registered module. Notice how little is here: that is the goal.
// When you add a marketplace, a generator, or a validator, this file does not change.

import type { Asset, ListingFile } from '../contracts/domain'
import type { GenerateOptions } from '../contracts/generate'
import type { SourceRef } from '../contracts/scrape'
import type { Verdict } from '../contracts/validate'
import type { AssetKind, Ctx, Id, PlatformKey, Stage } from '../contracts/types'
import {
  generators,
  getPlatform,
  intelligence,
  publishers,
  scrapers,
  validators,
} from '../registry'

export interface RunPlan {
  source: SourceRef
  /** Where to generate FOR (may differ from the scrape source). */
  targetPlatform: PlatformKey
  brandId?: Id
  /** Which asset kinds to produce this run (the lab toggles). Empty = listing only. */
  labs: AssetKind[]
  /** How many of each kind to produce. Defaults to 1 per kind when omitted. */
  counts?: Record<string, number>
  /** Optional publisher module id to push the result. */
  publishWith?: string
  /** How many times to regenerate an asset that fails validation. Default 2. */
  maxValidationRetries?: number
}

export interface ProgressReporter {
  stage(stage: Stage, percent: number, note?: string): void
}

export interface RunResult {
  listing: ListingFile
  assets: Asset[]
}

const NOOP_PROGRESS: ProgressReporter = { stage: () => {} }

/**
 * Runs one campaign end to end. Callers supply a way to mint ids and (optionally)
 * a progress reporter; persistence and services are attached to ctx by the runtime.
 */
export async function run(
  plan: RunPlan,
  ctx: Ctx,
  newId: () => Id,
  progress: ProgressReporter = NOOP_PROGRESS,
): Promise<RunResult> {
  const platform = getPlatform(plan.targetPlatform)
  const retries = plan.maxValidationRetries ?? 2

  // 1. Ingest ------------------------------------------------------------------
  progress.stage('ingest', 0, 'sourcing product')
  const scraper = scrapers.find((s) => s.supports(plan.source))
  if (!scraper) {
    throw new Error(`ingest: no scraper supports platform "${plan.source.platform}"`)
  }
  const product = await scraper.fetch(plan.source, ctx)
  progress.stage('ingest', 100)

  // 2. Intelligence ------------------------------------------------------------
  // Best-effort: builders enrich the listing but never block generation.
  progress.stage('intelligence', 0, 'loading brand + category intelligence')
  const brand = await tryBuildBrand(plan.brandId, ctx)
  const node = await tryBuildNode(product.nodeExternalId, plan.targetPlatform, ctx)
  progress.stage('intelligence', 100)

  // 3. Assemble the Listing File (single source of truth) ----------------------
  progress.stage('assemble', 0)
  const listing: ListingFile = {
    id: newId(),
    orgId: ctx.orgId,
    productId: product.externalId,
    targetPlatform: plan.targetPlatform,
    product,
    brand,
    node,
    overrides: [],
  }
  progress.stage('assemble', 100)

  // 4 + 5. Generate, and validate each asset as it is produced -----------------
  // Expand the requested kinds by their counts into a flat work list, so a kind
  // asked for N times (7 A+ modules, 4 lifestyle shots) yields N indexed assets.
  const work: { kind: AssetKind; index: number }[] = []
  for (const kind of plan.labs) {
    const n = Math.max(1, plan.counts?.[kind] ?? 1)
    for (let index = 0; index < n; index++) work.push({ kind, index })
  }

  const assets: Asset[] = []
  for (let i = 0; i < work.length; i++) {
    const { kind, index } = work[i]
    progress.stage('generate', Math.round((i / Math.max(work.length, 1)) * 100), kind)
    const generator = generators.find((g) => g.kind === kind)
    if (!generator) {
      ctx.log.warn(`generate: no generator for kind "${kind}", skipping`)
      continue
    }
    // Never let one asset fail the whole campaign. If generation itself throws
    // (network, model outage), log it and move on to the next unit of work.
    try {
      const asset = await generateAndValidate(generator.id, listing, platform, ctx, retries, index)
      assets.push(asset)
    } catch (err) {
      ctx.log.error(`generate: kind "${kind}" #${index} failed, skipping`, { err: String(err) })
    }
  }
  progress.stage('generate', 100)
  progress.stage('validate', 100)

  // 6. Publish (optional) ------------------------------------------------------
  if (plan.publishWith) {
    progress.stage('publish', 0, plan.publishWith)
    const publisher = publishers.require(plan.publishWith)
    await publisher.publish(listing, assets, ctx)
    progress.stage('publish', 100)
  }

  return { listing, assets }
}

/**
 * The validation loop. Generate, run every validator that applies, and if any
 * fails, regenerate with the collected hints appended, up to `retries` times.
 * A still-failing asset is returned flagged 'needs_review' rather than thrown,
 * so one weak image never fails the whole campaign.
 */
async function generateAndValidate(
  generatorId: string,
  listing: ListingFile,
  platform: ReturnType<typeof getPlatform>,
  ctx: Ctx,
  retries: number,
  index = 0,
): Promise<Asset> {
  const generator = generators.require(generatorId)
  const applicable = validators.where((v) => v.appliesTo(generator.kind))

  let options: GenerateOptions = { index }
  let asset = await generator.generate(listing, platform, ctx, options)

  for (let attempt = 0; attempt <= retries; attempt++) {
    // A validator that throws must not crash the run. Treat a thrown check as
    // "could not verify": log it, and do not count it as a blocking failure.
    const verdicts = await Promise.all(
      applicable.map(async (v): Promise<Verdict> => {
        try {
          return await v.check(asset, listing, platform, ctx)
        } catch (err) {
          ctx.log.warn(`validate: "${v.id}" threw, treating as non-blocking`, { err: String(err) })
          return { pass: true, issues: [{ severity: 'warn', message: `validator ${v.id} errored` }] }
        }
      }),
    )
    const failures = verdicts.filter((v) => !v.pass)
    if (failures.length === 0) {
      asset.validationStatus = 'passed'
      return asset
    }
    if (attempt === retries) {
      asset.validationStatus = 'needs_review'
      ctx.log.warn(`validate: "${generator.kind}" still failing after ${retries} retries`, {
        issues: failures.flatMap((f) => f.issues.map((i) => i.message)),
      })
      return asset
    }
    // Fold the hints back into the next attempt, keeping the asset index.
    const hints = failures.map((f) => f.hint).filter(Boolean).join('; ')
    options = { index, comment: hints, previous: asset }
    asset = await generator.generate(listing, platform, ctx, options)
    asset.version += 1
  }
  return asset
}

async function tryBuildBrand(brandId: Id | undefined, ctx: Ctx) {
  if (!brandId) return undefined
  const builder = intelligence.find((b) => b.kind === 'brand')
  if (!builder || builder.kind !== 'brand') return undefined
  try {
    return await builder.build({ brandId }, ctx)
  } catch (err) {
    ctx.log.warn('intelligence: brand build failed, continuing without it', { err: String(err) })
    return undefined
  }
}

async function tryBuildNode(nodeKey: string | undefined, platform: PlatformKey, ctx: Ctx) {
  if (!nodeKey) return undefined
  const builder = intelligence.find((b) => b.kind === 'node')
  if (!builder || builder.kind !== 'node') return undefined
  try {
    return await builder.build({ nodeKey, platform }, ctx)
  } catch (err) {
    ctx.log.warn('intelligence: node build failed, continuing without it', { err: String(err) })
    return undefined
  }
}
