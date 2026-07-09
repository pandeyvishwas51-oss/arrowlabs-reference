// Vision sanity validator. Asks a vision model to list anything wrong or
// implausible in a generated image (the "coffee mug on a book", the floating
// product, the body merged into the bed). If it finds problems, the asset fails
// with a hint so the generator can fix it on the next attempt.
//
// If no vision service is configured, it cannot verify, so it passes with a warn
// rather than blocking. Graceful degradation is deliberate: a missing model must
// never stop a campaign.

import type { Asset, ListingFile } from '../../contracts/domain'
import type { PlatformSpec } from '../../contracts/platform'
import type { AiVision } from '../../contracts/services'
import type { Validator, Verdict } from '../../contracts/validate'
import type { AssetKind, Ctx } from '../../contracts/types'

const IMAGE_KINDS = new Set([
  'image.hero',
  'image.lifestyle',
  'image.infographic',
  'image.dimension',
  'image.detail',
  'image.product',
])

const QUESTION =
  'List only physically implausible or clearly wrong things in this product image ' +
  '(floating objects, impossible anatomy, wrong or extra props, warped text, wrong product). ' +
  'If nothing is wrong, reply exactly with OK.'

export function createVisionValidator(deps: { aiVision?: AiVision }): Validator {
  return {
    id: 'vision.sanity',
    appliesTo(kind: AssetKind): boolean {
      return IMAGE_KINDS.has(kind)
    },
    async check(asset: Asset, _listing: ListingFile, _platform: PlatformSpec, ctx: Ctx): Promise<Verdict> {
      if (!deps.aiVision) {
        return {
          pass: true,
          issues: [{ severity: 'warn', message: 'no vision service configured; sanity check skipped' }],
        }
      }
      const answer = (await deps.aiVision.critique(asset.url, QUESTION)).trim()
      const clean = answer.replace(/[^a-z]/gi, '').toLowerCase()
      if (clean === 'ok' || answer.length === 0) return { pass: true, issues: [] }
      ctx.log.debug('vision.sanity: issues found', { answer })
      return {
        pass: false,
        issues: [{ severity: 'error', message: answer.slice(0, 300) }],
        hint: `Fix these issues in the image: ${answer.slice(0, 200)}`,
      }
    },
  }
}
