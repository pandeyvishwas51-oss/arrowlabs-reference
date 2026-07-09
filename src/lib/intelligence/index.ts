// Consumer + competitive intelligence built from scraped reviews and competitor
// listings. Powers the customer avatar and the competitor-gap analysis that
// ListingOptimization.ai charges for (via ProductPinion) - we derive it ourselves.

import type { ScrapeResult } from '@/lib/scraper/asin'
import type { CompetitorReport } from '@/lib/scraper/competitors'
import { generateJSON, type TextMessage } from '@/lib/ai/text'

export type CustomerAvatar = {
  name: string
  snapshot: string
  demographics: string
  pains: string[]
  desires: string[]
  objections: string[]
  buyingTriggers: string[]
}

export async function customerAvatar(scraped: ScrapeResult): Promise<CustomerAvatar> {
  const p = scraped.product
  const ins = scraped.reviewInsights
  const sampleReviews = scraped.reviews.slice(0, 12).map((r) => `(${r.rating}★) ${r.title}: ${r.body}`.slice(0, 260))

  const system: TextMessage = {
    role: 'system',
    content: `You build a sharp, evidence-based customer avatar for an e-commerce product from REAL review data. Ground every point in the reviews, do not invent a persona from thin air. Return JSON only:
{ "name": string (a short archetype label, e.g. "The Marathon Gamer"), "snapshot": string (2 sentences), "demographics": string (who they are), "pains": string[] (what frustrates them, from reviews), "desires": string[] (what they want), "objections": string[] (what makes them hesitate before buying), "buyingTriggers": string[] (what pushes them to purchase) }`,
  }
  const user: TextMessage = {
    role: 'user',
    content: `PRODUCT: ${p.title}
CATEGORY: ${p.category || 'general'} · RATING: ${p.rating}/5 (${p.reviewCount} reviews)
Review praises: ${ins.topPraises.join(' | ')}
Review complaints: ${ins.topComplaints.join(' | ')}
Expectation gaps: ${ins.desiredImprovements.join(' | ')}
Sample reviews:
${sampleReviews.join('\n') || '(few reviews captured, infer carefully from product + category)'}

Build the avatar JSON now.`,
  }
  const { data } = await generateJSON<any>([system, user], { temperature: 0.6, maxTokens: 1200 })
  return {
    name: data.name || 'Target buyer',
    snapshot: data.snapshot || '',
    demographics: data.demographics || '',
    pains: arr(data.pains),
    desires: arr(data.desires),
    objections: arr(data.objections),
    buyingTriggers: arr(data.buyingTriggers),
  }
}

export type CompetitorGaps = {
  summary: string
  theyDoYouDont: string[] // what competitors show/claim that you don't
  yourOpportunities: string[] // white space to own
  pricePositioning: string
}

export async function competitorGaps(
  scraped: ScrapeResult,
  competitors: CompetitorReport,
): Promise<CompetitorGaps> {
  const p = scraped.product
  const top = competitors.topCompetitors.slice(0, 8).map(
    (c) => `${c.title} | $${c.price} | ${c.rating}★ (${c.reviewCount})${c.sponsored ? ' [ad]' : ''}${c.bestSeller ? ' [best-seller]' : ''}`,
  )
  const system: TextMessage = {
    role: 'system',
    content: `You are an Amazon competitive strategist. Compare a product against the top competitors on the same keyword and return a gap analysis JSON:
{ "summary": string, "theyDoYouDont": string[] (features/claims/positioning competitors use that this product's listing does not), "yourOpportunities": string[] (differentiation white-space this product can own, grounded in its reviews/strengths), "pricePositioning": string (where this price sits and what to do) }`,
  }
  const user: TextMessage = {
    role: 'user',
    content: `YOUR PRODUCT: ${p.title}
Your price: $${p.price} · Your rating: ${p.rating}/5 (${p.reviewCount})
Your review strengths: ${scraped.reviewInsights.topPraises.join(' | ')}
Competitor price range: $${competitors.priceRange.min}-$${competitors.priceRange.max} (median $${competitors.priceRange.median})
Common competitor keywords: ${competitors.commonKeywords.slice(0, 12).map((k) => k.word).join(', ')}
Top competitors:
${top.join('\n')}

Return the gap analysis JSON now.`,
  }
  const { data } = await generateJSON<any>([system, user], { temperature: 0.5, maxTokens: 1400 })
  return {
    summary: data.summary || '',
    theyDoYouDont: arr(data.theyDoYouDont),
    yourOpportunities: arr(data.yourOpportunities),
    pricePositioning: data.pricePositioning || '',
  }
}

function arr(x: any): string[] {
  return Array.isArray(x) ? x.filter(Boolean).map(String).slice(0, 8) : []
}
