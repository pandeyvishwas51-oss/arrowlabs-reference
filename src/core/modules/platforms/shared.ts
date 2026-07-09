// Per-marketplace IDQ rule sets. Each marketplace is graded on the dimensions IT
// actually weighs, with its own weights. Amazon leans on backend terms and A+; Flipkart
// on attribute-rich descriptions and many white-background images; Myntra on 3:4 model
// imagery and clean, brand-free titles. Weights within each set sum to 100.
//
// NOTE (review-meeting caveat): these are our approximation of each marketplace's data
// quality grade. Reconcile against a real score for a known listing before presenting it
// as authoritative. Deep copy-level rules (title length, forbidden chars, backend byte
// budget, no-brand titles) live in scoreListingQuality, which reads each PlatformSpec.

import type { IdqRule } from '../../contracts/platform'

// Amazon: title front-load, five bullets, backend terms, A+, image count, video.
export const AMAZON_IDQ: IdqRule[] = [
  { key: 'title.brand', label: 'Title leads with brand and keyword', weight: 10 },
  { key: 'title.length', label: 'Title within limit', weight: 6 },
  { key: 'title.clean', label: 'Title free of promo and forbidden characters', weight: 6 },
  { key: 'bullets.count', label: 'Five bullet points', weight: 10 },
  { key: 'bullets.length', label: 'Bullets within indexed length', weight: 6 },
  { key: 'features.count', label: 'Five key features', weight: 6 },
  { key: 'description', label: 'Rich description', weight: 8 },
  { key: 'aplus.modules', label: 'A+ modules present', weight: 12 },
  { key: 'image.main', label: 'Main image on white', weight: 8 },
  { key: 'image.count', label: 'Seven or more images', weight: 12 },
  { key: 'searchTerms', label: 'Backend search terms filled', weight: 8 },
  { key: 'video', label: 'Product video present', weight: 4 },
  { key: 'mobile.readable', label: 'Images readable on mobile', weight: 4 },
]

// Flipkart: attribute-driven title, many white-bg images, rich accurate description.
// No A+ module count, backend terms are just 3 words so lightly weighted.
export const FLIPKART_IDQ: IdqRule[] = [
  { key: 'title.brand', label: 'Title leads with brand and product type', weight: 12 },
  { key: 'title.length', label: 'Title within limit', weight: 6 },
  { key: 'title.clean', label: 'Title free of caps and symbols', weight: 6 },
  { key: 'bullets.count', label: 'Feature bullets present', weight: 10 },
  { key: 'features.count', label: 'Key features listed', weight: 8 },
  { key: 'description', label: 'Detailed 1000-char description matching images', weight: 16 },
  { key: 'image.main', label: 'White-background primary image', weight: 12 },
  { key: 'image.count', label: 'Multiple images (up to 13)', weight: 16 },
  { key: 'searchTerms', label: 'Three backend keywords, no brand', weight: 4 },
  { key: 'mobile.readable', label: 'Images readable on mobile', weight: 4 },
]

// Myntra: 3:4 model imagery, five to seven images, brand-free accurate title.
// No backend terms, no A+ module count.
export const MYNTRA_IDQ: IdqRule[] = [
  { key: 'title.clean', label: 'Title brand-free, no special characters', weight: 14 },
  { key: 'title.length', label: 'Title within limit', weight: 6 },
  { key: 'bullets.count', label: 'Fit, fabric, pattern points present', weight: 10 },
  { key: 'features.count', label: 'Key attributes listed', weight: 10 },
  { key: 'description', label: 'Accurate description with fabric and care', weight: 16 },
  { key: 'image.main', label: '3:4 model shot on white', weight: 16 },
  { key: 'image.count', label: 'Five to seven images', weight: 20 },
  { key: 'mobile.readable', label: 'Images readable on mobile', weight: 8 },
]

// Noon (general merchandise, UAE/KSA): title-case keyword-heavy titles, white-bg
// portrait imagery, rich description, bilingual (Arabic + English) discovery.
export const NOON_IDQ: IdqRule[] = [
  { key: 'title.brand', label: 'Title-case, keyword-heavy, brand-led', weight: 12 },
  { key: 'title.length', label: 'Title within limit', weight: 8 },
  { key: 'bullets.count', label: 'Bullet points present', weight: 10 },
  { key: 'features.count', label: 'Key features listed', weight: 8 },
  { key: 'description', label: 'Rich description with key features', weight: 14 },
  { key: 'image.main', label: 'White-background high-res primary image', weight: 14 },
  { key: 'image.count', label: 'Three or more images from angles', weight: 16 },
  { key: 'searchTerms', label: 'Bilingual (Arabic + English) keywords', weight: 10 },
  { key: 'mobile.readable', label: 'Images readable on mobile', weight: 8 },
]

// Namshi (fashion, UAE): portrait model imagery, accurate fit/fabric, several images.
export const NAMSHI_IDQ: IdqRule[] = [
  { key: 'title.clean', label: 'Accurate, clean fashion title', weight: 12 },
  { key: 'title.length', label: 'Title within limit', weight: 6 },
  { key: 'bullets.count', label: 'Fit, fabric, and styling points', weight: 12 },
  { key: 'features.count', label: 'Key attributes listed', weight: 10 },
  { key: 'description', label: 'Accurate description with fabric and care', weight: 16 },
  { key: 'image.main', label: 'Portrait model shot, clean background', weight: 18 },
  { key: 'image.count', label: 'Several images including detail', weight: 18 },
  { key: 'mobile.readable', label: 'Images readable on mobile', weight: 8 },
]

// Backwards-compatible default used by any spec that has not picked a set yet.
export const DEFAULT_IDQ_RULES: IdqRule[] = AMAZON_IDQ
