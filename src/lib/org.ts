// Organization logic - companies keyed by email domain.
// The free trial is granted ONCE per domain: the first user to sign up from a
// company creates the org and starts the trial; teammates join the same org and
// share its plan + credits (no fresh trial).

import { db } from '@/lib/db'
import { config } from '@/lib/config'
import { grantCredits, getOrCreateWallet } from '@/lib/credits'
import { domainOf, companyNameFromDomain } from '@/lib/domains'

// Find or create the org for a user's email domain, link the user, and start the
// trial only if this is a brand-new company. Idempotent.
export async function provisionUserOrg(userId: string, email: string) {
  const domain = domainOf(email)
  if (!domain) throw new Error('Cannot provision org: no email domain')

  const existing = await db.organization.findUnique({ where: { domain } })

  if (existing) {
    // Company already exists - user joins as a member. No new trial.
    await db.user.update({ where: { id: userId }, data: { orgId: existing.id } })
    await getOrCreateWallet(existing.id)
    return { org: existing, isNewOrg: false }
  }

  // New company - first user becomes owner and the trial starts here (once).
  const trialEndsAt = new Date(Date.now() + config.billing.trialDays * 24 * 60 * 60 * 1000)
  const org = await db.organization.create({
    data: {
      domain,
      name: companyNameFromDomain(domain),
      plan: 'trial',
      trialUsed: true,
      trialStartedAt: new Date(),
      trialEndsAt,
    },
  })
  await db.user.update({ where: { id: userId }, data: { orgId: org.id, role: 'owner' } })
  await getOrCreateWallet(org.id)
  await grantCredits(org.id, config.billing.trialCredits, 'grant', 'Company trial credits', {
    domain,
    trialDays: config.billing.trialDays,
  })
  return { org, isNewOrg: true }
}

export async function getOrgForUser(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId }, include: { org: true } })
  return user?.org ?? null
}

export async function updateOrg(orgId: string, data: { name?: string; website?: string; brandName?: string; brandData?: any }) {
  return db.organization.update({ where: { id: orgId }, data })
}
