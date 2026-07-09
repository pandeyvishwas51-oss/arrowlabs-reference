// Listing-quality rubric. This is the "IDQ science": a rigorous, weighted score of a
// piece of listing copy against a platform's real rules and a target keyword set. It is
// the fitness function the agentic optimizer maximizes. Pure and deterministic, so the
// optimizer's decisions are explainable, not a black box.
//
// Weights sum to 100. Keyword coverage carries the most weight because, per the review
// meeting, ranking follows the keywords the copy actually contains.

import type { KeywordEntry } from '../contracts/domain'
import type { PlatformSpec } from '../contracts/platform'

export interface ListingCopy {
  title: string
  bullets: string[]
  features: string[]
  description: string
  searchTerms: string
}

export interface QualityDimension {
  key: string
  label: string
  weight: number
  got: number // 0..1
  issue?: string
}

export interface QualityResult {
  score: number // 0..100
  dimensions: QualityDimension[]
  weakest: string[] // dimension keys, worst first
  missingKeywords: string[] // high-value keywords not yet used
}

const PROMO = /(best ?seller|lowest price|sale|free shipping|100% genuine|no\.? ?1|cheapest)/i

function byteLen(s: string): number {
  return new TextEncoder().encode(s).length
}

function topKeywords(keywords: KeywordEntry[], n: number): string[] {
  return [...keywords]
    .filter((k) => k.intent !== 'informational')
    .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0) || (b.score ?? 0) - (a.score ?? 0))
    .slice(0, n)
    .map((k) => k.term.toLowerCase())
}

