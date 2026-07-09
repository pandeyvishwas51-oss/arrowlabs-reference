// Best-seller intelligence. Given the top-ranking products in a node (their titles,
// bullets, and prices, which we scrape), it mines the keyword phrases the winners
// actually use and a few structural signals. Feeding these into the keyword set and the
// optimizer means our listing covers what already ranks, without any manual research.
// Pure and free: it only processes scraped text.

export interface CompetitorItem {
  title?: string
  bullets?: string[]
  price?: number
}

export interface BestSellerSignals {
  /** Phrases (1 to 3 words) most common across winning titles and bullets, freq-ranked. */
  keywordsFromWinners: { term: string; freq: number }[]
  medianTitleLength: number
  priceRange?: { min: number; max: number; median: number }
  sampleSize: number
}

const STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'for', 'with', 'of', 'to', 'in', 'on', 'by', 'from', 'at', 'is', 'are',
  'this', 'that', 'your', 'you', 'it', 'as', 'set', 'pack', 'pcs', 'pc', 'x', 'cm', 'inch', 'size',
])

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP.has(w) && !/^\d+$/.test(w))
}

function median(nums: number[]): number {
  if (!nums.length) return 0
  const s = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2)
}

export function mineKeywordsFromCompetitors(items: CompetitorItem[]): BestSellerSignals {
  const freq = new Map<string, number>()
  const titleLengths: number[] = []
  const prices: number[] = []

  for (const item of items) {
    if (typeof item.price === 'number' && item.price > 0) prices.push(item.price)
    const text = [item.title ?? '', ...(item.bullets ?? [])].join(' ')
    if (item.title) titleLengths.push(item.title.length)
    const tokens = tokenize(text)
    // 1-grams, 2-grams, 3-grams
    for (let n = 1; n <= 3; n++) {
      for (let i = 0; i + n <= tokens.length; i++) {
        const gram = tokens.slice(i, i + n).join(' ')
        freq.set(gram, (freq.get(gram) ?? 0) + 1)
      }
    }
  }

  const keywordsFromWinners = [...freq.entries()]
    .filter(([, f]) => f >= 2) // must appear in more than one place to matter
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([term, freqCount]) => ({ term, freq: freqCount }))

  return {
    keywordsFromWinners,
    medianTitleLength: median(titleLengths),
    priceRange: prices.length ? { min: Math.min(...prices), max: Math.max(...prices), median: median(prices) } : undefined,
    sampleSize: items.length,
  }
}
