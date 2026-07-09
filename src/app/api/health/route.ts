import { NextResponse } from 'next/server'
import { getHealth, config } from '@/lib/config'

// Ping the local scraper service so health reflects RUNTIME reachability, not
// just config. Cheap, time-bounded, never throws.
async function scraperLive(): Promise<boolean> {
  if (!config.scraperService.url) return false
  try {
    const res = await fetch(`${config.scraperService.url.replace(/\/$/, '')}/health`, {
      signal: AbortSignal.timeout(3000),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function GET() {
  const health = getHealth()
  const scraperReachable = health.amazon === 'local' ? await scraperLive() : false
  return NextResponse.json({
    ok: true,
    service: 'arrowlabs-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    health: { ...health, scraperReachable },
  })
}
