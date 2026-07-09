import { NextRequest, NextResponse } from 'next/server'
import { scrapeAsin } from '@/lib/scraper/asin'
import { guardRate } from '@/lib/api'

export async function POST(req: NextRequest) {
  const limited = guardRate(req, 'scrape')
  if (limited) return limited
  try {
    const body = await req.json().catch(() => ({}))
    const asin = (body.asin || '').toString().trim().toUpperCase()
    const marketplace = (body.marketplace || 'US').toString().trim().toUpperCase()

    if (!asin || asin.length !== 10) {
      return NextResponse.json(
        { ok: false, error: 'ASIN must be 10 characters (e.g. B0CXYZ1234)' },
        { status: 400 },
      )
    }

    const result = await scrapeAsin(asin, marketplace)
    return NextResponse.json({ ok: true, data: result })
  } catch (err) {
    console.error('Scrape error:', err)
    // A "product not found / blocked" scrape failure is client-actionable (4xx),
    // not a server fault. Respect the status the scraper set.
    const status = (err as any)?.status
    const code = typeof status === 'number' && status >= 400 && status < 600 ? status : 500
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: code },
    )
  }
}
