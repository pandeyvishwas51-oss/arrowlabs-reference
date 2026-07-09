// The agentic listing optimizer. This is the "work in a loop, try new things, no manual
// step" module. Given a piece of listing copy, it scores it with the quality rubric,
// diagnoses the weakest dimensions and missing keywords, asks a rewriter to try an
// improved version, keeps that version only if the score actually went up, and repeats
// until it hits the target or stops improving. The rewriter is injected, so the loop is
// model-agnostic and fully testable.

import type { KeywordEntry } from '../contracts/domain'
import type { PlatformSpec } from '../contracts/platform'
import type { Ctx } from '../contracts/types'
import { scoreListingQuality, type ListingCopy, type QualityResult } from '../idq/listing-quality'

export interface Diagnosis {
  score: number
  weakest: string[]
  missingKeywords: string[]
  issues: string[]
  guidelines: string[]
}

export type ListingRewriter = (copy: ListingCopy, diagnosis: Diagnosis, ctx: Ctx) => Promise<ListingCopy>

export interface OptimizeOptions {
  keywords?: KeywordEntry[]
  /** Stop once the score reaches this (default 90). */
  targetScore?: number
  /** Maximum rewrite rounds (default 3). */
  maxRounds?: number
  /** A candidate must beat the best by at least this to be kept (default 2). */
  minGain?: number
}

export interface OptimizeRound {
  round: number
  score: number
  kept: boolean
}

export interface OptimizeResult {
  copy: ListingCopy
  score: number
  breakdown: QualityResult
  rounds: number
  history: OptimizeRound[]
}

export async function optimizeListing(
  initial: ListingCopy,
  platform: PlatformSpec,
  ctx: Ctx,
  rewrite: ListingRewriter,
  options: OptimizeOptions = {},
): Promise<OptimizeResult> {
  const keywords = options.keywords ?? []
  const target = options.targetScore ?? 90
  const maxRounds = options.maxRounds ?? 3
  const minGain = options.minGain ?? 2

  let best = initial
  let bestQ = scoreListingQuality(best, platform, keywords)
  const history: OptimizeRound[] = [{ round: 0, score: bestQ.score, kept: true }]
  let stale = 0

  for (let round = 1; round <= maxRounds; round++) {
    if (bestQ.score >= target) break

    const diagnosis: Diagnosis = {
      score: bestQ.score,
      weakest: bestQ.weakest,
      missingKeywords: bestQ.missingKeywords,
      issues: bestQ.dimensions.filter((d) => d.issue).map((d) => d.issue as string),
      guidelines: platform.guidelines ?? [],
    }

    let candidate: ListingCopy
    try {
      candidate = await rewrite(best, diagnosis, ctx)
    } catch (err) {
      ctx.log.warn(`optimizer: rewrite failed in round ${round}, keeping best`, { err: String(err) })
      break
    }

    const q = scoreListingQuality(candidate, platform, keywords)
    const kept = q.score > bestQ.score + minGain
    history.push({ round, score: q.score, kept })
    ctx.log.debug(`optimizer: round ${round} scored ${q.score} (best ${bestQ.score}), kept=${kept}`)

    if (kept) {
      best = candidate
      bestQ = q
      stale = 0
    } else {
      stale += 1
      if (stale >= 2) break // two rounds with no real gain: it has plateaued
    }
  }

  return { copy: best, score: bestQ.score, breakdown: bestQ, rounds: history.length - 1, history }
}
