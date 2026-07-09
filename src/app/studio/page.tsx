'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { TrendingUp, Boxes, Search, Trophy, Sparkles, RefreshCw, Heart, ShoppingCart, Star } from 'lucide-react'
import { Shell, Card } from '@/components/app/shell'
import { AuditPanel } from '@/components/app/audit-panel'
import { Sparkline } from '@/components/app/sparkline'
import { Lightbox } from '@/components/app/lightbox'
import { PoweredByOpus } from '@/components/site/powered-by'
import { exportCampaignCsv, exportCampaignZip } from '@/lib/export'
import { scoreIDQ } from '@/lib/idq'
import { Download, FileSpreadsheet, Eye } from 'lucide-react'

type Me = {
  authenticated: boolean
  user: any
  health: { llm: string | null; image: string | null; video: string | null; voice: string | null; amazon: string }
  creditCosts: Record<string, number>
  imageModels?: { key: string; label: string }[]
}

const LABS = [
  { id: 'ListingLab', label: 'Listing', desc: 'Title, bullets, 5 features & description' },
  { id: 'APlusLab', label: 'A+ content', desc: '6 A+ modules (hero, comparison, benefits…)' },
  { id: 'AngleLab', label: 'Ad angles', desc: 'Ranked, testable ad angles for your buyer' },
  { id: 'PhotoLab', label: 'Product images', desc: 'Main, lifestyle, infographic, dimension & detail' },
  { id: 'VideoLab', label: 'Product video', desc: 'Clean marketplace product video' },
] as const

const SWATCHES = ['#1C2030', '#F7F1E6', '#8BAF8C', '#E8845A']

// Platforms available per region: India shows Amazon/Flipkart/Myntra; GCC shows
// Noon/Namshi/Amazon.
const PLATFORMS_BY_REGION: Record<'IN' | 'GCC', [string, string][]> = {
  IN: [['amazon_in', 'Amazon'], ['flipkart', 'Flipkart'], ['myntra', 'Myntra']],
  GCC: [['noon', 'Noon'], ['namshi', 'Namshi'], ['amazon_in', 'Amazon']],
}

// Progress steps shown while a campaign runs (the server does these in roughly
// this order inside one request, so we advance on a timer).
const LIVE_STEPS = [
  { t: 'Scraping your product from Amazon' },
  { t: 'Reading reviews & scoping competitors' },
  { t: 'Mining high-intent keywords' },
  { t: 'Writing your listing & A+ content' },
  { t: 'Ranking your best ad angles' },
  { t: 'Designing your product images' },
  { t: 'Rendering your video ad' },
  { t: 'Polishing & packaging everything' },
]

// Format a duration (seconds) as a compact human timer: "0:42", "3:07", "12:30".
function fmtDuration(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

// Clean, human labels for asset types (no more raw "product_photo" / "a_plus_module").
const TYPE_LABELS: Record<string, string> = {
  main_image: 'Main image', lifestyle: 'Lifestyle', infographic: 'Infographic',
  a_plus_module: 'A+ module', product_photo: 'Product photo', dimension: 'Size & dimensions', detail: 'Detail shot', ugc_video: 'Video', product_video: 'Product video',
}
const humanType = (t: string) => TYPE_LABELS[t] || t.replace(/_/g, ' ')

// Order the AI gallery groups so like assets sit together (A+ in one place,
// infographics together, etc.) - clean bifurcation, not a jumbled grid.
const GALLERY_GROUPS: [string, string][] = [
  ['main_image', 'Main image'],
  ['a_plus_module', 'A+ content'],
  ['infographic', 'Infographics'],
  ['dimension', 'Size & dimensions'],
  ['detail', 'Detail shots'],
  ['lifestyle', 'Lifestyle'],
  ['product_photo', 'Product photos'],
  ['ad_static', 'Ad creatives'],
]

// Map a polled campaign row into the result shape the Studio renders.
function mapCampaign(c: any) {
  return {
    campaignId: c.id,
    asin: c.asin,
    status: c.status,
    scraped: c.scrapedData || { product: { title: c.productName } },
    listing: c.listing,
    angles: c.angles || [],
    brandDna: c.brandDna,
    keywords: c.keywords || [],
    assets: (c.assets || []).map((a: any) => ({ id: a.id, type: a.type, lab: a.lab, imageUrl: a.imageUrl, videoUrl: a.videoUrl, status: a.status, prompt: a.promptJson })),
    progress: c.progress,
  }
}

function Stepper({ label, v, max, on }: { label: string; v: number; max: number; on: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] text-foreground/80">{label}</span>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => on(v - 1)} disabled={v <= 0}
          className="flex h-5 w-5 items-center justify-center rounded-md border border-black/10 text-sm leading-none text-muted-foreground hover:bg-black/[0.04] disabled:opacity-40">−</button>
        <span className="w-4 text-center text-xs font-semibold tabular-nums">{v}</span>
        <button type="button" onClick={() => on(v + 1)} disabled={v >= max}
          className="flex h-5 w-5 items-center justify-center rounded-md border border-black/10 text-sm leading-none text-muted-foreground hover:bg-black/[0.04] disabled:opacity-40">+</button>
      </div>
    </div>
  )
}

