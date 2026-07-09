// ASIN Scraper - extracts product data + reviews from Amazon.
// Strategy: try RainforestAPI → SerpAPI → ScraperAPI → free HTML fetch.
// Each provider is behind the same interface; first available wins.

import { config, getAmazonProvider } from '@/lib/config'

export type ScrapedProduct = {
  asin: string
  title: string
  brand: string
  price: number
  currency: string
  listPrice?: number
  rating: number
  reviewCount: number
  bestSellerRank?: string
  category?: string
  features: string[]
  description: string
  bullets: string[]
  images: string[]
  variants: { asin: string; title: string; price: number }[]
  dimensions?: { weight?: string; size?: string }
  availability: string
  marketplace: string
  scrapedAt: string
}

export type ScrapedReview = {
  id: string
  author: string
  rating: number
  title: string
  body: string
  date: string
  verified: boolean
  helpful: number
  sentiment: 'positive' | 'neutral' | 'negative'
}

export type ScrapeResult = {
  product: ScrapedProduct
  reviews: ScrapedReview[]
  reviewInsights: {
    total: number
    avgRating: number
    topPraises: string[]
    topComplaints: string[]
    desiredImprovements: string[]
    keywords: { word: string; count: number }[]
  }
  provider: string
}

// Main entry point
export async function scrapeAsin(
  asin: string,
  marketplace: string = 'US',
): Promise<ScrapeResult> {
  const provider = getAmazonProvider()
  console.log(`[scraper] ASIN ${asin} via ${provider}`)

  switch (provider) {
    case 'local':
      return scrapeWithLocalService(asin, marketplace)
    case 'rainforest':
      return scrapeWithRainforest(asin, marketplace)
    case 'serpapi':
      return scrapeWithSerpapi(asin, marketplace)
    case 'scraperapi':
      return scrapeWithScraperAPI(asin, marketplace)
    default:
      return scrapeWithHTML(asin, marketplace)
  }
}

// --- Local curl_cffi microservice (our own scraper, bypasses Amazon bot-wall) ---
async function scrapeWithLocalService(asin: string, marketplace: string): Promise<ScrapeResult> {
  const base = config.scraperService.url.replace(/\/$/, '')
  const domain = domainFor(marketplace)
  try {
    // Retry a couple times: Amazon occasionally soft-blocks a single request, and
    // a quick retry (the scraper rotates IP/impersonation) usually succeeds, so a
    // real product doesn't surface a "couldn't fetch" error to the user.
    let res: Response | null = null
    for (let attempt = 0; attempt < 3; attempt++) {
      res = await fetch(`${base}/product?asin=${asin}&domain=${domain}`, { signal: AbortSignal.timeout(30000) })
      if (res.ok) break
      if (attempt < 2) await new Promise((r) => setTimeout(r, 1200))
    }
    if (!res || !res.ok) throw new Error(`scraper-service /product HTTP ${res?.status ?? 'no-response'}`)
    const p = await res.json()
    if (!p.title) throw new Error('scraper-service returned no title')

    // Reviews: embedded top reviews from the product page, plus deeper pages.
    let rawReviews: any[] = Array.isArray(p.reviews) ? p.reviews : []
    try {
      const rr = await fetch(`${base}/reviews?asin=${asin}&domain=${domain}&pages=3`, {
        signal: AbortSignal.timeout(30000),
      })
      if (rr.ok) {
        const j = await rr.json()
        if (Array.isArray(j.reviews) && j.reviews.length) rawReviews = rawReviews.concat(j.reviews)
      }
    } catch {
      /* reviews are best-effort */
    }

    // De-dupe reviews by body
    const seen = new Set<string>()
    const reviews: ScrapedReview[] = rawReviews
      .filter((r) => {
        const k = (r.body || r.title || '').slice(0, 60)
        return k && !seen.has(k) && seen.add(k)
      })
      .map((r, i): ScrapedReview => ({
        id: `${asin}-r${i}`,
        author: r.author || 'Anonymous',
        rating: parseInt(r.rating || '5', 10),
        title: r.title || '',
        body: r.body || '',
        date: r.date || '',
        verified: !!r.verified,
        helpful: parseInt(r.helpful || '0', 10),
        sentiment: sentimentOf(parseInt(r.rating || '5', 10)),
      }))

    const product: ScrapedProduct = {
      asin,
      title: p.title,
      brand: p.brand || '',
      price: Number(p.price) || 0,
      currency: p.currency || 'USD',
      listPrice: Number(p.listPrice) || undefined,
      rating: Number(p.rating) || 0,
      reviewCount: Number(p.reviewCount) || 0,
      category: p.category || undefined,
      features: p.features || [],
      description: p.description || '',
      bullets: p.bullets || [],
      images: (p.images || []).slice(0, 8),
      variants: p.variants || [],
      availability: p.availability || 'unknown',
      marketplace,
      scrapedAt: new Date().toISOString(),
    }

    return { product, reviews, reviewInsights: analyzeReviews(reviews), provider: 'local' }
  } catch (err) {
    console.warn(`[scraper] local service failed (${(err as Error).message}); falling back to HTML.`)
    return scrapeWithHTML(asin, marketplace)
  }
}

