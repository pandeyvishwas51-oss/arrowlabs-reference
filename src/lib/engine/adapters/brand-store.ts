// BrandStore adapter. Reads brand identity from the existing Organization record
// (brandName + brandData JSON). Read-only, so it is completely safe. Until the v2
// Brand tables exist, brandId is interpreted as the orgId, which matches the current
// one-brand-per-org model. When the v2 schema lands, only this file changes.

import type { BrandInputs, BrandStore } from '@/core'
import { db } from '@/lib/db'

export function createBrandStore(): BrandStore {
  return {
    async get(brandId: string): Promise<BrandInputs | null> {
      const org = await db.organization.findUnique({ where: { id: brandId } }).catch(() => null)
      if (!org) return null

      const bd = (org.brandData ?? {}) as Record<string, any>
      const colors = (bd.colors ?? {}) as Record<string, any>
      const fonts = (bd.fonts ?? {}) as Record<string, any>

      return {
        brandId,
        name: org.brandName || org.name || 'Brand',
        logoUrl: bd.logoUrl || bd.logo || undefined,
        colors: {
          primary: colors.primary || bd.primaryColor || undefined,
          secondary: colors.secondary || bd.secondaryColor || undefined,
          accent: colors.accent || bd.accentColor || undefined,
          neutrals: Array.isArray(colors.neutrals) ? colors.neutrals : undefined,
        },
        fonts: {
          display: fonts.display || bd.displayFont || undefined,
          body: fonts.body || bd.bodyFont || undefined,
        },
        voice: bd.voice || bd.tone || undefined,
        compliance: Array.isArray(bd.compliance?.forbidden)
          ? { forbidden: bd.compliance.forbidden, toneRules: bd.compliance.toneRules }
          : undefined,
      }
    },
  }
}
