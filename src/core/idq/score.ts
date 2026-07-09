// IDQ scorer. Grades a finished set of assets against the platform's IDQ rules and
// returns a 0 to 100 score plus a per-rule breakdown for the UI. Pure function.
//
// IMPORTANT (review-meeting caveat): this is our internal approximation of Amazon's
// IDQ. Before presenting the number as authoritative, reconcile it against a real
// Amazon IDQ score for a known ASIN. Kept isolated here so swapping in a real API
// later touches only this file.

import type { Asset } from '../contracts/domain'
import type { PlatformSpec } from '../contracts/platform'

export interface IdqBreakdownRow {
  key: string
  label: string
  weight: number
  got: number // 0..1
}

export interface IdqResult {
  score: number // 0..100
  breakdown: IdqBreakdownRow[]
}

const PROMO_JUNK = /(!!+|best price|lowest price|sale|free shipping|100% genuine)/i

function asStrings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

export function scoreIdq(assets: Asset[], platform: PlatformSpec): IdqResult {
  const listing = assets.find((a) => a.kind === 'listing')
  const meta = (listing?.meta ?? {}) as Record<string, unknown>
  const title = typeof meta.title === 'string' ? meta.title : ''
  const bullets = asStrings(meta.bullets)
  const features = asStrings(meta.features)
  const description = typeof meta.description === 'string' ? meta.description : ''
  const searchTerms = typeof meta.searchTerms === 'string' ? meta.searchTerms : ''

  const images = assets.filter((a) => a.kind.startsWith('image.'))
  const aplusCount = assets.filter((a) => a.kind === 'aplus').length
  const videoCount = assets.filter((a) => a.kind === 'video').length
  const hasMain = images.some((a) => a.kind === 'image.hero' || a.kind === 'image.product')

  const got = (key: string): number => {
    switch (key) {
      case 'title.brand':
        return title.length > 0 ? 1 : 0
      case 'title.length':
        return title.length > 0 && title.length <= platform.title.max ? 1 : 0
      case 'title.clean':
        return title.length > 0 && !PROMO_JUNK.test(title) ? 1 : 0
      case 'bullets.count':
        return Math.min(bullets.length / platform.bullets.count, 1)
      case 'bullets.length':
        return bullets.length > 0 && bullets.every((b) => b.length <= platform.bullets.max) ? 1 : 0
      case 'features.count':
        return Math.min(features.length / platform.features.count, 1)
      case 'description':
        return description.length >= 200 ? 1 : description.length > 0 ? 0.5 : 0
      case 'aplus.modules':
        return Math.min(aplusCount / Math.max(platform.aplus.modules, 1), 1)
      case 'image.main':
        return hasMain ? 1 : 0
      case 'image.count':
        return Math.min(images.length / 5, 1)
      case 'searchTerms':
        return searchTerms.trim().length > 0 ? 1 : 0
      case 'video':
        return videoCount > 0 ? 1 : 0
      case 'mobile.readable':
        // Approximated by the mobile validator at generation time; credit if images exist.
        return images.length > 0 ? 1 : 0
      default:
        return 0
    }
  }

  const breakdown = platform.idqRules.map((r) => ({
    key: r.key,
    label: r.label,
    weight: r.weight,
    got: got(r.key),
  }))
  const totalWeight = breakdown.reduce((s, r) => s + r.weight, 0) || 1
  const earned = breakdown.reduce((s, r) => s + r.weight * r.got, 0)
  return { score: Math.round((earned / totalWeight) * 100), breakdown }
}
