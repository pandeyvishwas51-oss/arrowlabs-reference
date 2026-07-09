// Marketplace guideline packs + region packs.
//
// Single source of truth for per-platform listing/image/video rules and
// per-region model localization. Pure data + tiny helpers — additive and safe:
// nothing here mutates existing flows. The image/content pipeline reads these to
// generate assets that are correct for the chosen platform AND show the right
// people for the chosen region (e.g. Indian models for India, not foreigners).
//
// Numbers compiled from the marketplace guideline docs (Amazon India, Flipkart,
// Myntra, Noon GCC, Namshi GCC — July 2026). Confirm live specs before a bulk
// push; treat these as the working defaults.

export type PlatformId = 'amazon_in' | 'flipkart' | 'myntra' | 'noon' | 'namshi'
export type RegionId = 'IN' | 'GCC'
export type AspectRatio = '1:1' | '3:4' | '4:5' | '16:9' | '9:16'
export type APlusSize = 'basic' | 'premium'

export type PlatformPack = {
  id: PlatformId
  label: string
  region: RegionId
  // Image rules
  image: {
    aspectRatio: AspectRatio
    minLongSidePx: number
    recommendedPx: string
    maxImages: number
    minImages: number
    mainBackground: string // e.g. "pure white #FFFFFF"
    frameFillPct: number
    onModelRequired: boolean // apparel: model shots mandatory (Myntra/Namshi)
  }
  // A+ / enhanced-content module sizes (px). Basic is the free tier default.
  aPlus: {
    supported: boolean
    basic?: string // "970x600"
    premium?: string
    banner?: string[]
    maxSliceKB?: number // Noon rich-card slice cap
  }
  // Content field limits
  content: {
    titleMax: number
    titleStructure: string
    highlightsMax?: number // Amazon Item Highlights
    bulletCount: number
    bulletMaxChars: number
    descriptionMax: number
    keywordSlots?: number
    bilingual?: boolean // EN + AR for GCC
  }
  // Video rules
  video: {
    aspectRatio: AspectRatio
    minSeconds: number
    maxSeconds: number
    formats: string[]
    // Whether the marketplace accepts product video (all 5 do today; Amazon needs
    // brand registry). Gate generation on this so we never render an unusable clip.
    allowed?: boolean
  }
}

export type RegionPack = {
  id: RegionId
  label: string
  // Directive appended to any image prompt that contains a human, so the model
  // renders people that match the target shopper — no more manual per-image fixes.
  modelDirective: string
  contextDirective: string
  languages: string[]
}

export const REGIONS: Record<RegionId, RegionPack> = {
  IN: {
    id: 'IN',
    label: 'India',
    modelDirective:
      'Any human shown must be Indian (South Asian) — authentic Indian skin tones, features, and hair. Natural, relatable Indian people, not Western/foreign models.',
    contextDirective:
      'Indian home and lifestyle context; settings, décor and styling that feel true to Indian households.',
    languages: ['en'],
  },
  GCC: {
    id: 'GCC',
    label: 'GCC (Gulf)',
    modelDirective:
      'Any human shown must be Middle-Eastern / Gulf Arab — appropriate skin tones and features, modest styling suitable for GCC markets.',
    contextDirective:
      'Gulf/Middle-Eastern lifestyle context; settings and styling suited to UAE/KSA households.',
    languages: ['en', 'ar'],
  },
}

