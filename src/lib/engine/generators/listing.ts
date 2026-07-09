// Listing generator (kind 'listing'). Produces the copy deliverable and then runs the
// agentic optimizer on it: score against THIS marketplace's rubric, diagnose the weakest
// dimensions and missing keywords, rewrite, keep the rewrite only if the score improves,
// and loop until it plateaus. Fully marketplace-aware: the platform's real rules and
// guidelines drive both the first draft and every rewrite. No manual step.

import type { AiText, Asset, Generator, GenerateOptions, ListingFile, PlatformSpec } from '@/core'
import type { Ctx, Diagnosis, ListingCopy } from '@/core'
import { optimizeListing } from '@/core'

function parseJson(text: string): ListingCopy {
  const tryParse = (s: string) => {
    try {
      return JSON.parse(s) as ListingCopy
    } catch {
      return null
    }
  }
  const direct = tryParse(text)
  if (direct) return direct
  const match = text.match(/\{[\s\S]*\}/)
  if (match) {
    const extracted = tryParse(match[0])
    if (extracted) return extracted
  }
  throw new Error('listing: model did not return valid JSON')
}

function clampToMax(s: string, max: number): string {
  if (s.length <= max) return s
  const cut = s.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim()
}

function topKeywords(listing: ListingFile, n: number): string[] {
  const kws = listing.node?.keywords ?? []
  return [...kws]
    .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0) || (b.score ?? 0) - (a.score ?? 0))
    .filter((k) => k.intent !== 'informational')
    .slice(0, n)
    .map((k) => k.term)
}

/** Clamp the copy to the platform's hard limits so a rewrite can never break the rules. */
function enforceLimits(copy: ListingCopy, platform: PlatformSpec): ListingCopy {
  return {
    title: clampToMax((copy.title || '').trim(), platform.title.max),
    bullets: (copy.bullets ?? []).slice(0, platform.bullets.count).map((b) => clampToMax(String(b).trim(), platform.bullets.max)),
    features: (copy.features ?? []).slice(0, platform.features.count).map((f) => String(f).trim()),
    description: clampToMax(String(copy.description ?? '').trim(), platform.description.max),
    searchTerms: String(copy.searchTerms ?? '').trim(),
  }
}

export function createListingGenerator(aiText: AiText): Generator {
  return {
    id: 'gen.listing',
    kind: 'listing',
    async generate(
      listing: ListingFile,
      platform: PlatformSpec,
      ctx: Ctx,
      options?: GenerateOptions,
    ): Promise<Asset> {
      const p = listing.product
      const voice = listing.brand?.voice
      const keywords = listing.node?.keywords ?? []
      const topKw = topKeywords(listing, 12)
      const guidelines = platform.guidelines ?? []

      const baseSystem = [
        'You are an expert marketplace listing copywriter.',
        'Return ONLY minified JSON with keys: title, bullets, features, description, searchTerms.',
        'Never use em dashes or en dashes anywhere. Use commas or separate sentences.',
        voice ? `Write in this brand voice: ${voice}.` : '',
        guidelines.length ? `Follow these ${platform.label} rules strictly: ${guidelines.join(' ')}` : '',
      ]
        .filter(Boolean)
        .join(' ')

      const constraints = `Constraints: title <= ${platform.title.max} chars${platform.title.allowBrand === false ? ' and MUST NOT contain the brand name' : ''}; exactly ${platform.bullets.count} bullets each <= ${platform.bullets.max} chars; exactly ${platform.features.count} short key features; description <= ${platform.description.max} chars; searchTerms a single ${platform.searchTerms.maxWords ? `${platform.searchTerms.maxWords}-word ` : ''}space-separated string <= ${platform.searchTerms.maxBytes} bytes, no punctuation, no repeats.`

      const draftPrompt = [
        `Write a ${platform.label} listing for this product.`,
        `Product title: ${p.title}`,
        p.brand ? `Brand: ${p.brand}` : '',
        p.bullets.length ? `Current bullets: ${p.bullets.join(' | ')}` : '',
        p.description ? `Current description: ${p.description.slice(0, 800)}` : '',
        topKw.length ? `Prioritise these high-intent keywords naturally: ${topKw.join(', ')}.` : '',
        constraints,
        options?.comment ? `Revision notes to apply: ${options.comment}` : '',
      ]
        .filter(Boolean)
        .join('\n')

      const draftRaw = await aiText.complete(draftPrompt, { system: baseSystem, maxTokens: 1500 })
      const draft = enforceLimits(parseJson(draftRaw), platform)

      // The rewriter the optimizer calls each round: it gets the current copy plus a
      // diagnosis (weakest dimensions, missing keywords, concrete issues) and returns
      // an improved version, still inside the platform's hard limits.
      const rewrite = async (copy: ListingCopy, diagnosis: Diagnosis): Promise<ListingCopy> => {
        const fixPrompt = [
          `Improve this ${platform.label} listing. Current quality score: ${diagnosis.score}/100.`,
          `Fix these specific issues: ${diagnosis.issues.join('; ') || 'raise keyword coverage and clarity'}.`,
          diagnosis.missingKeywords.length ? `Weave in these missing keywords naturally: ${diagnosis.missingKeywords.join(', ')}.` : '',
          `Keep everything accurate to the product. ${constraints}`,
          `Current listing JSON: ${JSON.stringify(copy)}`,
          'Return ONLY the improved minified JSON with the same keys.',
        ]
          .filter(Boolean)
          .join('\n')
        const raw = await aiText.complete(fixPrompt, { system: baseSystem, maxTokens: 1500 })
        return enforceLimits(parseJson(raw), platform)
      }

      const optimized = await optimizeListing(draft, platform, ctx, rewrite, {
        keywords,
        targetScore: 92,
        maxRounds: 2,
      })

      ctx.log.debug('gen.listing: optimized', {
        platform: platform.key,
        score: optimized.score,
        rounds: optimized.rounds,
      })

      return {
        id: `${listing.id}:listing`,
        kind: 'listing',
        moduleKey: 'gen.listing',
        url: '',
        meta: {
          ...optimized.copy,
          qualityScore: optimized.score,
          optimizeRounds: optimized.rounds,
          scoreHistory: optimized.history.map((h) => h.score),
        },
        version: 1,
        validationStatus: 'pending',
      }
    },
  }
}
