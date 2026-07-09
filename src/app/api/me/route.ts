import { NextRequest } from 'next/server'
import { ok } from '@/lib/api'
import { resolveActor } from '@/lib/session'
import { getHealth, config } from '@/lib/config'
import { CREDIT_COSTS } from '@/lib/credits'

// Current actor summary - powers the studio/account header (plan, credits, trial).
export async function GET(req: NextRequest) {
  const actor = await resolveActor(req)
  const imageModels = Object.entries(config.azure.image.models).map(([key, v]: [string, any]) => ({ key, label: v.label }))
  return ok({
    authenticated: !!actor,
    user: actor
      ? {
          email: actor.email,
          role: actor.role,
          orgId: actor.orgId,
          domain: actor.domain,
          plan: actor.plan,
          trialEndsAt: actor.trialEndsAt,
          trialDaysLeft: actor.trialDaysLeft,
          credits: actor.balance,
          canGenerate: actor.canGenerate,
        }
      : null,
    health: getHealth(),
    creditCosts: CREDIT_COSTS,
    imageModels,
  })
}
