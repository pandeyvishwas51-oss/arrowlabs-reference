import { NextRequest, NextResponse } from 'next/server'
import { crawlCompetitors } from '@/lib/scraper/competitors'
import { guardRate } from '@/lib/api'

export async function POST(req: NextRequest) {
  const limited = guardRate(req, 'competitors')
  if (limited) return limited
  try {
    const body = await req.json().catch(() => ({}))
    const keyword = (body.keyword || '').toString().trim().slice(0, 120)
    const marketplace = (body.marketplace || 'US').toString().trim().toUpperCase()
    const maxResults = Math.min(Math.max(Number(body.maxResults) || 10, 1), 20)

    if (keyword.length < 2) {
      return NextResponse.json({ ok: false, error: 'A keyword of at least 2 characters is required' }, { status: 400 })
    }

    const result = await crawlCompetitors(keyword, marketplace, maxResults)
    return NextResponse.json({ ok: true, data: result })
  } catch (err) {
    console.error('Competitors error:', err)
    const status = (err as any)?.status
    const code = typeof status === 'number' && status >= 400 && status < 600 ? status : 500
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: code },
    )
  }
}