export const PLATFORMS: Record<PlatformId, PlatformPack> = {
  amazon_in: {
    id: 'amazon_in',
    label: 'Amazon India',
    region: 'IN',
    image: {
      aspectRatio: '1:1',
      minLongSidePx: 1000,
      recommendedPx: '2000x2000',
      maxImages: 9,
      minImages: 5,
      mainBackground: 'pure white RGB(255,255,255)',
      frameFillPct: 85,
      onModelRequired: false,
    },
    aPlus: { supported: true, basic: '970x600', premium: '1464x600', banner: ['970x300', '1464x600'] },
    content: {
      titleMax: 75,
      titleStructure: 'Brand first, then product type + key attributes',
      highlightsMax: 125,
      bulletCount: 5,
      bulletMaxChars: 200,
      descriptionMax: 2000,
      keywordSlots: 0,
    },
    video: { aspectRatio: '16:9', minSeconds: 25, maxSeconds: 35, formats: ['mp4', 'mov'] },
  },
  flipkart: {
    id: 'flipkart',
    label: 'Flipkart',
    region: 'IN',
    image: {
      aspectRatio: '1:1',
      minLongSidePx: 1000,
      recommendedPx: '1000x1000',
      maxImages: 8,
      minImages: 2,
      mainBackground: 'plain white or light solid',
      frameFillPct: 85,
      onModelRequired: false,
    },
    aPlus: { supported: true, basic: '970x600' },
    content: {
      titleMax: 80,
      titleStructure: 'Brand + Product Type + Key Attribute(s) + Feature',
      bulletCount: 5,
      bulletMaxChars: 150,
      descriptionMax: 2000,
      keywordSlots: 5,
    },
    video: { aspectRatio: '16:9', minSeconds: 10, maxSeconds: 60, formats: ['mp4'] },
  },
  myntra: {
    id: 'myntra',
    label: 'Myntra',
    region: 'IN',
    image: {
      aspectRatio: '3:4',
      minLongSidePx: 1440,
      recommendedPx: '1500x2000',
      maxImages: 7,
      minImages: 4,
      mainBackground: 'pure white or near-white neutral',
      frameFillPct: 85,
      onModelRequired: true,
    },
    aPlus: { supported: false },
    content: {
      titleMax: 60,
      titleStructure: 'Product type, brand, size, material, colour (auto-framed from attributes)',
      bulletCount: 5,
      bulletMaxChars: 150,
      descriptionMax: 1000,
    },
    video: { aspectRatio: '3:4', minSeconds: 15, maxSeconds: 30, formats: ['mp4'] },
  },
  noon: {
    id: 'noon',
    label: 'Noon (GCC)',
    region: 'GCC',
    image: {
      aspectRatio: '1:1',
      minLongSidePx: 1000,
      recommendedPx: '1200x1200',
      maxImages: 8,
      minImages: 3,
      mainBackground: 'pure white (light grey for fashion)',
      frameFillPct: 85,
      onModelRequired: false,
    },
    aPlus: { supported: true, basic: '970x600', maxSliceKB: 200 },
    content: {
      titleMax: 200,
      titleStructure: 'Sentence case; include product type/sub-type; no special chars',
      bulletCount: 5,
      bulletMaxChars: 250,
      descriptionMax: 2000,
      bilingual: true,
    },
    video: { aspectRatio: '16:9', minSeconds: 15, maxSeconds: 60, formats: ['mp4'] },
  },
  namshi: {
    id: 'namshi',
    label: 'Namshi (GCC)',
    region: 'GCC',
    image: {
      aspectRatio: '3:4',
      minLongSidePx: 1200,
      recommendedPx: '1500x2000',
      maxImages: 6,
      minImages: 3,
      mainBackground: 'clean catalog-style, consistent lighting',
      frameFillPct: 85,
      onModelRequired: true,
    },
    aPlus: { supported: false },
    content: {
      titleMax: 120,
      titleStructure: 'Clear descriptive EN title; concise, keyword-relevant',
      bulletCount: 5,
      bulletMaxChars: 200,
      descriptionMax: 2000,
      bilingual: true,
    },
    video: { aspectRatio: '9:16', minSeconds: 15, maxSeconds: 60, formats: ['mp4'] },
  },
}

export const PLATFORM_LIST = Object.values(PLATFORMS)

export function getPlatform(id?: string | null): PlatformPack {
  return (id && PLATFORMS[id as PlatformId]) || PLATFORMS.amazon_in
}

export function getRegion(id?: string | null): RegionPack {
  return (id && REGIONS[id as RegionId]) || REGIONS.IN
}

// Region directive for image prompts (localizes any humans shown). Returns '' if
// no localization needed. Safe to append to any prompt string.
export function localizationDirective(regionId?: string | null): string {
  const r = getRegion(regionId)
  return `${r.modelDirective} ${r.contextDirective}`.trim()
}
