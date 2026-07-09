'use client'

import { useState } from 'react'
import { Shell, Card } from '@/components/app/shell'

type Dna = {
  brandName: string
  tagline?: string
  voice: string
  positioning: string
  values: string[]
  targetCustomer: string
  colors: { primary?: string; secondary?: string; accent?: string; neutrals?: string[] }
  fonts: { display?: string; body?: string }
  logoUrl?: string
  sources: string[]
}

function Swatch({ label, hex }: { label: string; hex?: string }) {
  if (!hex) return null
  return (
    <div className="flex items-center gap-2">
      <span className="h-8 w-8 rounded-lg border border-black/10" style={{ background: hex }} />
      <div className="leading-tight">
        <div className="text-xs font-medium">{label}</div>
        <div className="label-mono text-[10px] text-muted-foreground">{hex}</div>
      </div>
    </div>
  )
}

export default function BrandManagerPage() {
  const [siteUrl, setSiteUrl] = useState('')
  const [brandName, setBrandName] = useState('')
  const [productName, setProductName] = useState('')
  const [imagesRaw, setImagesRaw] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dna, setDna] = useState<Dna | null>(null)
  const [saved, setSaved] = useState(false)

  async function build() {
    setError('')
    setDna(null)
    setSaved(false)
    if (!siteUrl && !brandName && !productName) {
      setError('Add a website, a brand name, or a product name to start.')
      return
    }
    setLoading(true)
    try {
      const images = imagesRaw
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter((s) => /^https?:\/\//.test(s))
      const res = await fetch('/api/brand/build-dna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteUrl: siteUrl || undefined, brandName: brandName || undefined, productName: productName || undefined, images }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Could not build brand DNA')
      setDna(json.data?.dna ?? json.dna)
      setSaved(Boolean(json.data?.saved ?? json.saved))
    } catch (e: any) {
      setError(e?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Shell title="Brand Manager">
      <div className="mx-auto grid max-w-5xl gap-4 p-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-display text-lg font-medium">Build your Brand DNA</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Give the tool your brand once. Paste your D2C website, your brand name, a flagship product,
            or brand image links. We read them and build your Brand DNA: palette, voice, positioning, and
            values. Every listing you generate after this stays on brand.
          </p>

          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="text-xs font-medium">D2C website URL</span>
              <input
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                placeholder="https://yourbrand.com"
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium">Brand name</span>
              <input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="Cortina"
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium">Flagship product name</span>
              <input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="120 TC Microfiber King Bedsheet"
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium">Brand image links (optional, one per line)</span>
              <textarea
                value={imagesRaw}
                onChange={(e) => setImagesRaw(e.target.value)}
                placeholder="https://.../logo.png"
                rows={3}
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <button
            onClick={build}
            disabled={loading}
            className="btn-gradient mt-4 w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading ? 'Building your Brand DNA…' : 'Build Brand DNA'}
          </button>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-lg font-medium">Brand DNA</h2>
          {!dna && !loading && (
            <p className="mt-1 text-sm text-muted-foreground">Your brand profile will appear here once built.</p>
          )}
          {loading && <p className="mt-1 text-sm text-muted-foreground">Reading your brand and synthesizing the DNA…</p>}
          {dna && (
            <div className="mt-3 space-y-4">
              <div>
                <div className="text-base font-semibold">{dna.brandName}</div>
                {dna.tagline && <div className="text-sm text-muted-foreground">{dna.tagline}</div>}
              </div>

              <div className="flex flex-wrap gap-4">
                <Swatch label="Primary" hex={dna.colors.primary} />
                <Swatch label="Secondary" hex={dna.colors.secondary} />
                <Swatch label="Accent" hex={dna.colors.accent} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="label-mono text-[10px] uppercase text-muted-foreground">Voice</div>
                  <div className="text-sm">{dna.voice}</div>
                </div>
                <div>
                  <div className="label-mono text-[10px] uppercase text-muted-foreground">Target customer</div>
                  <div className="text-sm">{dna.targetCustomer}</div>
                </div>
                <div className="sm:col-span-2">
                  <div className="label-mono text-[10px] uppercase text-muted-foreground">Positioning</div>
                  <div className="text-sm">{dna.positioning}</div>
                </div>
                {(dna.fonts.display || dna.fonts.body) && (
                  <div className="sm:col-span-2">
                    <div className="label-mono text-[10px] uppercase text-muted-foreground">Fonts</div>
                    <div className="text-sm">{[dna.fonts.display, dna.fonts.body].filter(Boolean).join(' + ')}</div>
                  </div>
                )}
              </div>

              {dna.values?.length > 0 && (
                <div>
                  <div className="label-mono mb-1 text-[10px] uppercase text-muted-foreground">Values</div>
                  <div className="flex flex-wrap gap-1.5">
                    {dna.values.map((v) => (
                      <span key={v} className="rounded-full bg-accent/10 px-2.5 py-1 text-xs text-accent">
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {dna.sources?.length > 0 && (
                <div className="label-mono text-[10px] text-muted-foreground">Built from: {dna.sources.join(', ')}</div>
              )}
              {saved && (
                <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  Saved to your brand profile. New generations will use this automatically.
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </Shell>
  )
}