// --- RainforestAPI ---
async function scrapeWithRainforest(asin: string, marketplace: string): Promise<ScrapeResult> {
  const params = new URLSearchParams({
    api_key: config.rainforest.apiKey,
    type: 'product',
    amazon_domain: domainFor(marketplace),
    asin,
  })
  const res = await fetch(`https://api.rainforestapi.com/request?${params}`)
  const data = await res.json()

  if (!data.product) throw new Error(`RainforestAPI: no product for ${asin}`)

  const p = data.product
  const product: ScrapedProduct = {
    asin,
    title: p.title || '',
    brand: p.brand || '',
    price: parseFloat(p.price?.value || '0'),
    currency: p.price?.currency || 'USD',
    listPrice: parseFloat(p.list_price?.value || '0') || undefined,
    rating: parseFloat(p.rating || '0'),
    reviewCount: parseInt(p.ratings_total || '0', 10),
    bestSellerRank: p.bestsellers_rank?.[0]?.rank?.toString(),
    category: p.bestsellers_rank?.[0]?.category,
    features: p.feature_bullets || [],
    description: p.description || '',
    bullets: p.feature_bullets || [],
    images: (p.images || []).slice(0, 8).map((i: any) => i.link),
    variants: (p.variations || []).map((v: any) => ({
      asin: v.asin,
      title: v.attributes?.color?.[0]?.value || v.asin,
      price: parseFloat(v.price?.value || '0'),
    })),
    dimensions: {
      weight: p.attributes?.item_weight?.[0]?.value,
      size: p.attributes?.item_dimensions?.[0]?.value,
    },
    availability: p.availability?.raw || 'unknown',
    marketplace,
    scrapedAt: new Date().toISOString(),
  }

  // Fetch reviews separately
  const reviews = await fetchReviewsRainforest(asin, marketplace)
  const reviewInsights = analyzeReviews(reviews)

  return { product, reviews, reviewInsights, provider: 'rainforest' }
}

async function fetchReviewsRainforest(asin: string, marketplace: string): Promise<ScrapedReview[]> {
  const params = new URLSearchParams({
    api_key: config.rainforest.apiKey,
    type: 'reviews',
    amazon_domain: domainFor(marketplace),
    asin,
    sort_by: 'most_helpful',
    page: '1',
  })
  const res = await fetch(`https://api.rainforestapi.com/request?${params}`)
  const data = await res.json()
  return (data.reviews || []).map((r: any, i: number): ScrapedReview => ({
    id: r.id || `${asin}-r${i}`,
    author: r.author || 'Anonymous',
    rating: parseInt(r.rating || '5', 10),
    title: r.title || '',
    body: r.body || '',
    date: r.date || '',
    verified: !!r.verified,
    helpful: parseInt(r.helpful_votes || '0', 10),
    sentiment: sentimentOf(parseInt(r.rating || '5', 10)),
  }))
}

// --- SerpAPI ---
async function scrapeWithSerpapi(asin: string, marketplace: string): Promise<ScrapeResult> {
  const params = new URLSearchParams({
    api_key: config.serpapi.apiKey,
    engine: 'amazon_product',
    amazon_domain: domainFor(marketplace),
    asin,
  })
  const res = await fetch(`https://serpapi.com/search?${params}`)
  const data = await res.json()

  const p = data.product_results || {}
  const product: ScrapedProduct = {
    asin,
    title: p.title || '',
    brand: p.brand || '',
    price: parseFloat(p.price?.replace(/[^0-9.]/g, '') || '0'),
    currency: 'USD',
    rating: parseFloat(p.rating || '0'),
    reviewCount: parseInt(p.reviews || '0', 10),
    features: p.feature_bullets || [],
    description: p.description || '',
    bullets: p.feature_bullets || [],
    images: (p.images || []).slice(0, 8),
    variants: (p.variants || []).map((v: any) => ({
      asin: v.asin,
      title: v.title || v.asin,
      price: 0,
    })),
    availability: p.availability || 'unknown',
    marketplace,
    scrapedAt: new Date().toISOString(),
  }

  const reviews: ScrapedReview[] = []
  const reviewInsights = analyzeReviews(reviews)
  return { product, reviews, reviewInsights, provider: 'serpapi' }
}

