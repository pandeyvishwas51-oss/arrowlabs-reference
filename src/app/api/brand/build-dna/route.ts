// Brand DNA endpoint. A brand manager posts a D2C site URL, a brand or product
// name, and optionally image URLs; we build the Brand DNA and merge it into the
// org's brandData so every future generation reads it. Additive and safe: it only
// writes brand data, and merges rather than overwrites.

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { buildBrandDna, dnaToBrandData } from '@/lib/engine/brand-dna'
import { ok, fail, parseBody, guardRate, requireActor, wrapError } from '@/lib/api'
import { db } from '@/lib/db'

export const maxDuration = 120

const schema = z
  .object({
    siteUrl: z.string().trim().max(300).optional(),
    brandName: z.string().trim().max(120).optional(),
    productName: z.string().trim().max(200).optional(),
    images: z.array(z.string().url()).max(8).optional(),
    save: z.boolean().optional(), // default true
  })
  .refine((d) => d.siteUrl || d.brandName || d.productName, {
    message: 'Provide at least one of siteUrl, brandName, or productName',
  })

export async function POST(req: NextRequest) {
  const limited = guardRate(req, 'orchestrate')
  if (limited) return limited

  const parsed = await parseBody(req, schema)
  if ('error' in parsed) return parsed.error
  const body = parsed.data

  const res = await requireActor(req)
  if ('error' in res) return res.error
  const { orgId } = res.actor

  try {
    const dna = await buildBrandDna({
      siteUrl: body.siteUrl,
      brandName: body.brandName,
      productName: body.productName,
      images: body.images,
    })

    if (body.save !== false && orgId) {
      const org = await db.organization.findUnique({ where: { id: orgId } }).catch(() => null)
      const existing = (org?.brandData ?? {}) as Record<string, unknown>
      const merged = { ...existing, ...dnaToBrandData(dna) }
      await db.organization
        .update({
          where: { id: orgId },
          data: { brandData: merged as any, brandName: org?.brandName || dna.brandName },
        })
        .catch(() => {})
    }

    return ok({ dna, saved: body.save !== false })
  } catch (err) {
    return wrapError('api.brand.build-dna', err)
  }
}
