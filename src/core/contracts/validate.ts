// Validation stage. This is the self-critique loop the meeting asked for: every
// asset is checked before the user sees it, and a failing asset is regenerated
// with the validator's hint appended. Each check (vision sanity, typo, brand
// consistency, mobile readability, IDQ, compliance) is a registered Validator.

import type { Asset, ListingFile } from './domain'
import type { PlatformSpec } from './platform'
import type { AssetKind, Ctx, ModuleKey } from './types'

export interface Issue {
  severity: 'info' | 'warn' | 'error'
  message: string
  /** Optional bounding box for image issues: [x, y, w, h] normalized 0..1. */
  box?: [number, number, number, number]
}

export interface Verdict {
  pass: boolean
  /** Optional 0..100 quality score (e.g. IDQ). */
  score?: number
  issues: Issue[]
  /** Guidance fed back into the generator on the next attempt. */
  hint?: string
}

export interface Validator {
  id: ModuleKey
  /** True if this validator should run against the given asset kind. */
  appliesTo(kind: AssetKind): boolean
  check(
    asset: Asset,
    listing: ListingFile,
    platform: PlatformSpec,
    ctx: Ctx,
  ): Promise<Verdict>
}
