// IDQ (Item Data Quality) scorer — mirrors how Amazon scores listing quality:
// title format + length, item highlights, bullets, description, key attributes,
// A+ content, image coverage (incl. a clean main image), search terms and video.
// Pure + client-safe: we score the content WE generated so the user sees the same
// quality signal Amazon uses. Returns a 0-100 score + a per-check breakdown.

export type IdqCheck = { label: string; points: number; earned: number; tip?: string }
export type IdqResult = { score: number; checks: IdqCheck[] }

const BANNED = /\b(best|#1|guarantee|cheap|free|sale|100%|no\.?\s*1)\b/i
const isAllCaps = (s: string) => /[A-Z]{4,}/.test(s) && s === s.toUpperCase()

export function scoreIDQ(result: any): IdqResult {
  const L = result?.listing || {}
  const p = result?.scraped?.product || {}
  const assets: any[] = result?.assets || []
  const title: string = L.title || ''
  const brand: string = (p.brand || '').trim()
  const bullets: string[] = L.bullets || []
  const features: string[] = L.features || []
  const desc: string = L.description || ''
  const aplusCount = (L.aPlusContent?.length || 0) || assets.filter((a) => a.type === 'a_plus_module').length
  const imgs = assets.filter((a) => a.imageUrl && a.type !== 'ugc_video')
  const hasMain = assets.some((a) => a.type === 'main_image' && a.imageUrl)
  const hasVideo = assets.some((a) => a.type === 'ugc_video' && (a.videoUrl || a.imageUrl)) || !!result?.video?.url
  const keywords: string[] = (result?.keywords || []).map((k: any) => k.keyword || k)

  const checks: IdqCheck[] = []
  const add = (label: string, points: number, ok: boolean | number, tip?: string) =>
    checks.push({ label, points, earned: typeof ok === 'number' ? Math.round(points * Math.min(1, ok)) : ok ? points : 0, tip })

  add('Title starts with brand', 8, !!brand && title.toLowerCase().startsWith(brand.toLowerCase().split(' ')[0]), 'Lead the title with your brand name.')
  add('Title within 75 characters', 8, title.length > 0 && title.length <= 75, 'Amazon caps titles at 75 characters (from Jul 2026).')
  add('Title clean (no caps/promo)', 6, !!title && !isAllCaps(title) && !BANNED.test(title), 'Avoid ALL-CAPS and promo words (best, #1, free).')
  add('Item highlight present', 6, !!L.itemHighlight && L.itemHighlight.length <= 125, 'Fill the 125-char Item Highlight field.')
  add('Five bullet points', 10, bullets.length >= 5 ? 1 : bullets.length / 5, 'Amazon wants 5 benefit-led bullets.')
  add('Bullets within length', 6, bullets.length ? bullets.filter((b) => b.length <= 200).length / bullets.length : 0, 'Keep each bullet under ~200 characters.')
  add('Description present', 10, desc.length >= 200 && desc.length <= 2000, 'Add a 200-2000 char description.')
  add('Five key features', 8, features.length >= 5 ? 1 : features.length / 5, 'List 5 standalone product features/specs.')
  add('A+ content modules', 12, aplusCount >= 3 ? 1 : aplusCount / 3, 'Add at least 3 A+ modules.')
  add('Clean main image', 8, hasMain, 'A pure-white main image is mandatory.')
  add('Five or more images', 10, imgs.length >= 5 ? 1 : imgs.length / 5, 'Listings with 5+ images convert better.')
  add('Backend search terms', 5, keywords.length >= 20 ? 1 : keywords.length / 20, 'Fill the backend search-terms field.')
  add('Product video', 3, hasVideo, 'A product video lifts conversion.')

  const total = checks.reduce((s, c) => s + c.points, 0)
  const earned = checks.reduce((s, c) => s + c.earned, 0)
  return { score: Math.round((earned / total) * 100), checks }
}
