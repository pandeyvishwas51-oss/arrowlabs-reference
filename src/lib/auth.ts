// NextAuth configuration - passwordless email magic-link, company-only.
// - PrismaAdapter + database sessions (required for the Email provider)
// - Only company (corporate) email domains may sign in; public providers blocked
// - New companies get 7 days completely free (unlimited), ONCE per domain

import type { NextAuthOptions } from 'next-auth'
import EmailProvider from 'next-auth/providers/email'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { db } from '@/lib/db'
import { config } from '@/lib/config'
import { getBalance, planStatus } from '@/lib/credits'
import { provisionUserOrg } from '@/lib/org'
import { isCompanyEmail } from '@/lib/domains'
import { sendEmail, magicLinkEmail, welcomeEmail } from '@/lib/email'
import { logError } from '@/lib/logger'
import { track } from '@/lib/analytics'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as any,
  secret: config.auth.secret,
  session: { strategy: 'database', maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: '/login', verifyRequest: '/login?sent=1', error: '/login' },
  providers: [
    EmailProvider({
      maxAge: 24 * 60 * 60,
      from: config.resend.from,
      sendVerificationRequest: async ({ identifier, url }) => {
        const { subject, html, text } = magicLinkEmail(url)
        await sendEmail({ to: identifier, subject, html, text })
      },
    }),
    // "Continue with Google" - only registered when OAuth creds are configured.
    ...(config.auth.google.clientId && config.auth.google.clientSecret
      ? [
          GoogleProvider({
            clientId: config.auth.google.clientId,
            clientSecret: config.auth.google.clientSecret,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],
  callbacks: {
    // Gate sign-in to company domains. Fires on both send + verify for email.
    async signIn({ user }) {
      if (!isCompanyEmail(user?.email || '')) {
        // Reject public/free/disposable domains - redirect to an explanatory error.
        return '/login?error=company_only'
      }
      return true
    },
    async session({ session, user }) {
      const u = user as any
      // Platform admin only (NOT company owners) - the admin panel is global.
      const isAdmin =
        u.role === 'admin' || config.auth.adminEmails.includes((u.email || '').toLowerCase())
      const org = u.orgId ? await db.organization.findUnique({ where: { id: u.orgId } }) : null
      const balance = org ? await getBalance(org.id) : 0
      const status = planStatus({ plan: org?.plan || 'expired', trialEndsAt: org?.trialEndsAt || null }, balance)
      ;(session.user as any).id = u.id
      ;(session.user as any).role = isAdmin ? 'admin' : u.role
      ;(session.user as any).orgId = org?.id || null
      ;(session.user as any).orgName = org?.name || null
      ;(session.user as any).domain = org?.domain || null
      ;(session.user as any).plan = org?.plan || 'expired'
      ;(session.user as any).trialEndsAt = org?.trialEndsAt || null
      ;(session.user as any).credits = balance
      ;(session.user as any).trialDaysLeft = status.trialDaysLeft
      ;(session.user as any).canGenerate = status.canGenerate
      return session
    },
  },
  events: {
    // Fires once, when a brand-new user row is created (already passed signIn gate).
    async createUser({ user }) {
      try {
        // The adapter may create a user before the signIn gate runs. If this is
        // not a company email, remove the orphan row instead of provisioning.
        if (!isCompanyEmail(user.email || '')) {
          await db.user.delete({ where: { id: user.id } }).catch(() => {})
          return
        }
        if (config.auth.adminEmails.includes((user.email || '').toLowerCase())) {
          await db.user.update({ where: { id: user.id }, data: { role: 'admin' } })
        }
        const { isNewOrg } = await provisionUserOrg(user.id, user.email!)
        if (isNewOrg) {
          const { subject, html, text } = welcomeEmail(config.billing.trialDays, config.billing.trialCredits)
          await sendEmail({ to: user.email!, subject, html, text })
        }
        await track({ type: 'signup', userId: user.id, meta: { method: 'magic-link' } })
      } catch (e) {
        await logError('auth.createUser', e, { userId: user.id })
      }
    },
    async signIn({ user, isNewUser }) {
      if (!isNewUser) await track({ type: 'signin', userId: (user as any).id, meta: { method: 'magic-link' } })
    },
  },
}
