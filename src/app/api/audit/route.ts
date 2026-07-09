import { NextRequest } from 'next/server'
import { z } from 'zod'
import { ok, fail, parseBody, guardRate, wrapError } from '@/lib/api'
import { scrapeAsin } from '@/lib/scraper/asin'
import { crawlCompetitors, type CompetitorReport } from '@/lib/scraper/competitors'
import { auditListing } from '@/lib/audit'
import { customerAvatar, competitorGaps } from '@/lib/intelligence'

export const maxDuration = 300

const schema = z.object({
  asin: z.string().trim().min(1),
  marketplace: z.string().trim().optional(),
})

// Derive a competitor search term from the product title (drop the brand, keep
// the product-type words).
function searchTerm(title: string, brand: string, category?: string): string {
  if (category && category.length > 2 && category.toLowerCase() !== 'general') return category
  const cleaned = title.replace(new RegExp(brand, 'ig'), '').replace(/[^a-z0-9 ]/gi, ' ')
  return cleaned.split(/\s+/).filter((w) => w.length > 2).slice(0, 3).join(' ') || title.slice(0, 30)
}

export async function POST(req: NextRequest) {
  const limited = guardRate(req, 'audit')
  if (limited) return limited

  const parsed = await parseBody(req, schema)
  if ('error' in parsed) return parsed.error
  const asin = parsed.data.asin.toUpperCase()
  const marketplace = (parsed.data.marketplace || 'US').toUpperCase()
  if (asin.length !== 10) return fail('ASIN must be 10 characters (e.g. B0CXYZ1234)', 400)

  try {
    const scraped = await scrapeAsin(asin, marketplace)

    // Competitor set (best-effort, don't fail the audit if it errors).
    let competitors: CompetitorReport | null = null
    try {
      const term = searchTerm(scraped.product.title, scraped.product.brand, scraped.product.category)
      competitors = await crawlCompetitors(term, marketplace, 10)
    } catch {
      /* competitors optional */
    }

    // Keywords to audit coverage against. Competitor search terms come first (they
    // are what shoppers actually search); generic review filler words are dropped
    // so "missing keywords" surfaces real SEO gaps, not sentiment words.
    const FILLER = new Set([
      'great', 'good', 'nice', 'well', 'little', 'first', 'love', 'like', 'really', 'happy',
      'works', 'work', 'would', 'could', 'also', 'very', 'much', 'thing', 'things', 'get',
      'got', 'one', 'day', 'days', 'time', 'buy', 'bought', 'price', 'product', 'item',
      'easy', 'super', 'pretty', 'definitely', 'overall', 'recommend', 'perfect', 'amazing',
    ])
    const compKw = (competitors?.commonKeywords || []).map((k) => k.word)
    const revKw = scraped.reviewInsights.keywords.map((k) => k.word).filter((w) => w.length >= 4 && !FILLER.has(w.toLowerCase()))
    const auditKeywords = Array.from(new Set([...compKw, ...revKw])).slice(0, 25)

    // Run the model-driven pieces in parallel.
    const [audit, avatar, gaps] = await Promise.all([
      auditListing(scraped, auditKeywords),
      customerAvatar(scraped),
      competitors ? competitorGaps(scraped, competitors) : Promise.resolve(null),
    ])

    return ok({
      product: scraped.product,
      reviewsAnalyzed: scraped.reviews.length,
      audit,
      avatar,
      competitors,
      gaps,
    })
  } catch (err) {
    return wrapError('api.audit', err)
  }
}
