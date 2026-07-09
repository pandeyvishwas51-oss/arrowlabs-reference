'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Shell } from '@/components/app/shell'

export default function AccountPage() {
  const { status } = useSession()
  const [wallet, setWallet] = useState<any>(null)
  const [usage, setUsage] = useState<any>(null)
  const [keys, setKeys] = useState<any[]>([])
  const [newKey, setNewKey] = useState<string>('')
  const [keyName, setKeyName] = useState('Default key')
  const mcpBase = typeof window !== 'undefined' ? window.location.origin : 'https://arrowlabs.art'
  const [topup, setTopup] = useState(200)
  const [msg, setMsg] = useState('')
  const [org, setOrg] = useState<any>(null)
  const [orgForm, setOrgForm] = useState({ name: '', website: '', brandName: '', voice: '', colors: '' })
  const [orgMsg, setOrgMsg] = useState('')
  const [members, setMembers] = useState<{ members: any[]; you: string } | null>(null)
  const [inviteAddr, setInviteAddr] = useState('')
  const [inviteMsg, setInviteMsg] = useState('')
  const [me, setMe] = useState<any>(null)

  // Load Razorpay Checkout script once.
  useEffect(() => {
    if (typeof window === 'undefined' || (window as any).Razorpay) return
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.async = true
    document.body.appendChild(s)
  }, [])

  const load = useCallback(async () => {
    const [w, u, k, o, mem, meRes] = await Promise.all([
      fetch('/api/wallet').then((x) => x.json()),
      fetch('/api/usage').then((x) => x.json()),
      fetch('/api/apikeys').then((x) => x.json()),
      fetch('/api/org').then((x) => x.json()),
      fetch('/api/org/members').then((x) => x.json()),
      fetch('/api/me').then((x) => x.json()),
    ])
    if (w.ok) setWallet(w.data)
    if (u.ok) setUsage(u.data)
    if (k.ok) setKeys(k.data)
    if (mem.ok) setMembers(mem.data)
    if (meRes.ok) setMe(meRes.data)
    if (o.ok && o.data) {
      setOrg(o.data)
      setOrgForm({
        name: o.data.name || '',
        website: o.data.website || '',
        brandName: o.data.brandName || '',
        voice: o.data.brandData?.voice || '',
        colors: o.data.brandData?.colors || '',
      })
    }
  }, [])

  async function saveOrg() {
    setOrgMsg('')
    const r = await fetch('/api/org', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: orgForm.name, website: orgForm.website, brandName: orgForm.brandName,
        brandData: { voice: orgForm.voice, colors: orgForm.colors },
      }),
    }).then((x) => x.json())
    setOrgMsg(r.ok ? 'Saved.' : r.error || 'Could not save.')
    if (r.ok) load()
  }

  useEffect(() => {
    if (status === 'authenticated') load()
  }, [status, load])

  async function createKey() {
    const r = await fetch('/api/apikeys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: keyName }),
    }).then((x) => x.json())
    if (r.ok) {
      setNewKey(r.data.raw)
      load()
    }
  }
  async function revokeKey(id: string) {
    await fetch(`/api/apikeys/${id}`, { method: 'DELETE' })
    load()
  }
  async function doTopup() {
    setMsg('')
    const r = await fetch('/api/wallet/topup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credits: topup }),
    }).then((x) => x.json())
    if (!r.ok) return setMsg(r.error)

    if (r.data.dev) {
      setMsg(`Granted ${r.data.granted} credits (dev, no billing configured).`)
      return load()
    }
    if (r.data.provider === 'razorpay') {
      const Rz = (window as any).Razorpay
      if (!Rz) return setMsg('Payment library still loading - try again in a moment.')
      const rz = new Rz({
        key: r.data.keyId,
        order_id: r.data.orderId,
        amount: r.data.amount,
        currency: r.data.currency,
        name: r.data.name,
        description: r.data.description,
        prefill: { email: r.data.prefillEmail },
        theme: { color: '#6D5EF6' },
        handler: async (resp: any) => {
          const v = await fetch('/api/wallet/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...resp, credits: r.data.credits }),
          }).then((x) => x.json())
          setMsg(v.ok ? `Added ${r.data.credits} credits.` : v.error || 'Verification failed.')
          load()
        },
      })
      rz.open()
    }
  }

  async function invite() {
    setInviteMsg('')
    const r = await fetch('/api/org/members', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteAddr }),
    }).then((x) => x.json())
    setInviteMsg(r.ok ? (r.data.dev ? 'Invite logged (dev - no email configured).' : `Invite sent to ${r.data.invited}.`) : r.error)
    if (r.ok) { setInviteAddr(''); load() }
  }

  async function memberAction(userId: string, action: string) {
    if (action === 'remove' && !confirm('Remove this member from the company?')) return
    if (action === 'transfer' && !confirm('Transfer ownership? You will become an admin.')) return
    const r = await fetch('/api/org/members', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action }),
    }).then((x) => x.json())
    if (!r.ok) alert(r.error)
    load()
  }

  if (status === 'unauthenticated') {
    return (
      <Shell title="Account">
        <div className="mx-auto mt-20 max-w-md text-center">
          <h1 className="font-display text-2xl font-medium">Sign in to view your account</h1>
          <Link href="/login" className="mt-4 inline-block rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white">
            Sign in
          </Link>
        </div>
      </Shell>
    )
  }

  return (
    <Shell title="Account" credits={wallet?.balance}>
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6">
        {/* Company & brand */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-medium">Company &amp; brand</h3>
            {org?.domain && <span className="label-mono rounded-full bg-black/5 px-3 py-1 text-xs">{org.domain}</span>}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            One company per email domain. Your whole team shares this trial, credits, and brand profile.
            {org?._count?.users != null && ` · ${org._count.users} member${org._count.users === 1 ? '' : 's'}`}
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs text-muted-foreground">Company name</span>
              <input value={orgForm.name} onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                className="mt-1 w-full rounded-lg border border-border bg-white/60 px-3 py-2 text-sm" placeholder="Your company name" />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">Website</span>
              <input value={orgForm.website} onChange={(e) => setOrgForm({ ...orgForm, website: e.target.value })}
                className="mt-1 w-full rounded-lg border border-border bg-white/60 px-3 py-2 text-sm" placeholder="https://yourcompany.com" />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">Brand name</span>
              <input value={orgForm.brandName} onChange={(e) => setOrgForm({ ...orgForm, brandName: e.target.value })}
                className="mt-1 w-full rounded-lg border border-border bg-white/60 px-3 py-2 text-sm" placeholder="Your brand" />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">Brand colors</span>
              <input value={orgForm.colors} onChange={(e) => setOrgForm({ ...orgForm, colors: e.target.value })}
                className="mt-1 w-full rounded-lg border border-border bg-white/60 px-3 py-2 text-sm" placeholder="#6D5EF6, #111111" />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs text-muted-foreground">Brand voice / guidelines</span>
              <textarea value={orgForm.voice} onChange={(e) => setOrgForm({ ...orgForm, voice: e.target.value })} rows={2}
                className="mt-1 w-full rounded-lg border border-border bg-white/60 px-3 py-2 text-sm" placeholder="Warm, science-backed, never clinical…" />
            </label>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button onClick={saveOrg} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">Save brand profile</button>
            {orgMsg && <span className="text-xs text-muted-foreground">{orgMsg}</span>}
          </div>
        </div>

        {/* Team */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-medium">Team</h3>
            <span className="text-xs text-muted-foreground">{members?.members.length ?? 0} member{(members?.members.length ?? 0) === 1 ? '' : 's'}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Anyone with a {org?.domain ? `@${org.domain}` : 'company'} email auto-joins this workspace on sign-in.</p>

          {['owner', 'admin'].includes(me?.user?.role) && (
            <div className="mt-3 flex gap-2">
              <input value={inviteAddr} onChange={(e) => setInviteAddr(e.target.value)} placeholder={`teammate@${org?.domain || 'company.com'}`}
                className="flex-1 rounded-lg border border-border bg-white/60 px-3 py-1.5 text-sm" />
              <button onClick={invite} className="rounded-lg bg-foreground px-3 py-1.5 text-sm font-semibold text-background">Invite</button>
            </div>
          )}
          {inviteMsg && <p className="mt-2 text-xs text-muted-foreground">{inviteMsg}</p>}

          <div className="mt-4 space-y-1">
            {members?.members.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent">{m.email[0].toUpperCase()}</div>
                  <div>
                    <span className="font-medium">{m.email}</span>
                    {m.id === members.you && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] uppercase ${m.role === 'owner' ? 'bg-accent/10 text-accent' : 'bg-black/5 text-muted-foreground'}`}>{m.role}</span>
                  </div>
                </div>
                {me?.user?.role === 'owner' && m.id !== members.you && (
                  <div className="flex items-center gap-2 text-xs">
                    {m.role === 'member' ? (
                      <button onClick={() => memberAction(m.id, 'promote')} className="text-muted-foreground hover:text-foreground">Make admin</button>
                    ) : m.role === 'admin' ? (
                      <button onClick={() => memberAction(m.id, 'demote')} className="text-muted-foreground hover:text-foreground">Make member</button>
                    ) : null}
                    <button onClick={() => memberAction(m.id, 'transfer')} className="text-muted-foreground hover:text-foreground">Transfer</button>
                    <button onClick={() => memberAction(m.id, 'remove')} className="text-accent hover:underline">Remove</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Wallet */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="glass rounded-2xl p-5 md:col-span-1">
            <div className="label-mono text-[10px] uppercase text-muted-foreground">Balance</div>
            {wallet?.trialDaysLeft > 0 ? (
              <>
                <div className="font-display text-4xl font-medium text-accent">Unlimited</div>
                <div className="text-xs text-muted-foreground">during your free trial</div>
              </>
            ) : (
              <>
                <div className="font-display text-4xl font-medium">{wallet?.balance ?? '-'}</div>
                <div className="text-xs text-muted-foreground">credits</div>
              </>
            )}
            <div className="mt-3 text-xs text-muted-foreground">
              Plan: <b className="text-foreground capitalize">{wallet?.plan}</b>
              {wallet?.trialDaysLeft > 0 && ` · ${wallet.trialDaysLeft} day${wallet.trialDaysLeft === 1 ? '' : 's'} left, everything free`}
            </div>
            <div className="mt-4">
              <label className="text-xs text-muted-foreground">Top up</label>
              <div className="mt-1 flex gap-2">
                <input
                  type="number"
                  value={topup}
                  onChange={(e) => setTopup(parseInt(e.target.value || '0', 10))}
                  className="w-24 rounded-lg border border-border bg-white/60 px-2 py-1.5 text-sm"
                />
                <button onClick={doTopup} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white">
                  Buy credits
                </button>
              </div>
              {msg && <p className="mt-2 text-xs text-muted-foreground">{msg}</p>}
              <p className="mt-1 text-[10px] text-muted-foreground">Razorpay checkout is the one pending integration.</p>
            </div>
          </div>

          {/* Usage summary */}
          <div className="glass rounded-2xl p-5 md:col-span-2">
            <h3 className="font-display text-lg font-medium">Usage</h3>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(usage?.byKind || []).map((k: any) => (
                <div key={k.kind} className="rounded-xl border border-border/60 px-3 py-2">
                  <div className="label-mono text-[10px] uppercase text-muted-foreground">{k.kind}</div>
                  <div className="text-sm font-semibold">{k._sum.credits ?? 0} cr</div>
                  <div className="text-[10px] text-muted-foreground">{k._count} calls</div>
                </div>
              ))}
              {(!usage?.byKind || usage.byKind.length === 0) && <p className="text-xs text-muted-foreground">No usage yet.</p>}
            </div>
            <div className="mt-4 max-h-40 space-y-1 overflow-auto">
              {(usage?.events || []).slice(0, 20).map((e: any) => (
                <div key={e.id} className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{e.kind} {e.model ? `· ${e.model}` : ''}</span>
                  <span>-{e.credits} cr</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* API keys */}
        <div className="glass rounded-2xl p-5">
          <h3 className="font-display text-lg font-medium">API keys &amp; AI connectors</h3>
          <p className="mt-1 text-xs text-muted-foreground">Use these to call the ArrowLabs API, or connect Claude / ChatGPT / Cursor directly (MCP).</p>
          <div className="mt-3 flex gap-2">
            <input value={keyName} onChange={(e) => setKeyName(e.target.value)} className="flex-1 rounded-lg border border-border bg-white/60 px-3 py-1.5 text-sm" />
            <button onClick={createKey} className="rounded-lg bg-foreground px-3 py-1.5 text-sm font-semibold text-background">Create key</button>
          </div>
          {newKey && (
            <div className="mt-3 space-y-3">
              <div className="rounded-lg border border-accent/40 bg-accent/5 p-3">
                <div className="text-xs text-accent">Copy this now - it won&apos;t be shown again:</div>
                <code className="mt-1 block break-all text-xs">{newKey}</code>
              </div>
              <div className="rounded-lg border border-border/60 bg-white/60 p-3">
                <div className="text-xs font-semibold">Connect to Claude / ChatGPT (MCP)</div>
                <p className="mt-1 text-[11px] text-muted-foreground">In Claude → Settings → Connectors → Add custom connector. Name it &quot;ArrowLabs&quot; and paste this as the Remote MCP server URL (no OAuth needed):</p>
                <code className="mt-2 block break-all rounded bg-black/[0.04] p-2 text-[11px]">{mcpBase}/api/mcp/{newKey}</code>
              </div>
            </div>
          )}
          <div className="mt-3 space-y-2">
            {keys.map((k) => (
              <div key={k.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm">
                <div>
                  <span className="font-medium">{k.name}</span>{' '}
                  <code className="label-mono text-xs text-muted-foreground">{k.prefix}…</code>
                </div>
                <button onClick={() => revokeKey(k.id)} className="text-xs text-accent hover:underline">Revoke</button>
              </div>
            ))}
            {keys.length === 0 && <p className="text-xs text-muted-foreground">No API keys yet.</p>}
          </div>

          {/* Always-visible MCP connect guide */}
          <div className="mt-4 rounded-xl border border-border/60 bg-white/50 p-4">
            <div className="text-xs font-semibold">Connect ArrowLabs to Claude / ChatGPT (MCP)</div>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-[11px] text-muted-foreground">
              <li>Create an API key above (copy it - shown once).</li>
              <li>In Claude → Settings → Connectors → Add custom connector. Name it <b>ArrowLabs</b>.</li>
              <li>Paste this as the Remote MCP server URL (no OAuth):</li>
            </ol>
            <code className="mt-2 block break-all rounded bg-black/[0.04] p-2 text-[11px]">{mcpBase}/api/mcp/&lt;your-api-key&gt;</code>
            <p className="mt-2 text-[11px] text-muted-foreground">Then ask Claude: <i>&quot;scrape product B0DJQQWBS4&quot;</i> or <i>&quot;optimize this ASIN for Amazon&quot;</i>. Tools: scrape_product, optimize_listing, generate_creatives, get_campaign, list_campaigns.</p>
          </div>
        </div>
      </main>
    </Shell>
  )
}
