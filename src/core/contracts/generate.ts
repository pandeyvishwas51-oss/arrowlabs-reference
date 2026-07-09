// Generation stage. A Generator turns a ListingFile plus a PlatformSpec into one
// Asset. Copy, hero image, lifestyle, infographic, A+, video, and banner are each
// just a registered Generator. Adding "banner" later means adding a module, not
// editing the pipeline.

import type { Asset, ListingFile } from './domain'
import type { PlatformSpec } from './platform'
import type { AssetKind, Ctx, ModuleKey } from './types'

/** Optional per-run refinement (e.g. a user comment from the feedback loop). */
export interface GenerateOptions {
  /** Free-text refinement folded into the prompt and saved for self-learning. */
  comment?: string
  /** Previous asset being regenerated, if this is a redo. */
  previous?: Asset
  /** 0-based index when a kind is generated more than once (e.g. lifestyle 3 of 4, A+ module 2 of 7). */
  index?: number
}

export interface Generator {
  id: ModuleKey
  /** The kind of asset this generator produces. */
  kind: AssetKind
  generate(
    listing: ListingFile,
    platform: PlatformSpec,
    ctx: Ctx,
    options?: GenerateOptions,
  ): Promise<Asset>
}