export default function StudioPage() {
  const [me, setMe] = useState<Me | null>(null)
  const [mode, setMode] = useState<'asin' | 'raw'>('asin')
  const [asin, setAsin] = useState('')
  const [audience, setAudience] = useState('')
  const [rawTitle, setRawTitle] = useState('')
  const [rawDesc, setRawDesc] = useState('')
  const [rawBrand, setRawBrand] = useState('')
  const [rawDim, setRawDim] = useState('')
  const [theme, setTheme] = useState('')
  const [heroFile, setHeroFile] = useState<File | null>(null)
  const [heroPreview, setHeroPreview] = useState('')
  const [rawSub, setRawSub] = useState<'single' | 'bulk'>('single')
  const [bulkSheet, setBulkSheet] = useState<File | null>(null)
  const [bulkImages, setBulkImages] = useState<File[]>([])
  const [bulkMsg, setBulkMsg] = useState('')
  const [labs, setLabs] = useState<string[]>(['ListingLab', 'APlusLab', 'AngleLab', 'PhotoLab', 'VideoLab'])
  const [videoStyle, setVideoStyle] = useState<'overview' | 'ugc'>('overview')
  const [region, setRegion] = useState<'IN' | 'GCC'>('IN')
  const [platform, setPlatform] = useState<'amazon_in' | 'flipkart' | 'myntra' | 'noon' | 'namshi'>('amazon_in')
  const [sourcePlatform, setSourcePlatform] = useState<'amazon_in' | 'flipkart' | 'myntra' | 'noon' | 'namshi'>('amazon_in')
  // Standard per-SKU kit: 9 images (1 main + 2 lifestyle + 2 infographic + 1 dimension + 2 detail + 1 product photo) + 7 A+ + 1 video.
  const [counts, setCounts] = useState({ lifestyle: 2, infographic: 2, aPlus: 7, productPhoto: 1, dimension: 1, detail: 2, video: 1 })
  const setCount = (k: keyof typeof counts, v: number, max: number) =>
    setCounts((c) => ({ ...c, [k]: Math.max(0, Math.min(v, max)) }))
  const [running, setRunning] = useState(false)
  const [stage, setStage] = useState('')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [genImage, setGenImage] = useState<Record<string, 'loading' | 'done' | 'error'>>({})
  const [video, setVideo] = useState<{ status: string; url?: string; error?: string } | null>(null)
  const [queue, setQueue] = useState<{ asin: string; status: string }[]>([])
  const [lightbox, setLightbox] = useState<{ src: string; type: 'image' | 'video' } | null>(null)
  const [zipping, setZipping] = useState(false)
  // Regenerate-with-feedback modal (which asset + the user's comment).
  const [regen, setRegen] = useState<{ id: string; type: string } | null>(null)
  const [regenNote, setRegenNote] = useState('')
  // Generation timer: live elapsed while running + the final "took X" duration.
  const [startTs, setStartTs] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [tookSec, setTookSec] = useState<number | null>(null)
  // Background job: the server runs the campaign; we poll this id for live progress
  // (so it survives leaving the page - on return we resume polling the active one).
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null)
  const [serverProgress, setServerProgress] = useState<any>(null)

  async function downloadZip() {
    setZipping(true)
    try { await exportCampaignZip(result) } finally { setZipping(false) }
  }

  // Parse one or many ASINs (newline / comma / space separated).
  const parseAsins = (raw: string) =>
    Array.from(new Set(raw.toUpperCase().split(/[\s,]+/).map((s) => s.trim()).filter((s) => s.length === 10)))

  // Parse product IDs for the SOURCE marketplace we scrape: strict 10-char ASINs
  // for Amazon, else any id/URL token (Flipkart FSN, Myntra style id, Noon/Namshi sku).
  const parseIds = (raw: string) =>
    sourcePlatform === 'amazon_in'
      ? parseAsins(raw)
      : Array.from(new Set(raw.split(/[\s,\n]+/).map((s) => s.trim()).filter((s) => s.length >= 4)))

  // Read a CSV / TXT file and pull out every 10-char ASIN.
  async function onUploadAsins(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const found = Array.from(new Set((text.toUpperCase().match(/\bB0[A-Z0-9]{8}\b/g) || [])))
    if (found.length) setAsin((prev) => Array.from(new Set([...parseAsins(prev), ...found])).join('\n'))
    e.target.value = ''
  }

  const loadMe = useCallback(async () => {
    const r = await fetch('/api/me').then((x) => x.json())
    if (r.ok) setMe(r.data)
  }, [])
  const loadCampaigns = useCallback(async () => {
    const r = await fetch('/api/campaigns').then((x) => x.json())
    if (r.ok) setCampaigns(r.data.slice(0, 8))
  }, [])
  useEffect(() => { loadMe(); loadCampaigns() }, [loadMe, loadCampaigns])

  // Real generation progress (per-image, not a timer).
  const [phase, setPhase] = useState<'idle' | 'analyzing' | 'generating'>('idle')
  const [genTotal, setGenTotal] = useState(0)
  const [genDone, setGenDone] = useState(0)

  // Advance the friendly progress steps while a campaign is running.
  const [liveStep, setLiveStep] = useState(0)
  useEffect(() => {
    if (!running) { setLiveStep(0); return }
    setLiveStep(0)
    const id = setInterval(() => setLiveStep((s) => Math.min(s + 1, LIVE_STEPS.length - 1)), 3500)
    return () => clearInterval(id)
  }, [running])

  // Tick the live elapsed timer every second while a campaign is running.
  useEffect(() => {
    if (!running || startTs == null) return
    const id = setInterval(() => setElapsed((Date.now() - startTs) / 1000), 1000)
    return () => clearInterval(id)
  }, [running, startTs])

  // Poll the active background campaign every 3s: update the result + progress as
  // the server completes each step/image, until it finishes.
  useEffect(() => {
    if (!activeCampaignId) return
    let alive = true
    const tick = async () => {
      // Safety cap: never poll forever (e.g. a job killed mid-run).
      if (startTs && Date.now() - startTs > 15 * 60 * 1000) {
        setRunning(false); setActiveCampaignId(null); return
      }
      const r = await fetch(`/api/campaigns/${activeCampaignId}`).then((x) => x.json()).catch(() => null)
      if (!alive) return
      if (r?.ok) {
        const c = r.data
        setResult(mapCampaign(c))
        setServerProgress(c.progress || null)
        if (c.status === 'completed' || c.status === 'failed') {
          setRunning(false)
          setTookSec((prevStart) => (startTs ? (Date.now() - startTs) / 1000 : prevStart))
          if (c.status === 'failed') setError('Generation ran into an error - some assets may be missing.')
          setActiveCampaignId(null)
          loadCampaigns()
          return
        }
      }
      if (alive) setTimeout(tick, 3000)
    }
    tick()
    return () => { alive = false }
  }, [activeCampaignId, startTs, loadCampaigns])

  // On load, resume polling ONLY a genuinely-live job - one updated within the last
  // 3 min (a running job writes progress every few seconds). Stale/dead jobs (killed
  // by a deploy) are ignored so we never show "generating" forever or on a fresh login.
  useEffect(() => {
    if (activeCampaignId || result || running) return
    const active = campaigns.find((c: any) =>
      (c.status === 'scraping' || c.status === 'generating') &&
      c.updatedAt && Date.now() - new Date(c.updatedAt).getTime() < 3 * 60 * 1000,
    )
    if (active) { setRunning(true); setStartTs(Date.now()); setActiveCampaignId(active.id) }
  }, [campaigns, activeCampaignId, result, running])

  // Keep the platform valid for the chosen region (India: Amazon/Flipkart/Myntra;
  // GCC: Noon/Namshi/Amazon).
  useEffect(() => {
    const allowed = PLATFORMS_BY_REGION[region].map(([id]) => id) as string[]
    if (!allowed.includes(platform)) setPlatform(allowed[0] as typeof platform)
  }, [region, platform])

  const demoMode = me && (!me.health.llm || !me.health.image)
  const isAuthed = me?.authenticated
  const toggleLab = (id: string) => setLabs((p) => (p.includes(id) ? p.filter((l) => l !== id) : [...p, id]))

  // Run one ASIN. opts.full = generate all images + video (the one-click flow).
  async function runOne(oneAsin: string, opts: { full?: boolean } = {}) {
    const res = await fetch('/api/orchestrate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        asin: oneAsin, targetAudience: audience || undefined, theme: theme || undefined, labs, counts, region, platform, sourcePlatform,
        generateImages: !!opts.full, generateVideo: !!opts.full && labs.includes('VideoLab'), videoStyle,
      }),
    }).then((x) => x.json())
    return res
  }

  async function run(_opts: { full?: boolean } = {}) {
    const asins = parseIds(asin)
    if (asins.length === 0) return setError(platform === 'amazon_in' ? 'Enter at least one 10-character ASIN.' : 'Enter at least one product ID or URL.')
    setError(''); setResult(null); setVideo(null); setGenImage({}); setServerProgress(null); setQueue([])
    const runStart = Date.now()
    setStartTs(runStart); setElapsed(0); setTookSec(null); setRunning(true)
    try {
      // Start a server-side background job; the poll effect takes over from here so
      // it keeps running even if the user leaves the page.
      const res = await runOne(asins[0], { full: true })
      if (!res.ok || !res.data?.campaignId) { setError(res.error || 'Failed to start generation'); setRunning(false); return }
      // Fire any additional IDs too - they generate server-side in parallel.
      for (let i = 1; i < asins.length; i++) runOne(asins[i], { full: true })
      setActiveCampaignId(res.data.campaignId)
    } catch (e: any) { setError(e.message || 'Network error'); setRunning(false) }
  }

  // Bulk: filled Excel template + many images → a background campaign per SKU.
  async function runBulk() {
    if (!isAuthed) return setError('Sign in to generate (uses credits).')
    if (!bulkSheet) return setError('Upload the filled Excel template.')
    if (!bulkImages.length) return setError('Upload your product images.')
    setError(''); setBulkMsg('Starting your catalog…'); setRunning(true)
    try {
      const fd = new FormData()
      fd.append('sheet', bulkSheet)
      bulkImages.forEach((f) => fd.append('images', f))
      fd.append('region', region); fd.append('platform', platform)
      if (theme) fd.append('theme', theme)
      fd.append('generateVideo', String(labs.includes('VideoLab')))
      const r = await fetch('/api/orchestrate-bulk', { method: 'POST', body: fd }).then((x) => x.json())
      if (!r.ok) { setError(r.error || 'Bulk generation failed'); setBulkMsg('') }
      else { setBulkMsg(`Started ${r.data.count} of ${r.data.rows} products (${r.data.images} images matched) - generating in the background. Track them in Assets.`); loadCampaigns() }
    } catch (e: any) { setError(e.message || 'Network error') } finally { setRunning(false) }
  }

  function onHeroSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setHeroFile(f)
    setHeroPreview(URL.createObjectURL(f))
  }

  // Raw flow: upload the hero image, analyze (fast, no images), then render each
  // image ONE BY ONE so the progress bar reflects real work - same live feedback
  // as the ASIN flow (no more silent 10-minute wait).
  async function runRaw() {
    if (!isAuthed) return setError('Sign in to generate (uses credits).')
    if (!heroFile) return setError('Upload your product image first.')
    if (rawTitle.trim().length < 3) return setError('Enter a product title.')
    setError(''); setResult(null); setVideo(null); setServerProgress(null)
    const runStart = Date.now()
    setStartTs(runStart); setElapsed(0); setTookSec(null); setRunning(true)
    try {
      const fd = new FormData()
      fd.append('file', heroFile)
      const up = await fetch('/api/upload', { method: 'POST', body: fd }).then((x) => x.json())
      if (!up.ok) throw new Error(up.error || 'Image upload failed')
      // Start a server-side background job (survives navigation); poll for progress.
      const r = await fetch('/api/orchestrate-raw', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          heroImageUrl: up.data.url, title: rawTitle, description: rawDesc || undefined,
          brand: rawBrand || undefined, dimensions: rawDim || undefined, theme: theme || undefined, targetAudience: audience || undefined,
          region, platform, counts, labs, generateImages: true, generateVideo: labs.includes('VideoLab'), videoStyle,
        }),
      }).then((x) => x.json())
      if (!r.ok || !r.data?.campaignId) { setError(r.error || 'Generation failed'); setRunning(false); return }
      setActiveCampaignId(r.data.campaignId)
    } catch (e: any) {
      setError(e.message || 'Network error'); setRunning(false)
    }
  }

  // Regenerate one asset. An optional `comment` (what the user didn't like / wants
  // changed) is sent to the server, which enhances the prompt via the LLM and logs
  // the feedback so the model learns this brand's preferences over time.
  async function generateImage(assetId: string, comment?: string) {
    if (!isAuthed) return setError('Sign in to generate images (uses credits).')
    setGenImage((s) => ({ ...s, [assetId]: 'loading' }))
    const r = await fetch('/api/generate-image', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assetId, comment }),
    }).then((x) => x.json())
    if (r.ok) {
      setResult((prev: any) => ({ ...prev, assets: prev.assets.map((a: any) => (a.id === assetId ? { ...a, imageUrl: r.data.url } : a)) }))
      setGenImage((s) => ({ ...s, [assetId]: 'done' })); loadMe()
    } else { setGenImage((s) => ({ ...s, [assetId]: 'error' })); setError(r.error || 'Image generation failed') }
  }

  // Regenerate a video asset with optional feedback (refines the script + saved).
  async function regenerateVideo(assetId: string, comment?: string) {
    if (!isAuthed) return setError('Sign in to generate (uses credits).')
    setGenImage((s) => ({ ...s, [assetId]: 'loading' }))
    const r = await fetch('/api/generate-video', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assetId, comment }),
    }).then((x) => x.json())
    if (r.ok) {
      setResult((prev: any) => ({ ...prev, assets: prev.assets.map((a: any) => (a.id === assetId ? { ...a, videoUrl: r.data.url } : a)) }))
      setGenImage((s) => ({ ...s, [assetId]: 'done' })); loadMe()
    } else { setGenImage((s) => ({ ...s, [assetId]: 'error' })); setError(r.error || 'Video regeneration failed') }
  }

  async function makeVideo() {
    if (!isAuthed) return setError('Sign in to generate video (uses credits).')
    const prompt = `A cinematic vertical UGC video showcasing ${result?.scraped?.product?.title || 'the product'}, dynamic close-ups, natural light, authentic feel`
    setVideo({ status: 'starting' })
    const start = await fetch('/api/generate-video', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, aspectRatio: '9:16', seconds: 5 }),
    }).then((x) => x.json())
    if (!start.ok) return setVideo({ status: 'failed', error: start.error })
    loadMe()
    const jobId = start.data.jobId
    setVideo({ status: 'rendering' })
    const poll = async () => {
      const r = await fetch(`/api/generate-video?jobId=${jobId}`).then((x) => x.json())
      if (!r.ok) return setVideo({ status: 'failed', error: r.error })
      if (r.data.status === 'completed') return setVideo({ status: 'completed', url: r.data.url })
      if (['failed', 'cancelled'].includes(r.data.status)) return setVideo({ status: 'failed', error: r.data.error })
      setVideo({ status: `rendering ${r.data.progress ?? ''}%` }); setTimeout(poll, 6000)
    }
    setTimeout(poll, 6000)
  }

  const angles = result?.angles || []
  const assets = result?.assets || []
  const product = result?.scraped?.product
  const heroAsset = assets.find((a: any) => a.imageUrl) || assets[0]

  const kpis = [
    { label: 'Credits', value: (me?.user?.trialDaysLeft ?? 0) > 0 ? '∞' : (me?.user?.credits ?? '-'), icon: TrendingUp, color: 'var(--accent)', spark: [8, 10, 9, 12, 11, 14, 13] },
    { label: 'Assets', value: assets.length, icon: Boxes, color: '#E8845A', spark: [2, 3, 3, 4, 5, 5, 6] },
    { label: 'Keywords', value: result?.keywords?.length ?? 0, icon: Search, color: '#8BAF8C', spark: [4, 6, 5, 8, 7, 9, 11] },
    { label: 'Ad angles', value: angles.length, icon: Trophy, color: '#9B7ED6', spark: [3, 5, 4, 6, 8, 7, 9] },
  ]

  return (
    <Shell title="Studio" credits={me?.user?.credits} unlimited={(me?.user?.trialDaysLeft ?? 0) > 0}>
      {demoMode && (
        <div className="mb-4 rounded-xl border border-amber-300/60 bg-amber-50/70 px-4 py-2.5 text-sm text-amber-800">
          <b>Demo mode.</b> {!me?.health.llm && 'Sonnet text not configured. '}{!me?.health.image && 'Image provider not configured. '}
          Some data may be synthetic.
        </div>
      )}

      {/* Command bar */}
      <Card className="mb-4 p-4">
        <div className="space-y-5">
          {/* Step 1 - Products */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-semibold text-foreground">1. Add your product</label>
              <div className="flex rounded-lg border border-black/10 p-0.5 text-[11px] font-medium">
                <button type="button" onClick={() => setMode('asin')}
                  className={`rounded-md px-3 py-1 transition ${mode === 'asin' ? 'bg-foreground text-background' : 'text-muted-foreground'}`}>From product ID</button>
                <button type="button" onClick={() => setMode('raw')}
                  className={`rounded-md px-3 py-1 transition ${mode === 'raw' ? 'bg-foreground text-background' : 'text-muted-foreground'}`}>From my images</button>
              </div>
            </div>
            {mode === 'raw' && (
              <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
                <div className="flex rounded-lg border border-black/10 p-0.5 font-medium">
                  <button type="button" onClick={() => setRawSub('single')} className={`rounded-md px-2.5 py-0.5 transition ${rawSub === 'single' ? 'bg-foreground text-background' : 'text-muted-foreground'}`}>Single</button>
                  <button type="button" onClick={() => setRawSub('bulk')} className={`rounded-md px-2.5 py-0.5 transition ${rawSub === 'bulk' ? 'bg-foreground text-background' : 'text-muted-foreground'}`}>Bulk (Excel + images)</button>
                </div>
                <span className="text-muted-foreground">
                  <a href="/arrowlabs-bulk-template.xlsx" download className="text-accent underline">Download template</a>, fill it, upload with your images.
                </span>
              </div>
            )}

            {mode === 'raw' && rawSub === 'bulk' ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-black/20 bg-black/[0.02] px-3 py-5 text-center text-[11px] text-muted-foreground hover:bg-black/[0.04]">
                  {bulkSheet ? <span className="font-medium text-foreground">{bulkSheet.name}</span> : <span>Upload filled template (.xlsx)</span>}
                  <input type="file" accept=".xlsx" onChange={(e) => setBulkSheet(e.target.files?.[0] || null)} className="hidden" />
                </label>
                <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-black/20 bg-black/[0.02] px-3 py-5 text-center text-[11px] text-muted-foreground hover:bg-black/[0.04]">
                  {bulkImages.length ? <span className="font-medium text-foreground">{bulkImages.length} images selected</span> : <span>Upload product images (match by SKU in filename)</span>}
                  <input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(e) => setBulkImages(Array.from(e.target.files || []))} className="hidden" />
                </label>
                {bulkMsg && <p className="sm:col-span-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{bulkMsg}</p>}
              </div>
            ) : mode === 'asin' ? (
              <>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-medium text-muted-foreground">Scrape from:</span>
                    {([['amazon_in', 'Amazon'], ['flipkart', 'Flipkart'], ['myntra', 'Myntra'], ['noon', 'Noon'], ['namshi', 'Namshi']] as const).map(([id, lbl]) => (
                      <button key={id} type="button" onClick={() => setSourcePlatform(id)}
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition ${sourcePlatform === id ? 'bg-foreground text-background' : 'border border-black/10 text-foreground/70 hover:bg-black/[0.04]'}`}>{lbl}</button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer rounded-md border border-black/10 bg-white px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-black/[0.03]">
                      Upload CSV
                      <input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={onUploadAsins} className="hidden" />
                    </label>
                    <span className="label-mono text-[11px] text-muted-foreground">{parseIds(asin).length} valid</span>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-[1fr_260px]">
                  <textarea
                    value={asin} onChange={(e) => setAsin(e.target.value)} rows={2}
                    placeholder={sourcePlatform === 'amazon_in' ? 'Paste Amazon ASIN(s) - B08N5WRWNW …' : `Paste ${sourcePlatform} product ID(s) / URL(s) to scrape`}
                    className="w-full resize-y rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
                  />
                  <input
                    value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Target audience (optional)"
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 sm:h-auto"
                  />
                </div>
              </>
            ) : (
              <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
                <label className="relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-black/20 bg-black/[0.02] text-center hover:bg-black/[0.04]">
                  {heroPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={heroPreview} alt="hero" className="h-full w-full object-contain" />
                  ) : (
                    <span className="px-2 text-[11px] text-muted-foreground">Upload your product image<br />(PNG / JPG)</span>
                  )}
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onHeroSelect} className="hidden" />
                </label>
                <div className="space-y-2">
                  <input value={rawTitle} onChange={(e) => setRawTitle(e.target.value)} placeholder="Product title"
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/15" />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input value={rawBrand} onChange={(e) => setRawBrand(e.target.value)} placeholder="Brand (optional)"
                      className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/15" />
                    <input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Target audience (optional)"
                      className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/15" />
                  </div>
                  <input value={rawDim} onChange={(e) => setRawDim(e.target.value)} placeholder="Dimensions (e.g. 270 x 250 cm) - optional"
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/15" />
                  <textarea value={rawDesc} onChange={(e) => setRawDesc(e.target.value)} rows={3}
                    placeholder="Product description - features, materials, use cases (we generate the rest)"
                    className="w-full resize-y rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/15" />
                </div>
              </div>
            )}
          </div>

          {/* Step 2 - What to generate */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-semibold text-foreground">2. What to generate</label>
              <button onClick={() => setLabs(labs.length === LABS.length ? [] : LABS.map((l) => l.id))} className="text-[11px] font-medium text-accent">
                {labs.length === LABS.length ? 'Clear all' : 'Select all'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {LABS.map((l) => {
                const on = labs.includes(l.id)
                return (
                  <button key={l.id} onClick={() => toggleLab(l.id)}
                    className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-left transition ${on ? 'border-accent bg-accent/5 ring-1 ring-accent/20' : 'border-black/10 hover:bg-black/[0.03]'}`}>
                    <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border text-[10px] text-white ${on ? 'border-accent bg-accent' : 'border-black/20'}`}>{on ? '✓' : ''}</span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-foreground">{l.label}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Step 3 - Region + Platform */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground">3. Region</label>
              <div className="flex flex-wrap gap-2">
                {([['IN', 'India'], ['GCC', 'GCC']] as const).map(([id, label]) => (
                  <button key={id} type="button" onClick={() => setRegion(id)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${region === id ? 'bg-foreground text-background' : 'border border-black/10 text-foreground/70 hover:bg-black/[0.04]'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground">4. Generate for <span className="font-normal text-muted-foreground">· target marketplace</span></label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS_BY_REGION[region].map(([id, label]) => (
                  <button key={id} type="button" onClick={() => setPlatform(id as typeof platform)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${platform === id ? 'bg-foreground text-background' : 'border border-black/10 text-foreground/70 hover:bg-black/[0.04]'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Step 5 - Quantities */}
          {(labs.includes('PhotoLab') || labs.includes('APlusLab') || labs.includes('VideoLab')) && (
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground">5. How many of each</label>
              <div className="rounded-xl border border-black/5 bg-black/[0.015] p-3">
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-5">
                  {labs.includes('APlusLab') && <Stepper label="A+ modules" v={counts.aPlus} max={7} on={(x) => setCount('aPlus', x, 7)} />}
                  {labs.includes('PhotoLab') && <Stepper label="Lifestyle" v={counts.lifestyle} max={4} on={(x) => setCount('lifestyle', x, 4)} />}
                  {labs.includes('PhotoLab') && <Stepper label="Infographics" v={counts.infographic} max={4} on={(x) => setCount('infographic', x, 4)} />}
                  {labs.includes('PhotoLab') && <Stepper label="Dimension" v={counts.dimension} max={2} on={(x) => setCount('dimension', x, 2)} />}
                  {labs.includes('PhotoLab') && <Stepper label="Detail shots" v={counts.detail} max={4} on={(x) => setCount('detail', x, 4)} />}
                  {labs.includes('PhotoLab') && <Stepper label="Product photos" v={counts.productPhoto} max={6} on={(x) => setCount('productPhoto', x, 6)} />}
                  {labs.includes('VideoLab') && <Stepper label="Videos" v={counts.video} max={2} on={(x) => setCount('video', x, 2)} />}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  <b className="text-foreground">{(labs.includes('PhotoLab') ? 1 + counts.lifestyle + counts.infographic + counts.dimension + counts.detail + counts.productPhoto : 0) + (labs.includes('APlusLab') ? counts.aPlus : 0)} images</b> + <b className="text-foreground">{labs.includes('VideoLab') ? counts.video : 0} video(s)</b>
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <button onClick={() => (mode === 'raw' ? (rawSub === 'bulk' ? runBulk() : runRaw()) : run({ full: true }))}
            disabled={running || labs.length === 0 || !isAuthed || (mode === 'asin' ? parseIds(asin).length === 0 : rawSub === 'bulk' ? !bulkSheet || !bulkImages.length : !heroFile || rawTitle.trim().length < 3)}
            className="flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition hover:opacity-90 disabled:opacity-50">
            <Sparkles className="h-4 w-4" /> {running ? 'Generating…' : mode === 'raw' && rawSub === 'bulk' ? 'Generate all products' : `Generate ${labs.length === LABS.length ? 'everything' : labs.length + ' selected'}`}
          </button>
          <span className="text-xs text-muted-foreground">
            {labs.length === 0 ? 'Pick at least one above' : LABS.filter((l) => labs.includes(l.id)).map((l) => l.label).join(' · ')}
          </span>
          {running && (
            <span className="flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold tabular-nums text-accent sm:ml-auto">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" /> {fmtDuration(elapsed)} elapsed
            </span>
          )}
          {!running && tookSec != null && (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold tabular-nums text-emerald-700 sm:ml-auto">
              ✓ Generated in {fmtDuration(tookSec)}
            </span>
          )}
        </div>
        {error && <p className="mt-2 px-1 text-sm text-accent">{error}</p>}
        {stage && <p className="mt-2 px-1 text-xs text-muted-foreground">{stage}</p>}
        {queue.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {queue.map((q) => (
              <span key={q.asin} className={`label-mono rounded-full px-2 py-0.5 text-[10px] ${q.status === 'done' ? 'bg-emerald-50 text-emerald-700' : q.status === 'running' ? 'bg-accent/10 text-accent' : q.status === 'failed' ? 'bg-red-50 text-red-600' : 'bg-black/5 text-muted-foreground'}`}>
                {q.asin} · {q.status}
              </span>
            ))}
          </div>
        )}
        {!isAuthed && <p className="mt-2 px-1 text-xs text-muted-foreground"><Link href="/login" className="text-accent underline">Sign in</Link> to render images + video.</p>}
      </Card>

      {/* Audit & Optimize - the differentiator */}
      <AuditPanel />

      {/* KPI tiles */}
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4">
            <div className="flex items-start justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: `color-mix(in oklab, ${k.color} 14%, white)`, color: k.color }}>
                <k.icon className="h-4 w-4" />
              </span>
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <div className="mt-3 font-display text-2xl font-semibold tracking-tight">{k.value}</div>
            <div className="label-mono text-[10px] uppercase text-muted-foreground">{k.label}</div>
            <div className="mt-2"><Sparkline data={k.spark} color={k.color} width={140} height={30} /></div>
          </Card>
        ))}
      </div>

      {!result && !running && (
        <Card className="p-12 text-center">
          <h3 className="font-display text-xl font-medium">Paste an ASIN to build a campaign</h3>
          <div className="mt-5 flex justify-center">
            <PoweredByOpus />
          </div>
        </Card>
      )}

      {/* Rich stepped progress (stages + live history), shown while running. */}
      {running && (
        <ProgressStages progress={serverProgress} elapsed={elapsed} />
      )}

      {result && (
        <Card className="mb-4 flex flex-col items-start justify-between gap-3 p-4 sm:flex-row sm:items-center">
          <div>
            <div className="text-sm font-semibold">Download this campaign</div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => exportCampaignCsv(result)} className="flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-black/[0.03]">
              <FileSpreadsheet className="h-4 w-4" /> CSV sheet
            </button>
            <button onClick={downloadZip} disabled={zipping} className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60">
              <Download className="h-4 w-4" /> {zipping ? 'Zipping...' : 'Download all (ZIP)'}
            </button>
          </div>
        </Card>
      )}

      {result && <AmazonPreview result={result} onOpen={(src) => setLightbox({ src, type: 'image' })} />}

      {result?.brandDna && <BrandDnaCard dna={result.brandDna} />}

      {result && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
          {/* Left column */}
          <div className="space-y-4">
            {/* Ranked angles */}
            <Card className="p-5" >
              <div className="mb-4 flex items-center gap-2" id="angles">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent"><Trophy className="h-4 w-4" /></span>
                <h3 className="font-display text-base font-medium">Ranked ad angles</h3>
              </div>
              {angles.length === 0 && <p className="text-sm text-muted-foreground">No angles yet {me?.health.llm ? '' : '(add Sonnet key)'}. Toggle AngleLab and generate.</p>}
              <div className="space-y-2.5">
                {angles.slice(0, 6).map((a: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-black/5 text-xs font-semibold">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">{a.headline}</span>
                        <span className="shrink-0 text-sm font-semibold text-accent">{a.predictedScore ?? '-'}</span>
                      </div>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-accent/10">
                        <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent/70" style={{ width: `${a.predictedScore || 0}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Keywords */}
            {result.keywords?.length > 0 && (
              <Card className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent"><Search className="h-4 w-4" /></span>
                    <h3 className="font-display text-base font-medium">Keyword analysis</h3>
                  </div>
                  <span className="label-mono text-[10px] text-muted-foreground">{result.keywords.length} keywords</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {result.keywords.map((k: any, i: number) => (
                    <span key={i} title={k.intent}
                      className={`rounded-full px-2.5 py-1 text-xs ${k.intent === 'transactional' ? 'bg-accent/10 text-accent' : k.intent === 'informational' ? 'bg-black/[0.04] text-muted-foreground' : 'bg-emerald-50 text-emerald-700'}`}>
                      {k.keyword}
                    </span>
                  ))}
                </div>
              </Card>
            )}

            {/* Listing */}
            {result.listing && (
              <Card className="p-5">
                <h3 className="mb-3 font-display text-base font-medium">Optimized listing</h3>
                <div className="rounded-xl bg-black/[0.02] p-3">
                  <div className="label-mono text-[10px] uppercase text-muted-foreground">Title</div>
                  <p className="mt-1 text-sm font-medium">{result.listing.title}</p>
                </div>
                <div className="mt-3 space-y-1.5">
                  {result.listing.bullets?.slice(0, 5).map((b: string, i: number) => (
                    <div key={i} className="flex gap-2 text-sm"><span className="text-accent">▸</span><span className="text-foreground/90">{b}</span></div>
                  ))}
                </div>
                {result.listing.aPlusContent?.length > 0 && (
                  <div className="mt-4 border-t border-black/5 pt-3">
                    <div className="label-mono mb-2 text-[10px] uppercase text-muted-foreground">A+ content modules</div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {result.listing.aPlusContent.map((m: any, i: number) => (
                        <div key={i} className="rounded-xl bg-black/[0.02] p-3">
                          <div className="text-xs font-semibold">{m.heading}</div>
                          <div className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{m.body}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Product preview */}
            <Card className="p-4">
              <div className="flex gap-4">
                <div className="h-36 w-28 shrink-0 overflow-hidden rounded-xl bg-black/5">
                  {heroAsset?.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={heroAsset.imageUrl} alt="product" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center p-2 text-center text-[10px] text-muted-foreground">Generate the main image →</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 text-sm font-semibold">{product?.title || 'Product'}</h3>
                  <div className="mt-1 flex items-center gap-1 text-accent">
                    {[0, 1, 2, 3].map((i) => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}
                    <Star className="h-3.5 w-3.5" />
                    <span className="ml-1 text-xs text-muted-foreground">{product?.rating || '4.5'}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    {SWATCHES.map((c) => <span key={c} className="h-4 w-4 rounded-full border border-black/10" style={{ background: c }} />)}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-muted-foreground"><Heart className="h-4 w-4" /></button>
                    <button onClick={() => heroAsset && generateImage(heroAsset.id)} disabled={!heroAsset || genImage[heroAsset?.id] === 'loading'}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
                      <ShoppingCart className="h-4 w-4" />
                      {genImage[heroAsset?.id] === 'loading' ? 'Rendering…' : 'Generate main image'}
                    </button>
                  </div>
                </div>
              </div>
            </Card>

            {/* AI gallery */}
            <Card className="p-4" >
              <div className="mb-3 flex items-center justify-between" id="assets">
                <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent" /><h3 className="font-display text-base font-medium">AI creative gallery</h3></div>
              </div>
              <div className="space-y-4">
                {GALLERY_GROUPS.map(([type, label]) => {
                  const group = assets.filter((a: any) => a.type === type)
                  if (!group.length) return null
                  return (
                    <div key={type}>
                      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
                      <div className="grid grid-cols-3 gap-2">
                        {group.map((a: any) => (
                          <button key={a.id}
                            onClick={() => (a.imageUrl ? setLightbox({ src: a.imageUrl, type: 'image' }) : generateImage(a.id))}
                            disabled={genImage[a.id] === 'loading'}
                            title={a.imageUrl ? 'Preview + download' : `Generate ${humanType(a.type)}`}
                            className="group relative aspect-square overflow-hidden rounded-lg border border-black/5 bg-black/5">
                            {a.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={a.imageUrl} alt={humanType(a.type)} className="h-full w-full object-cover" />
                            ) : genImage[a.id] === 'loading' ? (
                              <div className="flex h-full flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-black/[0.06] to-accent/[0.08]">
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                                <span className="text-[8px] font-medium text-accent">cooking…</span>
                              </div>
                            ) : (
                              <div className="flex h-full flex-col items-center justify-center gap-1 p-1 text-center">
                                <span className="text-[8px] text-accent">tap to generate</span>
                              </div>
                            )}
                            {/* Regenerating overlay (also over an existing image). */}
                            {genImage[a.id] === 'loading' && a.imageUrl && (
                              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 bg-white/75">
                                <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                                <span className="text-[9px] font-semibold text-accent">Regenerating…</span>
                              </div>
                            )}
                            <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
                              {a.imageUrl ? <Eye className="h-4 w-4 text-white" /> : <RefreshCw className={`h-4 w-4 text-white ${genImage[a.id] === 'loading' ? 'animate-spin' : ''}`} />}
                            </span>
                            {a.imageUrl && genImage[a.id] !== 'loading' && (
                              <button onClick={(e) => { e.stopPropagation(); setRegenNote(''); setRegen({ id: a.id, type: a.type }) }} title="Regenerate with feedback"
                                className="absolute right-1 top-1 hidden rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white group-hover:block">
                                Regenerate
                              </button>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
              {assets.filter((a: any) => a.videoUrl).length > 0 && (
                <div className="mt-4 space-y-2" id="video">
                  <div className="text-xs font-semibold">Product video</div>
                  {assets.filter((a: any) => a.videoUrl).map((a: any, i: number) => (
                    <div key={i} className="group relative aspect-video w-full overflow-hidden rounded-xl bg-black">
                      <video src={a.videoUrl} controls className="h-full w-full object-contain" />
                      <button onClick={() => { setRegenNote(''); setRegen({ id: a.id, type: a.type }) }} title="Regenerate with feedback"
                        className="absolute right-2 top-2 rounded-md bg-black/60 px-2 py-1 text-[10px] font-medium text-white opacity-0 transition group-hover:opacity-100">
                        {genImage[a.id] === 'loading' ? 'Regenerating…' : 'Regenerate'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {lightbox && <Lightbox src={lightbox.src} type={lightbox.type} onClose={() => setLightbox(null)} />}

      {/* Regenerate with feedback - comment goes to the LLM to refine the prompt,
          and is saved so the model learns this brand's preferences. */}
      {regen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setRegen(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-sm font-semibold">Regenerate this {humanType(regen.type).toLowerCase()}</div>
            <p className="mt-1 text-xs text-muted-foreground">What didn&apos;t you like / what should change? We&apos;ll refine the prompt and remember it for your brand.</p>
            <textarea value={regenNote} onChange={(e) => setRegenNote(e.target.value)} rows={3} autoFocus
              placeholder="e.g. make the background warmer, show the pattern closer, use a brighter pink, remove the person…"
              className="mt-3 w-full resize-y rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/15" />
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setRegen(null)} className="rounded-lg border border-black/10 px-3 py-1.5 text-sm">Cancel</button>
              <button onClick={() => { const { id, type } = regen; setRegen(null); const c = regenNote.trim() || undefined; (type === 'product_video' || type === 'ugc_video') ? regenerateVideo(id, c) : generateImage(id, c) }}
                className="rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-white">Regenerate</button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}

// Rich campaign progress - stepped stages + a live "progress history" list, so a
// long generation reads as real work (not a frozen spinner). Client-driven from
// the current phase + per-image count; safe to leave the page (jobs run server-side).
function ProgressStages({ progress, elapsed }: { progress: any; elapsed: number }) {
  const steps: any[] = progress?.steps || []
  const pct = typeof progress?.percent === 'number' ? progress.percent : 5
  const images = progress?.images
  const remaining = pct > 0 && pct < 100 ? Math.round((elapsed * (100 - pct)) / pct) : 0

  const RAIL = [
    { name: 'Analyze Product', keys: ['product', 'reviews'] },
    { name: 'Research Market', keys: ['competitors', 'keywords', 'avatars'] },
    { name: 'Create Concepts', keys: ['listing', 'concepts'] },
    { name: 'Generate Images', keys: ['images'] },
  ]
  const statusOf = (key: string) => steps.find((s) => s.key === key)?.status || 'pending'
  const railState = (keys: string[]) => {
    const sts = keys.map(statusOf)
    if (sts.length && sts.every((s) => s === 'done')) return 'done'
    if (sts.some((s) => s === 'active' || s === 'done')) return 'active'
    return 'pending'
  }
  const STAGES = RAIL.map((r) => r.name)
  const cur = (() => {
    for (let i = 0; i < RAIL.length; i++) if (railState(RAIL[i].keys) !== 'done') return i
    return RAIL.length
  })()
  const history = steps.map((s: any) => ({
    label: s.key === 'images' && images?.total ? `${s.label} (${images.done}/${images.total})` : s.label,
    done: s.status === 'done',
    active: s.status === 'active',
  }))

  return (
    <Card className="mb-4 p-6">
      <p className="mb-3 text-center text-xs text-muted-foreground">Good things take time - sit back for a few minutes while we craft your campaign. It&apos;s safe to leave this page and come back.</p>
      {/* Progress bar */}
      <div className="rounded-xl border border-black/10 p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="tabular-nums text-muted-foreground">{remaining > 0 ? `${fmtDuration(remaining)} left` : 'finishing…'}</span>
          <span className="font-semibold tabular-nums">{pct}%</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-black/5">
          <div className="h-full rounded-full bg-brand-gradient transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Stage rail */}
      <div className="mt-5 flex items-center">
        {STAGES.map((s, i) => {
          const state = i < cur ? 'done' : i === cur ? 'active' : 'pending'
          return (
            <div key={s} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <span className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${state === 'done' ? 'bg-accent text-white' : state === 'active' ? 'bg-accent/15 text-accent ring-2 ring-accent/40' : 'bg-black/5 text-muted-foreground'}`}>
                  {state === 'done' ? '✓' : state === 'active' ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent border-t-transparent" /> : i + 1}
                </span>
                <span className={`text-[11px] font-medium ${state === 'pending' ? 'text-muted-foreground' : 'text-foreground'}`}>{s}</span>
              </div>
              {i < STAGES.length - 1 && <div className={`mx-2 h-0.5 flex-1 rounded ${i < cur ? 'bg-accent' : 'bg-black/10'}`} />}
            </div>
          )
        })}
      </div>

      {/* Progress history */}
      <div className="mt-5 rounded-xl border border-black/5">
        <div className="border-b border-black/5 px-4 py-2.5 text-sm font-semibold">Progress history</div>
        <div className="divide-y divide-black/5">
          {history.map((h) => (
            <div key={h.label} className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-2.5">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${h.done ? 'bg-accent text-white' : h.active ? 'bg-accent/10 text-accent' : 'bg-black/5 text-muted-foreground'}`}>
                  {h.done ? '✓' : h.active ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-accent border-t-transparent" /> : '•'}
                </span>
                <span className={`text-sm ${h.done || h.active ? '' : 'text-muted-foreground'}`}>{h.label}</span>
              </div>
              <span className={`text-xs font-medium ${h.done ? 'text-emerald-600' : h.active ? 'text-accent' : 'text-muted-foreground'}`}>{h.done ? 'Completed' : h.active ? 'In progress' : 'Pending'}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

// Amazon-style listing preview: a PDP mock (gallery + title/price/bullets) with
// the A+ content modules stacked back-to-back below it, exactly how the shopper
// sees it on the live listing - so the user can visualize the final result.
function AmazonPreview({ result, onOpen }: { result: any; onOpen: (src: string) => void }) {
  const p = result?.scraped?.product
  const listing = result?.listing
  const assets: any[] = result?.assets || []
  const withUrl = (t: string) => assets.filter((a) => a.type === t && a.imageUrl)
  const main = assets.find((a) => a.type === 'main_image' && a.imageUrl) || assets.find((a) => a.imageUrl)
  const galleryUrls = Array.from(
    new Set([main, ...withUrl('lifestyle'), ...withUrl('infographic'), ...withUrl('dimension'), ...withUrl('product_photo')].filter(Boolean).map((a: any) => a.imageUrl)),
  )
  const aplus = assets.filter((a) => a.type === 'a_plus_module')
  const videos = assets.filter((a: any) => a.videoUrl)
  const [sel, setSel] = useState(0)
  const cur = (c?: string) => (c === 'INR' ? '₹' : c === 'USD' ? '$' : c === 'AED' ? 'AED ' : c ? `${c} ` : '')
  const idq = scoreIDQ(result)
  const idqColor = idq.score >= 90 ? '#10B981' : idq.score >= 70 ? '#F59E0B' : '#EF4444'
  const title = listing?.title || p?.title || 'Product title'
  const bullets: string[] = (listing?.bullets?.length ? listing.bullets : p?.bullets) || []
  const features: string[] = listing?.features || []
  const rating = p?.rating || 0
  const heroUrl = galleryUrls[sel] || galleryUrls[0]

  return (
    <div className="mx-auto mb-4 max-w-5xl">
      {/* IDQ (Item Data Quality) score - same signals Amazon scores listings on. */}
      <Card className="mb-4 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full"
              style={{ background: `conic-gradient(${idqColor} ${idq.score * 3.6}deg, #eceef2 0deg)` }}>
              <div className="flex h-15 w-15 flex-col items-center justify-center rounded-full bg-white" style={{ height: 60, width: 60 }}>
                <span className="text-lg font-bold tabular-nums" style={{ color: idqColor }}>{idq.score}</span>
                <span className="text-[8px] uppercase text-muted-foreground">/ 100</span>
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold">IDQ · Item Data Quality</div>
              <div className="text-xs text-muted-foreground">Scored on your generated listing, A+ &amp; images - the same signals Amazon uses.</div>
            </div>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
            {idq.checks.map((c) => {
              const full = c.earned >= c.points
              const partial = c.earned > 0 && !full
              return (
                <div key={c.label} className="flex items-center gap-1.5 text-[11px]" title={c.tip}>
                  <span className={full ? 'text-emerald-500' : partial ? 'text-amber-500' : 'text-red-400'}>{full ? '✓' : partial ? '◐' : '✕'}</span>
                  <span className={full ? 'text-foreground/80' : 'text-muted-foreground'}>{c.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </Card>

      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-sm font-semibold">Amazon listing preview</span>
        <span className="label-mono text-[10px] uppercase text-muted-foreground">how it looks live</span>
      </div>

      {/* PDP block */}
      <Card className="p-5 sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,440px)_1fr]">
          {/* Gallery */}
          <div className="flex gap-3">
            <div className="flex flex-col gap-2">
              {galleryUrls.slice(0, 6).map((u, i) => (
                <button key={u} onClick={() => setSel(i)}
                  className={`h-12 w-12 overflow-hidden rounded-lg border ${i === sel ? 'border-accent ring-1 ring-accent/30' : 'border-black/10'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt="thumb" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
            <button onClick={() => heroUrl && onOpen(heroUrl)}
              className="relative aspect-square flex-1 overflow-hidden rounded-xl border border-black/5 bg-black/[0.03]">
              {heroUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={heroUrl} alt="main" className="h-full w-full object-contain" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Rendering main image…</div>
              )}
            </button>
          </div>

          {/* Buy box */}
          <div className="min-w-0">
            {p?.brand && <div className="text-sm text-accent">Visit the {p.brand} Store</div>}
            <h2 className="mt-1 text-lg font-medium leading-snug text-foreground">{title}</h2>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="flex text-amber-500">
                {[0, 1, 2, 3, 4].map((i) => <Star key={i} className={`h-4 w-4 ${i < Math.round(rating) ? 'fill-current' : ''}`} />)}
              </span>
              <span className="text-xs text-muted-foreground">{rating || '-'} · {p?.reviewCount?.toLocaleString?.() || 0} ratings</span>
            </div>
            {listing?.itemHighlight && <p className="mt-1.5 text-xs text-muted-foreground">{listing.itemHighlight}</p>}
            {p?.price > 0 && (
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-sm text-muted-foreground">Price:</span>
                <span className="text-2xl font-semibold text-foreground">{cur(p.currency)}{p.price?.toLocaleString?.()}</span>
              </div>
            )}
            {bullets.length > 0 && (
              <div className="mt-4">
                <div className="text-sm font-semibold">About this item</div>
                <ul className="mt-1.5 space-y-1.5">
                  {bullets.slice(0, 6).map((b, i) => (
                    <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-foreground/90">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-foreground/50" /><span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {features.length > 0 && (
              <div className="mt-4">
                <div className="text-sm font-semibold">Key features</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {features.slice(0, 5).map((f, i) => (
                    <span key={i} className="rounded-full bg-black/[0.05] px-2.5 py-1 text-xs text-foreground/85">{f}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {listing?.description && (
          <div className="mt-6 border-t border-black/5 pt-4">
            <div className="text-sm font-semibold">Product description</div>
            <p className="mt-1.5 whitespace-pre-line text-[13px] leading-relaxed text-foreground/85">{listing.description}</p>
          </div>
        )}
      </Card>

      {/* Product video (shown with the A+ content, like on a live listing) */}
      {videos.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 text-center text-sm font-semibold uppercase tracking-wide text-muted-foreground">Product Video</div>
          <div className="mx-auto max-w-4xl space-y-3">
            {videos.map((v: any, i: number) => (
              <div key={v.id || i} className="aspect-video w-full overflow-hidden rounded-xl bg-black">
                <video src={v.videoUrl} controls className="h-full w-full object-contain" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* A+ content - full-width modules stacked back-to-back, like Amazon */}
      {aplus.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 text-center text-sm font-semibold uppercase tracking-wide text-muted-foreground">Product Description · A+ Content</div>
          <div className="mx-auto max-w-4xl overflow-hidden rounded-xl border border-black/5 bg-white">
            {aplus.map((a, i) => (
              <div key={a.id || i} className="w-full">
                {a.imageUrl ? (
                  <button onClick={() => onOpen(a.imageUrl)} className="block w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.imageUrl} alt={`A+ module ${i + 1}`} className="block w-full" />
                  </button>
                ) : (
                  <div className="flex aspect-[16/9] w-full items-center justify-center bg-gradient-to-br from-black/[0.05] to-accent/[0.06] text-xs text-muted-foreground">
                    A+ module {i + 1} rendering…
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function BrandDnaCard({ dna }: { dna: any }) {
  const s = dna.sentiment || {}
  const List = ({ label, items, tone }: { label: string; items?: string[]; tone?: string }) => (
    <div>
      <div className="label-mono mb-1.5 text-[10px] uppercase text-muted-foreground">{label}</div>
      <ul className="space-y-1">
        {(items || []).map((x, i) => (
          <li key={i} className="flex gap-1.5 text-xs text-foreground/85">
            <span className={tone === 'bad' ? 'text-red-500' : tone === 'good' ? 'text-emerald-500' : 'text-accent'}>•</span>
            <span>{x}</span>
          </li>
        ))}
      </ul>
    </div>
  )
  return (
    <Card className="mb-4 p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">🧬</span>
        <h3 className="font-display text-base font-semibold">Brand DNA</h3>
      </div>
      {dna.positioning && <p className="text-sm font-medium">{dna.positioning}</p>}
      {dna.idealCustomer && <p className="mt-1 text-xs text-muted-foreground">Ideal customer: {dna.idealCustomer}</p>}

      {/* Sentiment bar */}
      {(s.positive || s.negative) && (
        <div className="mt-3">
          <div className="flex h-2.5 w-full overflow-hidden rounded-full">
            <div className="bg-emerald-400" style={{ width: `${s.positive || 0}%` }} />
            <div className="bg-black/15" style={{ width: `${s.neutral || 0}%` }} />
            <div className="bg-accent" style={{ width: `${s.negative || 0}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>{s.positive || 0}% positive</span><span>{s.neutral || 0}% neutral</span><span>{s.negative || 0}% negative</span>
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <List label="Customers love" items={dna.loves} tone="good" />
        <List label="Pain points" items={dna.painPoints} tone="bad" />
        <List label="Likely return reasons" items={dna.returnReasons} tone="bad" />
        <List label="Improvement opportunities" items={dna.improvements} />
      </div>

      {dna.keyThemes?.length > 0 && (
        <div className="mt-4 border-t border-black/5 pt-3">
          <div className="label-mono mb-2 text-[10px] uppercase text-muted-foreground">Recurring themes</div>
          <div className="flex flex-wrap gap-1.5">
            {dna.keyThemes.map((t: any, i: number) => (
              <span key={i} className="rounded-full bg-black/[0.04] px-2.5 py-1 text-xs">{t.theme} <span className="text-muted-foreground">{t.mentions}</span></span>
            ))}
          </div>
        </div>
      )}
      {dna.toneOfVoice?.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">Brand voice: <span className="text-foreground">{dna.toneOfVoice.join(', ')}</span></p>
      )}
    </Card>
  )
}