// --- ScraperAPI (fetches HTML, we parse it) ---
async function scrapeWithScraperAPI(asin: string, marketplace: string): Promise<ScrapeResult> {
  const url = `https://www.${domainFor(marketplace)}/dp/${asin}`
  const params = new URLSearchParams({
    api_key: config.scraperapi.apiKey,
    url,
    render: 'false',
  })
  const res = await fetch(`https://api.scraperapi.com/?${params}`)
  const html = await res.text()
  return parseAmazonHTML(html, asin, marketplace, 'scraperapi')
}

// --- Free HTML fallback (no key, rate-limited) ---
// Uses the Open Graph + JSON-LD metadata that Amazon embeds in every product page.
// More resilient than parsing the full HTML.
async function scrapeWithHTML(asin: string, marketplace: string): Promise<ScrapeResult> {
  const domain = domainFor(marketplace)
  const url = `https://www.${domain}/dp/${asin}`
  console.log(`[scraper] Free HTML fetch: ${url}`)

  // Try multiple user agents - Amazon blocks some
  const userAgents = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  ]

  let html = ''
  let lastError: any = null
  for (const ua of userAgents) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': ua,
          'Accept-Language': 'en-US,en;q=0.9',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        redirect: 'follow',
      })
      if (res.ok) {
        html = await res.text()
        if (html.length > 5000) break
      }
      lastError = new Error(`HTTP ${res.status}`)
    } catch (e) {
      lastError = e
    }
  }

  if (!html || html.length < 5000 || isBotWall(html)) {
    console.warn(`[scraper] Free HTML scrape blocked/empty for ${asin}.`)
    return failOrDemo(asin, marketplace, lastError?.message || 'bot-wall')
  }

  const parsed = parseAmazonHTML(html, asin, marketplace, 'html')
  // If Amazon served a page but parsing found nothing usable, don't return an
  // empty product.
  if (!parsed.product.title && !parsed.product.price) {
    console.warn(`[scraper] Free HTML parse yielded no product fields for ${asin}.`)
    return failOrDemo(asin, marketplace, 'parse-empty')
  }
  return parsed
}

// Detect Amazon's bot/captcha interstitial ("Robot Check", "Sorry, something went wrong").
function isBotWall(html: string): boolean {
  return (
    /Enter the characters you see below|Type the characters you see in this image|Robot Check|api-services-support@amazon\.com/i.test(
      html,
    ) && !/id="productTitle"/i.test(html)
  )
}

// Demo stub - returned when no API key is configured AND free HTML fails.
// This lets the UI/UX flow work end-to-end during development, while making
// it obvious that the data is synthetic.
// In production we NEVER fabricate data: a failed scrape returns an honest error
// so callers can tell the user "couldn't fetch this product". Demo data is a
// dev-only convenience so local flows work without live scraping.
function failOrDemo(asin: string, marketplace: string, reason: string): ScrapeResult {
  if (process.env.NODE_ENV === 'production') {
    void reason // internal detail, kept out of the client-facing message
    const e: any = new Error(`We couldn't fetch product ${asin}. It may not exist, or Amazon is temporarily blocking the request. Double-check the ASIN and try again.`)
    e.status = 404 // client-actionable (bad/nonexistent ASIN or transient block), not a server fault
    throw e
  }
  return demoStub(asin, marketplace, reason)
}

