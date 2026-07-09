// Compliance validator. Enforces the hard content rules, chiefly the no-dash rule:
// em dashes (—) and en dashes (–) must never appear in copy or on images.
// Pure and dependency-free, so it can never be the thing that breaks.

import type { Asset, ListingFile } from '../../contracts/domain'
import type { PlatformSpec } from '../../contracts/platform'
import type { Validator, Verdict } from '../../contracts/validate'
import type { AssetKind, Ctx } from '../../contracts/types'

const EM_DASH = '—'
const EN_DASH = '–'

/** Recursively collect every string value out of an arbitrary object. */
function collectStrings(value: unknown, out: string[]): void {
  if (typeof value === 'string') {
    out.push(value)
  } else if (Array.isArray(value)) {
    for (const v of value) collectStrings(v, out)
  } else if (value && typeof value === 'object') {
    for (const v of Object.values(value)) collectStrings(v, out)
  }
}

export function createComplianceValidator(): Validator {
  return {
    id: 'compliance.emdash',
    appliesTo(_kind: AssetKind): boolean {
      return true // any asset can carry text in its meta
    },
    async check(asset: Asset, _listing: ListingFile, _platform: PlatformSpec, _ctx: Ctx): Promise<Verdict> {
      const strings: string[] = []
      collectStrings(asset.meta, strings)
      const offenders = strings.filter((s) => s.includes(EM_DASH) || s.includes(EN_DASH))
      if (offenders.length === 0) return { pass: true, issues: [] }
      return {
        pass: false,
        issues: offenders.map((s) => ({
          severity: 'error' as const,
          message: `contains a dash character that is forbidden: "${s.slice(0, 60)}"`,
        })),
        hint: 'Remove every em dash and en dash. Use a comma, a colon, or split into two sentences instead.',
      }
    },
  }
}
