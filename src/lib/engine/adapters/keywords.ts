// KeywordProvider adapter. Combines two FREE sources into a richer keyword set than
// a single autocomplete call:
//   1. Google Suggest (reliable, popularity-ordered, works without a key).
//   2. Amazon autocomplete + related (via the existing researchKeywords).
// Terms are scored 0 to 100 by how often they surface and how early they rank, which
// is an honest popularity PROXY. True search volume is not free; when a Helium 10 or
// Amazon PI provider is added it fills the `volume` field and this proxy becomes the
// tiebreaker. Never throws: on any failure it returns what it has.

import type { KeywordEntry, KeywordIntent, KeywordProvider } from '@/core'
import { researchKeywords } from '@/lib/keywords'
import { amazonMarketplaceCode } from '../map'

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'

// Modifiers widen coverage across buyer intents without a paid tool.
const MODIFIERS = ['', ' best', ' for', ' king size', ' price', ' online']

function detectIntent(term: string): KeywordIntent {
  const t = term.toLowerCase()
  if (/\b(buy|price|cheap|best|deal|discount|sale|order|online|near me)\b/.test(t)) return 'transactional'
  if (/\b(review|vs|comparison|top|guide|how to|what is|size|means)\b/.test(t)) return 'informational'
  return 'commercial'
}

async function googleSuggest(seed: string): Promise<string[]> {
  try {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(seed)}`
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(8000) })
    if (!res.ok) return []
    const data = (await res.json()) as [string, string[]]
    return Array.isArray(data?.[1]) ? data[1] : []
  } catch {
    return []
  }
}

export function createKeywordProvider(): KeywordProvider {
  return {
    id: 'keywords.free-composite',
    async keywords(nodeKey, platform): Promise<KeywordEntry[]> {
      // rank weight: earlier suggestions score higher; freq: seen across seeds.
      const acc = new Map<string, { freq: number; bestRank: number; sources: Set<string> }>()
      const bump = (term: string, rank: number, source: string) => {
        const key = term.trim().toLowerCase()
        if (!key || key.length < 2) return
        const cur = acc.get(key) ?? { freq: 0, bestRank: 999, sources: new Set<string>() }
        cur.freq += 1
        cur.bestRank = Math.min(cur.bestRank, rank)
        cur.sources.add(source)
        acc.set(key, cur)
      }

      // 1. Google Suggest across modifiers (free, reliable).
      const suggestBatches = await Promise.all(MODIFIERS.map((m) => googleSuggest(`${nodeKey}${m}`)))
      for (const batch of suggestBatches) batch.forEach((term, i) => bump(term, i, 'google'))

      // 2. Amazon autocomplete + related (best via the residential path).
      try {
        const research = await researchKeywords(nodeKey, amazonMarketplaceCode(platform))
        research.keywords.forEach((k, i) => bump(k.keyword, i, `amazon:${k.source}`))
      } catch {
        /* non-fatal */
      }

      const entries = [...acc.entries()]
      // Popularity proxy: frequency dominates, early rank is a bonus. Normalize to 0..100.
      const raw = entries.map(([term, s]) => ({ term, raw: s.freq * 10 + Math.max(0, 20 - s.bestRank), sources: s.sources }))
      const max = Math.max(1, ...raw.map((r) => r.raw))
      return raw
        .map((r) => ({
          term: r.term,
          intent: detectIntent(r.term),
          source: [...r.sources].join(','),
          score: Math.round((r.raw / max) * 100),
        }))
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, 60)
    },
  }
}