function demoStub(asin: string, marketplace: string, error: string): ScrapeResult {
  const product: ScrapedProduct = {
    asin,
    title: `[DEMO] Premium Product ${asin}`,
    brand: 'Demo Brand',
    price: 29.99,
    currency: 'USD',
    listPrice: 49.99,
    rating: 4.5,
    reviewCount: 1247,
    bestSellerRank: '#1,234 in Category',
    category: 'demo',
    features: [
      'Premium quality materials',
      'Ergonomic design for daily use',
      'Backed by 2-year warranty',
      'Free shipping on orders over $25',
      'Loved by 10,000+ customers',
    ],
    description: 'A premium product designed for modern consumers. Built to last, priced to convert.',
    bullets: [
      'PREMIUM QUALITY: Made with aerospace-grade materials for durability that lasts years',
      'ERGONOMIC DESIGN: Engineered for comfort during extended use, reducing fatigue by 40%',
      'EASY TO USE: Intuitive controls mean anyone can use it right out of the box, no manual needed',
      'BUILT TO LAST: Backed by our 2-year warranty and 10,000+ five-star reviews from happy customers',
      'PERFECT GIFT: Beautifully packaged, ships fast, makes a thoughtful gift for any occasion',
    ],
    images: [
      `https://m.media-amazon.com/images/I/51 ${asin.slice(0, 4)}L.jpg`,
    ],
    variants: [],
    dimensions: { weight: '1.2 lbs', size: '8 x 6 x 4 in' },
    availability: 'In Stock',
    marketplace,
    scrapedAt: new Date().toISOString(),
  }

  const reviews: ScrapedReview[] = [
    {
      id: 'demo-r1',
      author: 'Sarah M.',
      rating: 5,
      title: 'Exceeded my expectations!',
      body: 'I was hesitant at first but this product completely won me over. The build quality is amazing and it works exactly as described. Would buy again.',
      date: '2024-08-15',
      verified: true,
      helpful: 42,
      sentiment: 'positive',
    },
    {
      id: 'demo-r2',
      author: 'James K.',
      rating: 5,
      title: 'Best purchase this year',
      body: 'Use it every day. Wish it came in more colors but the functionality is perfect. Highly recommend.',
      date: '2024-08-10',
      verified: true,
      helpful: 28,
      sentiment: 'positive',
    },
    {
      id: 'demo-r3',
      author: 'Priya R.',
      rating: 4,
      title: 'Great but pricey',
      body: 'Works really well and feels premium. Knocked one star because it is on the expensive side. If you can afford it, go for it.',
      date: '2024-08-05',
      verified: true,
      helpful: 15,
      sentiment: 'positive',
    },
    {
      id: 'demo-r4',
      author: 'Mike T.',
      rating: 2,
      title: 'Smaller than expected',
      body: 'Quality is fine but the size was misleading in the photos. Would be great if they showed it next to a coin or something for scale.',
      date: '2024-07-28',
      verified: true,
      helpful: 9,
      sentiment: 'negative',
    },
  ]

  return {
    product,
    reviews,
    reviewInsights: {
      total: 4,
      avgRating: 4,
      topPraises: ['Exceeded my expectations!', 'Best purchase this year', 'Premium build quality'],
      topComplaints: ['Smaller than expected', 'Pricey for the size'],
      desiredImprovements: [
        'wish it came in more colors',
        'would be great if they showed it next to a coin for scale',
      ],
      keywords: [
        { word: 'quality', count: 8 },
        { word: 'premium', count: 6 },
        { word: 'recommend', count: 5 },
        { word: 'size', count: 4 },
        { word: 'price', count: 3 },
      ],
    },
    provider: 'demo',
  }
}

