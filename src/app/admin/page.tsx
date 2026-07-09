'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Users, Building2, Layers, Image as ImageIcon, TrendingUp, Eye, UserPlus, LogIn } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Shell, Card } from '@/components/app/shell'

export default function AdminPage() {
  const { data: session, status } = useSession()
  const isAdmin = (session?.user as any)?.role === 'admin'
  const [m, setM] = useState<any>(null)

  useEffect(() => {
    if (isAdmin) fetch('/api/admin/metrics').then((x) => x.json()).then((r) => { if (r.ok) setM(r.data) })
  }, [isAdmin])

  if (status === 'loading') return <div className="p-10 text-center text-sm text-muted-foreground">Loading...</div>
  if (!isAdmin) {
    return (
      <Shell title="Admin">
        <div className="mx-auto mt-20 max-w-md text-center">
          <h1 className="font-display text-2xl font-medium">Admin access required</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in with an email listed in <code className="label-mono">ADMIN_EMAILS</code>.</p>
          <Link href="/login" className="mt-4 inline-block rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white">Sign in</Link>
        </div>
      </Shell>
    )
  }

  const k = m?.kpis || {}
  const s = m?.series || {}

  return (
    <Shell title="Admin analytics">
      {/* KPI row */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
        <Kpi icon={Users} label="Users" value={k.users} color="var(--accent)" />
        <Kpi icon={Building2} label="Companies" value={k.orgs} color="#E8845A" />
        <Kpi icon={UserPlus} label="Signups" value={k.signupsTotal} color="#8BAF8C" />
        <Kpi icon={LogIn} label="Sign-ins" value={k.signinsTotal} color="#9B7ED6" />
        <Kpi icon={Eye} label="Pageviews" value={k.pageviewsTotal} sub={`${k.pageviewsToday ?? 0} today`} color="#4A9DD6" />
        <Kpi icon={Layers} label="Campaigns" value={k.campaigns} color="#D69B4A" />
        <Kpi icon={ImageIcon} label="Assets rendered" value={`${k.assetsRendered ?? 0}/${k.assetsTotal ?? 0}`} color="#C8607A" />
        <Kpi icon={TrendingUp} label="Credits spent" value={k.creditsSpent} sub={`${k.creditsGranted ?? 0} granted`} color="var(--accent)" />
        <Kpi icon={Building2} label="Active trials" value={k.activeTrials} color="#8BAF8C" />
        <Kpi icon={Building2} label="Paid orgs" value={k.paidOrgs} color="#E8845A" />
        <Kpi icon={Users} label="Subscribers" value={k.subscribers} color="#9B7ED6" />
      </div>

      {/* Charts */}
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 font-display text-base font-semibold">Traffic & signups (14d)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={mergeSeries(s.pageviews, s.signups, s.signins)}>
              <defs>
                <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4A9DD6" stopOpacity={0.3} /><stop offset="100%" stopColor="#4A9DD6" stopOpacity={0} /></linearGradient>
                <linearGradient id="gs" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity={0.3} /><stop offset="100%" stopColor="var(--accent)" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#00000008" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#0000004d" />
              <YAxis tick={{ fontSize: 10 }} stroke="#0000004d" width={28} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #eee', fontSize: 12 }} />
              <Area type="monotone" dataKey="pageviews" stroke="#4A9DD6" fill="url(#gv)" strokeWidth={2} />
              <Area type="monotone" dataKey="signups" stroke="var(--accent)" fill="url(#gs)" strokeWidth={2} />
              <Area type="monotone" dataKey="signins" stroke="#8BAF8C" fillOpacity={0} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <h3 className="mb-3 font-display text-base font-semibold">Usage by type (credits)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={m?.usageByKind || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#00000008" />
              <XAxis dataKey="kind" tick={{ fontSize: 10 }} stroke="#0000004d" />
              <YAxis tick={{ fontSize: 10 }} stroke="#0000004d" width={28} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #eee', fontSize: 12 }} />
              <Bar dataKey="credits" fill="var(--accent)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 font-display text-base font-semibold">Recent users</h3>
          <div className="max-h-80 space-y-1 overflow-auto">
            {(m?.recentUsers || []).map((u: any, i: number) => (
              <div key={i} className="flex items-center justify-between border-b border-black/5 py-1.5 text-sm">
                <span className="truncate">{u.email}</span>
                <span className="ml-2 flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                  <span className="label-mono">{u.domain || '-'}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] ${u.role === 'owner' || u.role === 'admin' ? 'bg-accent/10 text-accent' : 'bg-black/5'}`}>{u.role}</span>
                </span>
              </div>
            ))}
            {!m?.recentUsers?.length && <p className="text-xs text-muted-foreground">No users yet.</p>}
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="mb-3 font-display text-base font-semibold">Companies</h3>
          <div className="max-h-80 space-y-1 overflow-auto">
            {(m?.recentOrgs || []).map((o: any, i: number) => (
              <div key={i} className="flex items-center justify-between border-b border-black/5 py-1.5 text-sm">
                <span className="label-mono truncate text-xs">{o.domain}</span>
                <span className="ml-2 flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                  <span>{o.members} member{o.members === 1 ? '' : 's'}</span>
                  <span>{o.balance} cr</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] ${o.plan === 'trial' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{o.plan}</span>
                </span>
              </div>
            ))}
            {!m?.recentOrgs?.length && <p className="text-xs text-muted-foreground">No companies yet.</p>}
          </div>
        </Card>
        <Card className="p-5 lg:col-span-2">
          <h3 className="mb-3 font-display text-base font-semibold">Recent activity (sign-ins & sign-ups)</h3>
          <div className="max-h-64 space-y-1 overflow-auto">
            {(m?.recentActivity || []).map((e: any, i: number) => (
              <div key={i} className="flex items-center justify-between border-b border-black/5 py-1.5 text-xs">
                <span className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] ${e.type === 'signup' ? 'bg-emerald-50 text-emerald-700' : 'bg-black/5 text-muted-foreground'}`}>{e.type}</span>
                  <span className="text-muted-foreground">{e.meta?.method || ''}</span>
                </span>
                <span className="text-muted-foreground">{new Date(e.createdAt).toLocaleString()}</span>
              </div>
            ))}
            {!m?.recentActivity?.length && <p className="text-xs text-muted-foreground">No activity yet.</p>}
          </div>
        </Card>
      </div>
    </Shell>
  )
}

function Kpi({ icon: Icon, label, value, sub, color }: any) {
  return (
    <Card className="p-4">
      <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: `color-mix(in oklab, ${color} 14%, white)`, color }}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="mt-2.5 font-display text-2xl font-semibold tracking-tight">{value ?? '-'}</div>
      <div className="label-mono text-[10px] uppercase text-muted-foreground">{label}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </Card>
  )
}

function mergeSeries(pv: any[] = [], su: any[] = [], si: any[] = []) {
  return (pv || []).map((row, i) => ({
    date: row.date,
    pageviews: row.count,
    signups: su[i]?.count ?? 0,
    signins: si[i]?.count ?? 0,
  }))
}
