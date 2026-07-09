'use client'

import { useState } from 'react'
import { Card } from '@/components/app/shell'
import { Search, Check, AlertTriangle, X, Copy, Star } from 'lucide-react'

const STEPS = ['Reading your live listing', 'Scoring every field', 'Analyzing competitors', 'Building your buyer avatar']

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'
  const c = 2 * Math.PI * 34
  return (
    <div className="relative h-24 w-24">
      <svg viewBox="0 0 80 80" className="h-24 w-24 -rotate-90">
        <circle cx="40" cy="40" r="34" fill="none" stroke="#00000010" strokeWidth="8" />
        <circle cx="40" cy="40" r="34" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * score) / 100} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-bold" style={{ color }}>{score}</span>
        <span className="text-[9px] text-muted-foreground">/ 100</span>
      </div>
    </div>
  )
}

const STATUS: Record<string, { label: string; cls: string; icon: any }> = {
  keep: { label: 'Keep', cls: 'bg-emerald-50 text-emerald-700', icon: Check },
  improve: { label: 'Improve', cls: 'bg-amber-50 text-amber-700', icon: AlertTriangle },
  rewrite: { label: 'Rewrite', cls: 'bg-red-50 text-red-600', icon: X },
}

export function AuditPanel() {
  const [asin, setAsin] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(0)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')

  async function run() {
    const clean = asin.trim().toUpperCase()
    if (clean.length !== 10) return setError('Enter a 10-character ASIN (e.g. B0CXYZ1234).')
    setError(''); setData(null); setLoading(true); setStep(0)
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 3000)
    try {
      const r = await fetch('/api/audit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asin: clean }),
      }).then((x) => x.json())
      if (r.ok) setData(r.data)
      else setError(r.error || 'Audit failed.')
    } catch { setError('Network error.') } finally { clearInterval(t); setLoading(false) }
  }

  const copy = (t: string) => navigator.clipboard?.writeText(t)

  return (
    <Card className="mb-4 p-5">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-accent" />
        <h2 className="font-display text-lg font-semibold">Audit &amp; Optimize a live listing</h2>
        <span className="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">the ArrowLabs edge</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">We read your live listing, score every field against Amazon rules, keywords and real reviews, then tell you what to keep and what to rewrite. No blind rewrites.</p>

      <div className="mt-3 flex gap-2">
        <input value={asin} onChange={(e) => setAsin(e.target.value)} placeholder="Paste an Amazon ASIN"
          className="flex-1 rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-accent" />
        <button onClick={run} disabled={loading} className="btn-gradient rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-50">
          {loading ? 'Auditing…' : 'Audit listing'}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {loading && (
        <div className="mt-4 space-y-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2.5 text-sm">
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${i < step ? 'bg-emerald-100' : i === step ? 'bg-accent/15' : 'bg-black/5'}`}>
                {i < step ? '✓' : i === step ? <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-accent border-t-transparent" /> : ''}
              </span>
              <span className={i === step ? 'font-medium' : 'text-muted-foreground'}>{s}{i === step ? '…' : ''}</span>
            </div>
          ))}
        </div>
      )}

      {data && (
        <div className="mt-5 space-y-5">
          {/* Score header */}
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-black/5 bg-white/60 p-5 sm:flex-row">
            <ScoreRing score={data.audit.overall} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-display text-3xl font-bold">Grade {data.audit.grade}</span>
                <span className="text-sm text-muted-foreground">· {data.reviewsAnalyzed} reviews analyzed</span>
              </div>
              <p className="mt-1 text-sm text-foreground/80">{data.audit.summary}</p>
              {data.audit.strengths?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {data.audit.strengths.map((s: string) => <span key={s} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">✓ {s}</span>)}
                </div>
              )}
            </div>
          </div>

          {/* Field-by-field diff */}
          <div className="space-y-2.5">
            {data.audit.fields.map((f: any) => {
              const st = STATUS[f.status] || STATUS.improve
              return (
                <div key={f.field} className="rounded-xl border border-black/5 bg-white/60 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{f.field}</span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.cls}`}><st.icon className="h-3 w-3" />{st.label}</span>
                    </div>
                    <span className="text-sm font-semibold" style={{ color: f.score >= 80 ? '#10b981' : f.score >= 60 ? '#f59e0b' : '#ef4444' }}>{f.score}/100</span>
                  </div>
                  {f.issues?.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {f.issues.map((is: string, i: number) => <li key={i}>• {is}</li>)}
                    </ul>
                  )}
                  {f.suggestion && (
                    <div className="mt-2 rounded-lg bg-accent/5 p-3">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase text-accent">Suggested rewrite</span>
                        <button onClick={() => copy(f.suggestion)} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"><Copy className="h-3 w-3" />copy</button>
                      </div>
                      <p className="text-sm text-foreground/90 whitespace-pre-wrap">{f.suggestion}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Missing keywords */}
          {data.audit.missingKeywords?.length > 0 && (
            <div>
              <div className="label-mono mb-2 text-[10px] uppercase text-muted-foreground">High-value keywords missing from your listing</div>
              <div className="flex flex-wrap gap-1.5">
                {data.audit.missingKeywords.map((k: string) => <span key={k} className="rounded-full bg-red-50 px-2.5 py-1 text-xs text-red-600">{k}</span>)}
              </div>
            </div>
          )}

          {/* SERP simulation */}
          <div>
            <div className="label-mono mb-2 text-[10px] uppercase text-muted-foreground">Search result preview (how it appears on Amazon)</div>
            <div className="flex gap-3 rounded-xl border border-black/10 bg-white p-3">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                {data.product.images?.[0] && (/* eslint-disable-next-line @next/next/no-img-element */<img src={data.product.images[0]} alt="" className="h-full w-full object-contain" />)}
              </div>
              <div className="min-w-0">
                <div className="line-clamp-2 text-sm font-medium text-[#0F1111]">{data.product.title}</div>
                <div className="mt-1 flex items-center gap-1 text-xs">
                  {[1, 2, 3, 4, 5].map((i) => <Star key={i} className={`h-3 w-3 ${i <= Math.round(data.product.rating) ? 'fill-[#FFA41C] text-[#FFA41C]' : 'text-black/20'}`} />)}
                  <span className="text-[#007185]">{data.product.reviewCount?.toLocaleString()}</span>
                </div>
                {data.product.price > 0 && <div className="mt-1 text-lg font-medium text-[#0F1111]">${data.product.price}</div>}
              </div>
            </div>
          </div>

          {/* Customer avatar */}
          {data.avatar && (
            <div className="rounded-2xl border border-black/5 bg-gradient-to-br from-accent/[0.04] to-transparent p-5">
              <div className="label-mono mb-1 text-[10px] uppercase text-accent">Customer avatar</div>
              <div className="font-display text-lg font-semibold">{data.avatar.name}</div>
              <p className="mt-1 text-sm text-foreground/80">{data.avatar.snapshot}</p>
              <p className="mt-1 text-xs text-muted-foreground">{data.avatar.demographics}</p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {([['Pains', data.avatar.pains], ['Desires', data.avatar.desires], ['Objections', data.avatar.objections], ['Buying triggers', data.avatar.buyingTriggers]] as [string, string[]][]).map(([label, items]) => (
                  <div key={label}>
                    <div className="text-[11px] font-semibold text-foreground">{label}</div>
                    <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                      {(items || []).map((it, i) => <li key={i}>• {it}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Competitor gaps */}
          {data.gaps && (
            <div className="rounded-2xl border border-black/5 bg-white/60 p-5">
              <div className="label-mono mb-1 text-[10px] uppercase text-muted-foreground">Competitor gap analysis</div>
              <p className="text-sm text-foreground/80">{data.gaps.summary}</p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-[11px] font-semibold text-red-600">They do, you don&apos;t</div>
                  <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">{(data.gaps.theyDoYouDont || []).map((x: string, i: number) => <li key={i}>• {x}</li>)}</ul>
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-emerald-600">Your opportunities</div>
                  <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">{(data.gaps.yourOpportunities || []).map((x: string, i: number) => <li key={i}>• {x}</li>)}</ul>
                </div>
              </div>
              {data.gaps.pricePositioning && <p className="mt-3 text-xs text-foreground/70"><b>Price:</b> {data.gaps.pricePositioning}</p>}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
