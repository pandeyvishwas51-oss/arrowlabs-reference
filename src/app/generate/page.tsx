'use client'

// In-app prompt box. Brings the "generate a listing for X" experience from the
// meeting into the tool itself, instead of only through the MCP connector. Type a
// plain request; we parse the ASIN, the target marketplace, and which parts to make,
// then run the v2 engine. Additive page, does not touch the studio.

import { useState } from 'react'
import { Shell, Card } from '@/components/app/shell'

const EXAMPLES = [
  'Generate an Amazon listing and images for B0CKXF3TGC',
  'Make everything for B0DJQQWBS4',
  'Just the A+ content and video for B0H12JGRQH on Flipkart',
]

type Plan = { asin: string; platform: string; labs: string[] }

function parsePrompt(text: string): Plan | null {
  const t = text.toLowerCase()
  const asin = text.match(/\b([A-Z0-9]{10})\b/)?.[1]
  if (!asin) return null

  let platform = 'amazon_in'
  if (/flipkart/.test(t)) platform = 'flipkart'
  else if (/myntra/.test(t)) platform = 'myntra'
  else if (/noon/.test(t)) platform = 'noon'
  else if (/namshi/.test(t)) platform = 'namshi'

  const labs: string[] = []
  const everything = /(everything|full kit|all of it|whole)/.test(t)
  if (everything || /(listing|copy|title|bullet|description)/.test(t)) labs.push('ListingLab')
  if (everything || /(image|photo|picture)/.test(t)) labs.push('PhotoLab')
  if (everything || /(a\+|a plus|aplus|a-plus)/.test(t)) labs.push('APlusLab')
  if (everything || /video/.test(t)) labs.push('VideoLab')
  if (labs.length === 0) labs.push('ListingLab')
  return { asin, platform, labs }
}

export default function GeneratePage() {
  const [text, setText] = useState('')
  const [plan, setPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ campaignId?: string; engine?: string } | null>(null)

  async function submit() {
    setError('')
    setResult(null)
    const parsed = parsePrompt(text)
    if (!parsed) {
      setError('I could not find a 10-character product ID (ASIN) in that. Try including one, e.g. B0CKXF3TGC.')
      setPlan(null)
      return
    }
    setPlan(parsed)
    setLoading(true)
    try {
      const res = await fetch('/api/orchestrate-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asin: parsed.asin, platform: parsed.platform, labs: parsed.labs }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Generation could not start')
      setResult(json.data ?? json)
    } catch (e: any) {
      setError(e?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Shell title="Generate">
      <div className="mx-auto max-w-3xl space-y-4 p-4">
        <Card className="p-5">
          <h2 className="font-display text-lg font-medium">Ask for what you need</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Type it in plain words. Include the product ID, the marketplace, and which parts you want.
            We work out the rest and run it on the engine.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="Generate an Amazon listing and images for B0CKXF3TGC"
            className="mt-3 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => setText(ex)}
                className="rounded-full bg-black/[0.04] px-2.5 py-1 text-xs text-muted-foreground hover:bg-black/[0.08]"
              >
                {ex}
              </button>
            ))}
          </div>
          <button
            onClick={submit}
            disabled={loading}
            className="btn-gradient mt-4 rounded-lg px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading ? 'Starting…' : 'Generate'}
          </button>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </Card>

        {plan && (
          <Card className="p-5">
            <div className="label-mono text-[10px] uppercase text-muted-foreground">Understood as</div>
            <div className="mt-1 text-sm">
              Product <span className="font-medium">{plan.asin}</span> for{' '}
              <span className="font-medium">{plan.platform}</span>, generating{' '}
              <span className="font-medium">{plan.labs.join(', ')}</span>.
            </div>
            {result?.campaignId && (
              <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                Started on the {result.engine || 'v2'} engine. Campaign{' '}
                <span className="label-mono">{result.campaignId}</span>. Open the studio to watch it fill in.
              </div>
            )}
          </Card>
        )}
      </div>
    </Shell>
  )
}
