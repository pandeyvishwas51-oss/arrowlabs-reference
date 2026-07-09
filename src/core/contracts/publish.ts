// Publish stage. A Publisher takes a finished ListingFile plus its assets and
// pushes them somewhere: Seller Central via SP-API, a downloadable zip, a CSV
// flat-file, or a webhook. Each destination is a registered Publisher.

import type { Asset, ListingFile } from './domain'
import type { Ctx, ModuleKey } from './types'

export interface PublishResult {
  ok: boolean
  /** Where the result landed (account id, file url, etc.). */
  target?: string
  detail?: Record<string, unknown>
}

export interface Publisher {
  id: ModuleKey
  publish(listing: ListingFile, assets: Asset[], ctx: Ctx): Promise<PublishResult>
}