export function scoreListingQuality(
  copy: ListingCopy,
  platform: PlatformSpec,
  keywords: KeywordEntry[] = [],
): QualityResult {
  const title = (copy.title || '').trim()
  const bullets = (copy.bullets || []).map((b) => (b || '').trim()).filter(Boolean)
  const features = (copy.features || []).filter(Boolean)
  const description = (copy.description || '').trim()
  const searchTerms = (copy.searchTerms || '').trim()

  const haystack = [title, ...bullets, description, searchTerms].join(' ').toLowerCase()
  const top = topKeywords(keywords, 12)
  const covered = top.filter((k) => haystack.includes(k))
  const missing = top.filter((k) => !haystack.includes(k))
  const coverage = top.length ? covered.length / top.length : 1

  const t = platform.title
  const forbiddenHit = (t.forbiddenChars ?? []).some((c) => title.includes(c))
  const brandInTitle = t.allowBrand === false && /\b[A-Z][a-zA-Z]{2,}\b/.test(title.split(' ')[0] || '')
  const frontloadWindow = t.mobileTruncate ?? Math.min(t.max, 80)
  const topKw = top[0]
  const frontloaded = !topKw || title.slice(0, frontloadWindow).toLowerCase().includes(topKw)

  const dims: QualityDimension[] = [
    {
      key: 'title.length',
      label: 'Title present and within limit',
      weight: 10,
      got: title.length === 0 ? 0 : title.length <= t.max ? 1 : 0.4,
      issue: title.length === 0 ? 'title is empty' : title.length > t.max ? `title exceeds ${t.max} chars` : undefined,
    },
    {
      key: 'title.frontload',
      label: 'Top keyword in the mobile-visible front of the title',
      weight: 12,
      got: frontloaded ? 1 : 0.3,
      issue: frontloaded ? undefined : `lead with "${topKw}" within the first ${frontloadWindow} characters`,
    },
    {
      key: 'title.clean',
      label: 'Title free of promo words, forbidden characters, and disallowed brand',
      weight: 8,
      got: forbiddenHit || PROMO.test(title) || brandInTitle ? 0.2 : 1,
      issue: forbiddenHit
        ? 'title contains a forbidden character'
        : PROMO.test(title)
          ? 'remove promotional words from the title'
          : brandInTitle
            ? 'this marketplace does not allow the brand name in the title'
            : undefined,
    },
    {
      key: 'bullets.count',
      label: `${platform.bullets.count} bullet points`,
      weight: 8,
      got: Math.min(bullets.length / platform.bullets.count, 1),
      issue: bullets.length < platform.bullets.count ? `add ${platform.bullets.count - bullets.length} more bullets` : undefined,
    },
    {
      key: 'bullets.quality',
      label: 'Bullets substantial and within length',
      weight: 8,
      got:
        bullets.length === 0
          ? 0
          : bullets.filter((b) => b.length >= 30 && b.length <= platform.bullets.max).length / bullets.length,
      issue: bullets.some((b) => b.length > platform.bullets.max) ? `trim bullets to ${platform.bullets.max} chars` : undefined,
    },
    {
      key: 'features.count',
      label: `${platform.features.count} key features`,
      weight: 6,
      got: Math.min(features.length / platform.features.count, 1),
    },
    {
      key: 'description',
      label: 'Rich description',
      weight: 8,
      got: description.length >= Math.min(400, platform.description.max * 0.4) ? 1 : description.length > 0 ? 0.5 : 0,
      issue: description.length === 0 ? 'description is empty' : undefined,
    },
    {
      key: 'searchTerms.valid',
      label: 'Backend search terms within byte budget and clean',
      weight: 8,
      got: searchTermsScore(searchTerms, platform),
      issue: searchTermsIssue(searchTerms, platform),
    },
    {
      key: 'keyword.coverage',
      label: 'High-value keywords used across the copy',
      weight: 22,
      got: coverage,
      issue: missing.length ? `weave in: ${missing.slice(0, 5).join(', ')}` : undefined,
    },
    {
      key: 'keyword.intentFocus',
      label: 'Buyer-intent keywords in the title and bullets',
      weight: 10,
      got: intentFocusScore(title, bullets, keywords),
    },
  ]

  const totalWeight = dims.reduce((s, d) => s + d.weight, 0) || 1
  const earned = dims.reduce((s, d) => s + d.weight * d.got, 0)
  const weakest = [...dims].sort((a, b) => a.weight * (1 - b.got) - b.weight * (1 - a.got) || (a.got - b.got)).filter((d) => d.got < 0.95).map((d) => d.key)

  return { score: Math.round((earned / totalWeight) * 100), dimensions: dims, weakest, missingKeywords: missing }
}

function searchTermsScore(terms: string, platform: PlatformSpec): number {
  if (!terms) return 0
  const rule = platform.searchTerms
  let score = 1
  if (byteLen(terms) > rule.maxBytes) score -= 0.5
  if (rule.allowPunctuation === false && /[,;.]/.test(terms)) score -= 0.3
  if (rule.maxWords && terms.split(/\s+/).length > rule.maxWords) score -= 0.3
  return Math.max(0, score)
}

function searchTermsIssue(terms: string, platform: PlatformSpec): string | undefined {
  if (!terms) return 'backend search terms are empty'
  const rule = platform.searchTerms
  if (byteLen(terms) > rule.maxBytes) return `search terms exceed ${rule.maxBytes} bytes`
  if (rule.allowPunctuation === false && /[,;.]/.test(terms)) return 'remove commas and punctuation from search terms'
  if (rule.maxWords && terms.split(/\s+/).length > rule.maxWords) return `use at most ${rule.maxWords} words`
  return undefined
}

function intentFocusScore(title: string, bullets: string[], keywords: KeywordEntry[]): number {
  const buyer = keywords.filter((k) => k.intent === 'transactional' || k.intent === 'commercial').map((k) => k.term.toLowerCase())
  if (!buyer.length) return 1
  const front = [title, ...bullets].join(' ').toLowerCase()
  const hits = buyer.filter((k) => front.includes(k)).length
  return Math.min(hits / Math.min(buyer.length, 4), 1)
}
