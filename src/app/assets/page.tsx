'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Shell, Card } from '@/components/app/shell'
import { Lightbox } from '@/components/app/lightbox'

type Asset = { id: string; type: string; imageUrl?: string; videoUrl?: string; campaignId: string; promptJson?: any; campaign?: { asin: string; productName?: string } }
type Product = { campaignId: string; asin: string; name: string; hero?: string; count: number }

export default function AssetsPage() {
  const { status } = useSession()
  const [assets, setAssets] = useState<Asset[]>([])
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'authenticated') fetch('/api/assets').then((x) => x.json()).then((r) => { if (r.ok) setAssets(r.data) })
  }, [status])

  // Group every asset by product (campaign) → one card per product.
  const products = useMemo<Product[]>(() => {
    const map = new Map<string, Product>()
    for (const a of assets) {
      if (!a.campaignId) continue
      const p = map.get(a.campaignId) || { campaignId: a.campaignId, asin: a.campaign?.asin || '', name: a.campaign?.productName || a.campaign?.asin || 'Product', hero: undefined, count: 0 }
      if (a.imageUrl) { p.count++; if (!p.hero) p.hero = a.imageUrl }
      else if (a.videoUrl) { p.count++ }
      map.set(a.campaignId, p)
    }
    return Array.from(map.values()).filter((p) => p.count > 0)
  }, [assets])

  if (status === 'unauthenticated') {
    return (
      <Shell title="Assets">
        <div className="mx-auto mt-20 max-w-md text-center">
          <h1 className="font-display text-2xl font-medium">Sign in to view your assets</h1>
          <Link href="/login" className="mt-4 inline-block rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white">Sign in</Link>
        </div>
      </Shell>
    )
  }

  return (
    <Shell title="Assets">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Your products</h1>
        <span className="label-mono text-xs text-muted-foreground">{products.length} products</span>
      </div>

      {products.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-sm text-muted-foreground">Nothing generated yet. Head to the <Link href="/studio" className="text-accent underline">Studio</Link> and generate a campaign.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <button key={p.campaignId} onClick={() => setOpenId(p.campaignId)}
              className="group overflow-hidden rounded-2xl border border-black/[0.07] bg-white text-left transition hover:shadow-lg hover:shadow-black/5">
              <div className="relative aspect-square overflow-hidden bg-muted">
                {p.hero ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.hero} alt={p.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">No image</div>
                )}
                <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">{p.count} assets</span>
              </div>
              <div className="px-3 py-2.5">
                <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">{p.name}</p>
                <p className="label-mono mt-0.5 text-[10px] text-muted-foreground">{p.asin}</p>
                <p className="mt-1 text-[11px] font-medium text-accent">View everything →</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {openId && <ProductDetail campaignId={openId} onClose={() => setOpenId(null)} />}
    </Shell>
  )
}