// Parse Amazon HTML - used by ScraperAPI + free HTML paths
function parseAmazonHTML(html: string, asin: string, marketplace: string, provider: string): ScrapeResult {
  // Title
  const titleMatch = html.match(/<span[^>]*id="productTitle"[^>]*>([^<]+)<\/span>/i)
  const title = titleMatch ? titleMatch[1].trim() : ''

  // Price
  const priceMatch =
    html.match(/"price":\s*"?\$?([\d.]+)"/) ||
    html.match(/class="a-price[^"]*"[^>]*>[\s\S]*?<span[^>]*class="a-offscreen">\$?([\d.]+)<\/span>/i)
  const price = priceMatch ? parseFloat(priceMatch[1]) : 0

  // Rating
  const ratingMatch = html.match(/"ratingValue":\s*"([\d.]+)"/) || html.match(/(\d\.\d)\s*out of\s*5\s*stars/i)
  const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0

  // Review count
  const reviewMatch = html.match(/"reviewCount":\s*"([\d,]+)"/) || html.match(/([\d,]+)\s*global ratings/i)
  const reviewCount = reviewMatch ? parseInt(reviewMatch[1].replace(/,/g, ''), 10) : 0

  // Brand
  const brandMatch = html.match(/<a[^>]*id="bylineInfo"[^>]*>([^<]+)<\/a>/i)
  const brand = brandMatch ? brandMatch[1].replace(/^(Visit the |Brand: )/, '').replace(/\s+Store$/, '').trim() : ''

  // Feature bullets
  const bullets: string[] = []
  const bulletRegex = /<span[^>]*class="a-list-item"[^>]*>([^<]{20,})<\/span>/gi
  let bm
  while ((bm = bulletRegex.exec(html)) !== null && bullets.length < 10) {
    bullets.push(bm[1].trim())
  }

  // Images
  const images: string[] = []
  const imgRegex = /"hiRes":"([^"]+\.jpg)"/g
  let im
  while ((im = imgRegex.exec(html)) !== null && images.length < 8) {
    images.push(im[1])
  }

  // Variants
  const variants: { asin: string; title: string; price: number }[] = []
  const variantRegex = /"asin":"([A-Z0-9]{10})"[^}]*?"title":"([^"]+)"/g
  let vm
  while ((vm = variantRegex.exec(html)) !== null && variants.length < 10) {
    variants.push({ asin: vm[1], title: vm[2], price: 0 })
  }

  const product: ScrapedProduct = {
    asin,
    title,
    brand,
    price,
    currency: 'USD',
    rating,
    reviewCount,
    features: bullets,
    description: bullets.join(' '),
    bullets,
    images,
    variants,
    availability: 'unknown',
    marketplace,
    scrapedAt: new Date().toISOString(),
  }

  const reviews: ScrapedReview[] = [] // free HTML path doesn't fetch reviews
  const reviewInsights = analyzeReviews(reviews)

  return { product, reviews, reviewInsights, provider }
}

// Review sentiment + insights
export function sentimentOf(rating: number): 'positive' | 'neutral' | 'negative' {
  if (rating >= 4) return 'positive'
  if (rating >= 3) return 'neutral'
  return 'negative'
}

export function analyzeReviews(reviews: ScrapedReview[]) {
  const positive = reviews.filter((r) => r.sentiment === 'positive')
  const negative = reviews.filter((r) => r.sentiment === 'negative')
  const neutral = reviews.filter((r) => r.sentiment === 'neutral')

  // Word frequency
  const wordCounts: Record<string, number> = {}
  for (const r of reviews) {
    const words = (r.body + ' ' + r.title).toLowerCase().match(/\b[a-z]{4,}\b/g) || []
    for (const w of words) {
      if (!STOPWORDS.has(w)) wordCounts[w] = (wordCounts[w] || 0) + 1
    }
  }
  const keywords = Object.entries(wordCounts)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)

  return {
    total: reviews.length,
    avgRating: reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0,
    topPraises: positive.slice(0, 3).map((r) => r.title || r.body.slice(0, 80)),
    topComplaints: negative.slice(0, 3).map((r) => r.title || r.body.slice(0, 80)),
    desiredImprovements: negative
      .flatMap((r) => r.body.match(/(?:wish|hope|should|would|if only)[^.]+\./gi) || [])
      .slice(0, 5),
    keywords,
  }
}

const STOPWORDS = new Set([
  'the','and','for','this','that','with','have','from','your','was','are','but','not','they','will','what','about','out','can','one','all','would','there','their','what','which','when','them','then','than','these','those','been','were','has','had','did','does','done','into','over','also','more','very','some','just','like','only','such','here','where','when','who','how','why','use','used','using','really','quite','much','many','most','other','its','our','you','your','i','me','my','we','us','it','is','to','of','a','in','on','at','as','by','an','or','if','so','be','do','no','yes','got','get','had','has','had',
])

function domainFor(marketplace: string): string {
  const map: Record<string, string> = {
    US: 'amazon.com',
    CA: 'amazon.ca',
    MX: 'amazon.com.mx',
    UK: 'amazon.co.uk',
    DE: 'amazon.de',
    FR: 'amazon.fr',
    IT: 'amazon.it',
    ES: 'amazon.es',
    IN: 'amazon.in',
    JP: 'amazon.co.jp',
    AU: 'amazon.com.au',
  }
  return map[marketplace] || 'amazon.com'
}

export { domainFor as getAmazonDomain }
