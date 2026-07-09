import { NextRequest, NextResponse } from 'next/server'
import { researchKeywords, trackRank } from '@/lib/keywords'
import { guardRate } from '@/lib/api'

export async function POST(req: NextRequest) {
  const limited = guardRate(req, 'keywords')
  if (limited) return limited
  try {
    const body = await req.json().catch(() => ({}))
    // Reject non-string seed/keyword instead of silently coercing.
    if (body.seed !== undefined && typeof body.seed !== 'string') {
      return NextResponse.json({ ok: false, error: 'seed must be a string' }, { status: 422 })
    }
    if (body.keyword !== undefined && typeof body.keyword !== 'string') {
      return NextResponse.json({ ok: false, error: 'keyword must be a string' }, { status: 422 })
    }
    const action = (body.action || 'research').toString()

    if (action === 'track') {
      // Rank tracking
      const asin = (body.asin || '').toString().trim().toUpperCase()
      const keyword = (body.keyword || '').toString().trim()
      const marketplace = (body.marketplace || 'US').toString().trim().toUpperCase()
      if (!asin || !keyword) {
        return NextResponse.json({ ok: false, error: 'asin and keyword are required for tracking' }, { status: 400 })
      }
      const result = await trackRank(asin, keyword, marketplace)
      return NextResponse.json({ ok: true, data: result })
    }

    // Default: keyword research
    const seed = (body.seed || body.keyword || '').toString().trim().slice(0, 120)
    const marketplace = (body.marketplace || 'US').toString().trim().toUpperCase()
    if (!seed) {
      return NextResponse.json({ ok: false, error: 'seed keyword is required' }, { status: 400 })
    }
    if (seed.length < 2) {
      return NextResponse.json({ ok: false, error: 'seed keyword is too short' }, { status: 400 })
    }
    const result = await researchKeywords(seed, marketplace)
    return NextResponse.json({ ok: true, data: result })
  } catch (err) {
    console.error('Keywords error:', err)
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