function ProductDetail({ campaignId, onClose }: { campaignId: string; onClose: () => void }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [spapi, setSpapi] = useState<boolean | null>(null)
  const [pushState, setPushState] = useState<'idle' | 'pushing' | 'done' | 'error'>('idle')
  const [pushMsg, setPushMsg] = useState('')
  const [lightbox, setLightbox] = useState<{ src: string; type: 'image' | 'video' } | null>(null)
  const [regen, setRegen] = useState<{ id: string; type: string } | null>(null)
  const [regenNote, setRegenNote] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = () => fetch(`/api/campaigns/${campaignId}`).then((x) => x.json()).then((r) => { setData(r.ok ? r.data : null); setLoading(false) })

  // Regenerate an asset with optional feedback; comment refines the prompt and is
  // saved for self-learning. Reloads on success to show the fresh render.
  async function doRegen(id: string, type: string, comment?: string) {
    setBusyId(id)
    const isVideo = type === 'product_video' || type === 'ugc_video'
    const r = await fetch(isVideo ? '/api/generate-video' : '/api/generate-image', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assetId: id, comment }),
    }).then((x) => x.json()).catch(() => null)
    setBusyId(null)
    if (r?.ok) load()
  }

  useEffect(() => {
    load()
    fetch('/api/seller-central/push').then((x) => x.json()).then((r) => setSpapi(!!r?.data?.configured)).catch(() => setSpapi(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId])

  const listing = data?.listing || {}
  const title: string = listing.title || ''
  const bullets: string[] = listing.bullets || []
  const description: string = listing.description || (data?.brandDna?.description ?? '')
  const keywords: { keyword: string }[] = data?.keywords || []
  const angles: any[] = Array.isArray(data?.angles) ? data.angles : []
  const images = (data?.assets || []).filter((a: Asset) => a.imageUrl || a.videoUrl)

  const copy = (t: string) => navigator.clipboard?.writeText(t).catch(() => {})

  async function listOnPortal() {
    setPushState('pushing'); setPushMsg('')
    try {
      const r = await fetch('/api/seller-central/push', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku: data?.asin, title, bullets, description }),
      }).then((x) => x.json())
      if (r.ok) { setPushState('done'); setPushMsg(`Submitted · ${r.data?.submissionId || 'ok'}`) }
      else { setPushState('error'); setPushMsg(r.error || 'Push failed') }
    } catch (e: any) { setPushState('error'); setPushMsg(e?.message || 'Push failed') }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="my-6 w-full max-w-4xl rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* header */}
        <div className="flex items-start justify-between gap-3 border-b border-black/[0.06] p-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground line-clamp-2">{data?.productName || data?.asin || 'Product'}</p>
            <p className="label-mono text-[11px] text-muted-foreground">{data?.asin}</p>
          </div>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-sm text-muted-foreground hover:bg-black/5">✕</button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">Loading…</div>
        ) : !data ? (
          <div className="p-12 text-center text-sm text-muted-foreground">Could not load this product.</div>
        ) : (
          <div className="space-y-6 p-4">
            {/* Images */}
            {images.length > 0 && (
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Images &amp; video ({images.length})</h3>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {images.map((a: Asset) => (
                    <div key={a.id} className="group relative overflow-hidden rounded-xl border border-black/[0.06] bg-muted">
                      <div className="aspect-square cursor-pointer" onClick={() => setLightbox({ src: a.videoUrl || a.imageUrl!, type: a.videoUrl ? 'video' : 'image' })}>
                        {a.videoUrl
                          ? <video src={a.videoUrl} className="h-full w-full object-cover" muted loop onMouseOver={(e) => e.currentTarget.play()} onMouseOut={(e) => e.currentTarget.pause()} />
                          // eslint-disable-next-line @next/next/no-img-element
                          : <img src={a.imageUrl} alt={a.type} className="h-full w-full object-cover" />}
                      </div>
                      <div className="absolute right-1.5 top-1.5 flex gap-1">
                        <a href={a.videoUrl || a.imageUrl} download onClick={(e) => e.stopPropagation()} className="rounded-md bg-white/90 px-2 py-0.5 text-[9px] font-semibold text-foreground shadow-sm hover:bg-white">Download</a>
                        <button onClick={(e) => { e.stopPropagation(); setRegenNote(''); setRegen({ id: a.id, type: a.type }) }}
                          className="rounded-md bg-accent px-2 py-0.5 text-[9px] font-semibold text-white shadow-sm hover:opacity-90">
                          {busyId === a.id ? '…' : 'Regenerate'}
                        </button>
                      </div>
                      {busyId === a.id && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                          <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Title */}
            {title && (
              <section>
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Title</h3>
                  <button onClick={() => copy(title)} className="text-[11px] text-accent hover:underline">Copy</button>
                </div>
                <p className="rounded-lg border border-black/[0.06] bg-black/[0.015] p-2.5 text-sm text-foreground">{title}</p>
              </section>
            )}

            {/* Bullets */}
            {bullets.length > 0 && (
              <section>
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bullet points</h3>
                  <button onClick={() => copy(bullets.join('\n'))} className="text-[11px] text-accent hover:underline">Copy all</button>
                </div>
                <ul className="space-y-1.5">
                  {bullets.map((b, i) => (
                    <li key={i} className="flex gap-2 rounded-lg border border-black/[0.06] bg-black/[0.015] p-2.5 text-sm text-foreground">
                      <span className="text-accent">•</span><span>{b}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Description */}
            {description && (
              <section>
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</h3>
                  <button onClick={() => copy(description)} className="text-[11px] text-accent hover:underline">Copy</button>
                </div>
                <p className="whitespace-pre-wrap rounded-lg border border-black/[0.06] bg-black/[0.015] p-2.5 text-sm text-foreground">{description}</p>
              </section>
            )}

            {/* Keywords */}
            {keywords.length > 0 && (
              <section>
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Keywords ({keywords.length})</h3>
                  <button onClick={() => copy(keywords.map((k) => k.keyword).join(', '))} className="text-[11px] text-accent hover:underline">Copy all</button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {keywords.map((k, i) => <span key={i} className="rounded-full bg-accent/8 px-2.5 py-1 text-xs text-foreground/80">{k.keyword}</span>)}
                </div>
              </section>
            )}

            {/* Ad angles */}
            {angles.length > 0 && (
              <section>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ad angles ({angles.length})</h3>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {angles.map((a, i) => (
                    <div key={i} className="rounded-lg border border-black/[0.06] bg-black/[0.015] p-2.5 text-sm">
                      <p className="font-medium text-foreground">{a.headline || a.angle || `Angle ${i + 1}`}</p>
                      {a.subheadline && <p className="text-xs text-muted-foreground">{a.subheadline}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* List on Seller Portal */}
            <section className="border-t border-black/[0.06] pt-4">
              <div className="flex flex-wrap items-center gap-3">
                <button onClick={listOnPortal} disabled={!spapi || pushState === 'pushing' || !title}
                  className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition hover:opacity-90 disabled:opacity-50">
                  {pushState === 'pushing' ? 'Listing…' : pushState === 'done' ? 'Listed ✓' : 'List on Seller Portal'}
                </button>
                <span className="text-xs text-muted-foreground">
                  {spapi === false ? 'Connect your Seller Central API in settings to enable one-click listing.'
                    : pushMsg || 'Pushes this optimized listing straight to your seller portal.'}
                </span>
              </div>
            </section>
          </div>
        )}
      </div>
      {lightbox && <Lightbox src={lightbox.src} type={lightbox.type} onClose={() => setLightbox(null)} />}

      {regen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={() => setRegen(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-sm font-semibold">Regenerate this asset</div>
            <p className="mt-1 text-xs text-muted-foreground">What should change? We&apos;ll refine the prompt and remember it for your brand.</p>
            <textarea value={regenNote} onChange={(e) => setRegenNote(e.target.value)} rows={3} autoFocus
              placeholder="e.g. warmer background, show the pattern closer, brighter pink, remove the person…"
              className="mt-3 w-full resize-y rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/15" />
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setRegen(null)} className="rounded-lg border border-black/10 px-3 py-1.5 text-sm">Cancel</button>
              <button onClick={() => { const { id, type } = regen; setRegen(null); doRegen(id, type, regenNote.trim() || undefined) }}
                className="rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-white">Regenerate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
