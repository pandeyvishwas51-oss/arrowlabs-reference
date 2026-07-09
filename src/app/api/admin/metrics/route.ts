import { NextRequest } from 'next/server'
import { ok, requireAdmin, wrapError } from '@/lib/api'
import { db } from '@/lib/db'
import { getHealth } from '@/lib/config'

// Bucket a list of dates into the last N days (YYYY-MM-DD -> count).
function byDay(dates: Date[], days = 14) {
  const buckets: Record<string, number> = {}
  const now = Date.now()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * 86400000).toISOString().slice(0, 10)
    buckets[d] = 0
  }
  for (const dt of dates) {
    const key = new Date(dt).toISOString().slice(0, 10)
    if (key in buckets) buckets[key]++
  }
  return Object.entries(buckets).map(([date, count]) => ({ date: date.slice(5), count }))
}

export async function GET(req: NextRequest) {
  const res = await requireAdmin(req)
  if ('error' in res) return res.error
  try {
    const since14 = new Date(Date.now() - 14 * 86400000)
    const todayStart = new Date(new Date().toISOString().slice(0, 10))

    const [
      users, orgs, campaigns, assetsTotal, assetsRendered, subscribers,
      creditGrants, creditDebits, activeTrials, paidOrgs,
      pageviewsTotal, pageviewsToday, signupsTotal, signinsTotal,
      recentUsers, recentOrgs, usageByKind, recentEvents,
      signupDates, signinDates, pageviewDates, campaignDates,
    ] = await Promise.all([
      db.user.count(),
      db.organization.count(),
      db.campaign.count(),
      db.asset.count(),
      db.asset.count({ where: { OR: [{ imageUrl: { not: null } }, { videoUrl: { not: null } }] } }),
      db.subscriber.count(),
      db.creditTransaction.aggregate({ _sum: { amount: true }, where: { type: 'grant' } }),
      db.creditTransaction.aggregate({ _sum: { amount: true }, where: { type: 'debit' } }),
      db.organization.count({ where: { plan: 'trial', trialEndsAt: { gt: new Date() } } }),
      db.organization.count({ where: { plan: { in: ['pro', 'agency'] } } }),
      db.event.count({ where: { type: 'pageview' } }),
      db.event.count({ where: { type: 'pageview', createdAt: { gte: todayStart } } }),
      db.event.count({ where: { type: 'signup' } }),
      db.event.count({ where: { type: 'signin' } }),
      db.user.findMany({ orderBy: { createdAt: 'desc' }, take: 25, include: { org: { select: { domain: true, plan: true } } } }),
      db.organization.findMany({ orderBy: { createdAt: 'desc' }, take: 25, include: { wallet: true, _count: { select: { users: true } } } }),
      db.usageEvent.groupBy({ by: ['kind'], _sum: { credits: true }, _count: true }),
      db.event.findMany({ where: { type: { in: ['signin', 'signup'] } }, orderBy: { createdAt: 'desc' }, take: 30 }),
      db.event.findMany({ where: { type: 'signup', createdAt: { gte: since14 } }, select: { createdAt: true } }),
      db.event.findMany({ where: { type: 'signin', createdAt: { gte: since14 } }, select: { createdAt: true } }),
      db.event.findMany({ where: { type: 'pageview', createdAt: { gte: since14 } }, select: { createdAt: true } }),
      db.campaign.findMany({ where: { createdAt: { gte: since14 } }, select: { createdAt: true } }),
    ])

    return ok({
      kpis: {
        users, orgs, campaigns, assetsTotal, assetsRendered, subscribers,
        activeTrials, paidOrgs,
        creditsGranted: creditGrants._sum.amount || 0,
        creditsSpent: Math.abs(creditDebits._sum.amount || 0),
        pageviewsTotal, pageviewsToday, signupsTotal, signinsTotal,
      },
      series: {
        signups: byDay(signupDates.map((x) => x.createdAt)),
        signins: byDay(signinDates.map((x) => x.createdAt)),
        pageviews: byDay(pageviewDates.map((x) => x.createdAt)),
        campaigns: byDay(campaignDates.map((x) => x.createdAt)),
      },
      usageByKind: usageByKind.map((k) => ({ kind: k.kind, credits: k._sum.credits || 0, count: k._count })),
      recentUsers: recentUsers.map((u) => ({ email: u.email, role: u.role, domain: u.org?.domain, plan: u.org?.plan, createdAt: u.createdAt })),
      recentOrgs: recentOrgs.map((o) => ({ domain: o.domain, plan: o.plan, members: o._count.users, balance: o.wallet?.balance ?? 0, spent: o.wallet?.lifetimeSpent ?? 0, trialEndsAt: o.trialEndsAt, createdAt: o.createdAt })),
      recentActivity: recentEvents.map((e) => ({ type: e.type, meta: e.meta, createdAt: e.createdAt })),
      health: getHealth(),
    })
  } catch (err) {
    return wrapError('api.admin.metrics', err)
  }
}
