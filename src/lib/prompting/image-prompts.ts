// JSON Prompting System - builds structured prompts for image generation.
// Every prompt is a typed JSON object, not a string.
// This makes prompts programmable, versionable, and self-healing.

export type ImagePrompt = {
  version: '1.0'
  type: AssetType
  lab: 'ListingLab' | 'AngleLab' | 'PhotoLab' | 'VideoLab'
  product: {
    name: string
    brand: string
    category: string
    keyFeatures: string[]
    color?: string
    material?: string
    dimensions?: string
  }
  scene: {
    background: string
    setting: string
    lighting: 'studio' | 'natural' | 'dramatic' | 'soft' | 'bright'
    mood: 'premium' | 'casual' | 'energetic' | 'minimal' | 'cozy'
    timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night'
  }
  composition: {
    angle: 'front' | 'three-quarter' | 'top' | 'side' | 'hero'
    shot: 'close-up' | 'medium' | 'wide' | 'macro'
    framing: 'centered' | 'rule-of-thirds' | 'asymmetric'
    focusPoint: string
  }
  styling: {
    palette: string[]
    typography?: {
      text: string
      font: 'sans' | 'serif' | 'display' | 'mono'
      position: 'top' | 'bottom' | 'overlay' | 'corner'
      color: string
    }[]
    overlay?: {
      type: 'badge' | 'callout' | 'comparison' | 'spec-table'
      content: string
      position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
    }[]
  }
  technical: {
    aspectRatio: '1:1' | '4:5' | '16:9' | '9:16' | '3:4' | '4:3'
    resolution: 'standard' | 'high' | '4k'
    style: 'photographic' | 'illustration' | '3d-render' | 'cinematic' | 'editorial'
  }
  negativePrompts: string[]
  // Serialized text prompt for image APIs that need a string
  textPrompt: string
  // The REAL product photo (scraped). When set, images are generated
  // image-to-image (edit) from this so the product design stays IDENTICAL and
  // is never re-imagined by the model.
  referenceImageUrl?: string
  // Magic Layers: when false, the image is generated as a CLEAN background with
  // NO baked-in text — the copy instead ships as editable `layers` the user can
  // move/edit in the in-house editor (like Canva Magic Layers). Default true
  // keeps the classic baked-text behaviour.
  renderText?: boolean
  layers?: TextLayer[]
}

// A positioned, editable text element. Coordinates are fractions of the image
// (0..1) so they scale to any display/export size. sizePct is the font size as a
// fraction of image height.
export type TextLayer = {
  text: string
  xPct: number
  yPct: number
  sizePct: number
  color: string
  bold: boolean
  align?: 'left' | 'center' | 'right'
}

export type AssetType =
  | 'main_image'
  | 'lifestyle'
  | 'infographic'
  | 'a_plus_module'
  | 'ad_static'
  | 'ad_carousel'
  | 'ugc_video'
  | 'product_video'
  | 'product_photo'
  | 'dimension'
  | 'detail'

// ====== Builders ======

// Reused across any image with a real-world scene and/or a person. gpt-image-2
// often breaks object scale (a giant pillow next to a tiny bed, a hand floating
// in from nowhere), so we forbid those failure modes explicitly.
const SCALE_NEG = [
  'disproportionate or unrealistic scale',
  'oversized or giant props',
  'pillow or product larger than a person',
  'distorted or wrong body proportions',
  'extra, missing or malformed hands',
  'awkward disembodied or floating hand',
  'objects that do not match real-world size',
  'product floating or hovering in mid-air',
  'product not resting on a surface',
  'product tilted or falling at an impossible angle',
  'distorted, unnatural or broken human anatomy',
  'body or limbs merging into the bed, furniture or product',
  'detached, missing, extra or malformed limbs',
  'person and product looking disconnected or awkwardly separate',
]

export function buildMainImagePrompt(p: {
  productName: string
  brand: string
  category: string
  keyFeatures: string[]
  color?: string
  material?: string
}): ImagePrompt {
  const keyFeatures = p.keyFeatures.slice(0, 3)
  return {
    version: '1.0',
    type: 'main_image',
    lab: 'ListingLab',
    product: {
      name: p.productName,
      brand: p.brand,
      category: p.category,
      keyFeatures,
      color: p.color,
      material: p.material,
    },
    scene: {
      background: 'pure white seamless',
      setting: 'professional studio',
      lighting: 'studio',
      mood: 'premium',
    },
    composition: {
      angle: 'three-quarter',
      shot: 'medium',
      framing: 'centered',
      focusPoint: 'product front label',
    },
    styling: {
      palette: ['#FFFFFF', p.color || '#000000'],
      typography: undefined,
      overlay: undefined,
    },
    technical: {
      aspectRatio: '1:1',
      resolution: 'high',
      style: 'photographic',
    },
    negativePrompts: [
      'text', 'watermark', 'logo overlay', 'cluttered background', 'shadows on product',
      'other products', 'people', 'hands', 'props', 'colored background',
    ],
    textPrompt: `Professional e-commerce main product image of a ${p.color || ''} ${p.productName} by ${p.brand}. Pure white seamless background, studio lighting, three-quarter angle, centered composition. ${p.material ? `Made of ${p.material}.` : ''} Premium product photography, ultra sharp focus, no text or watermark, Amazon-compliant main image.`,
  }
}

export function buildLifestylePrompt(p: {
  productName: string
  brand: string
  category: string
  keyFeatures: string[]
  useCase: string
  targetAudience: string
  setting?: string
  mood?: 'premium' | 'casual' | 'energetic' | 'minimal' | 'cozy'
  // Optional art direction from the Creative Director agent.
  scene?: string
  styleNote?: string
}): ImagePrompt {
  const mood = p.mood || 'premium'
  const setting = p.scene || p.setting || inferSetting(p.category)
  const styleTail = p.styleNote ? ` Visual style: ${p.styleNote}.` : ''

  return {
    version: '1.0',
    type: 'lifestyle',
    lab: 'ListingLab',
    product: {
      name: p.productName,
      brand: p.brand,
      category: p.category,
      keyFeatures: p.keyFeatures.slice(0, 3),
    },
    scene: {
      background: setting,
      setting,
      lighting: 'natural',
      mood,
      timeOfDay: 'morning',
    },
    composition: {
      angle: 'three-quarter',
      shot: 'wide',
      framing: 'rule-of-thirds',
      focusPoint: `${p.productName} in use by ${p.targetAudience}`,
    },
    styling: {
      palette: moodPalette(mood),
      typography: undefined,
      overlay: undefined,
    },
    technical: {
      aspectRatio: '4:5',
      resolution: 'high',
      style: 'photographic',
    },
    negativePrompts: [
      'text', 'watermark', 'studio background', 'white background', 'artificial lighting',
      'posed models', 'stock photo feel', ...SCALE_NEG,
    ],
    textPrompt: `Lifestyle product photography of ${p.productName} by ${p.brand} being used in a ${setting}. ${p.targetAudience} context. ${mood} mood, natural light, rule-of-thirds composition. Shows use case: ${p.useCase}. Everything at TRUE-TO-LIFE SCALE with correct, realistic proportions between any person and the product (a person, bed, pillow etc. sized exactly as in real life). The product rests naturally and stably on a real surface (counter, table or floor) — properly grounded with believable contact shadow, NEVER floating or hovering in mid-air. If a person is shown they must have correct, natural human anatomy — properly formed limbs and body, a believable relaxed pose, NEVER merging or sinking into the bed/furniture/product — and they should be genuinely interacting with or using the product (a natural, connected moment, not person and product placed awkwardly apart). Authentic, not stocky. Cinematic, editorial style.${styleTail}`,
  }
}

export function buildInfographicPrompt(p: {
  productName: string
  brand: string
  keyFeatures: string[]
  specs: { label: string; value: string }[]
  color?: string
  renderText?: boolean
}): ImagePrompt {
  // Only the 3 strongest points — clean beats cluttered. Trimmed to short labels.
  const features = p.keyFeatures.slice(0, 3).map((f) => f.split(/[:.]/)[0].trim().split(/\s+/).slice(0, 4).join(' '))
  const renderText = p.renderText !== false
  // Editable layers: feature callouts stacked on the right + brand top-left.
  const layers: TextLayer[] = [
    ...features.map((f, i) => ({ text: f, xPct: 0.66, yPct: 0.22 + i * 0.18, sizePct: 0.05, color: '#111111', bold: false, align: 'left' as const })),
    { text: p.brand, xPct: 0.08, yPct: 0.08, sizePct: 0.045, color: '#666666', bold: true, align: 'left' as const },
  ]
  const cleanPrompt = `Amazon product infographic BACKGROUND for ${p.productName} by ${p.brand}. Product centred on a clean light gradient, with ${features.length} empty callout slots and small minimalist icons down the right side connected by thin lines. Reserve clean empty space for labels. Render NO text, NO letters, NO words, NO numbers anywhere in the image. 1:1.`
  const typography = [
    ...features.map((f, i) => ({
      text: f,
      font: 'sans' as const,
      position: 'overlay' as const,
      color: '#000000',
    })),
    { text: p.brand, font: 'sans' as const, position: 'top' as const, color: '#666666' },
  ]

  return {
    version: '1.0',
    type: 'infographic',
    lab: 'ListingLab',
    product: {
      name: p.productName,
      brand: p.brand,
      category: 'general',
      keyFeatures: features,
      color: p.color,
    },
    scene: {
      background: 'clean light gradient',
      setting: 'flat lay with product',
      lighting: 'bright',
      mood: 'minimal',
    },
    composition: {
      angle: 'front',
      shot: 'medium',
      framing: 'asymmetric',
      focusPoint: 'product with labeled callouts',
    },
    styling: {
      palette: ['#FFFFFF', '#F5F5F5', p.color || '#000000', '#666666'],
      typography,
      overlay: features.map((f, i) => ({
        type: 'callout' as const,
        content: f,
        position: (i % 2 === 0 ? 'top-right' : 'bottom-right') as 'top-right' | 'bottom-right',
      })),
    },
    technical: {
      aspectRatio: '1:1',
      resolution: 'high',
      style: 'photographic',
    },
    negativePrompts: [
      'cluttered', 'low contrast', 'illegible text', 'overlapping callouts', 'busy background',
    ],
    renderText,
    layers,
    textPrompt: renderText
      ? `Minimal, premium Amazon product infographic for ${p.productName} by ${p.brand}. The product is the hero, large and centred, with just ${features.length} short icon callouts (2-3 words each, no sentences): ${features.join(' / ')}. Add ONE tasteful magnified close-up inset of the print/texture. Keep it CLEAN and uncluttered with lots of calm negative space — minimal text, no paragraphs, no repeated labels. Preserve the product's exact true colours and vibrancy. Soft light background, refined sans-serif, high-end editorial look.`
      : cleanPrompt,
  }
}

// A premium MACRO detail / angle shot: an extreme close-up of the product's
// texture, print pattern, material and finish (like the tactile hem/weave shots
// competitors use). Keeps the product's exact vivid colours.
export function buildDetailPrompt(p: {
  productName: string
  brand: string
  category: string
  feature: string
  styleNote?: string
}): ImagePrompt {
  const feature = p.feature || 'material texture and print detail'
  const styleTail = p.styleNote ? ` Visual style: ${p.styleNote}.` : ''
  return {
    version: '1.0',
    type: 'detail',
    lab: 'ListingLab',
    product: { name: p.productName, brand: p.brand, category: p.category, keyFeatures: [feature] },
    scene: { background: 'soft natural surface with gentle daylight', setting: 'macro detail close-up', lighting: 'natural', mood: 'premium' },
    composition: { angle: 'three-quarter', shot: 'macro', framing: 'rule-of-thirds', focusPoint: `extreme close-up of ${feature}` },
    styling: { palette: ['#FFFFFF'] },
    technical: { aspectRatio: '1:1', resolution: 'high', style: 'photographic' },
    negativePrompts: ['blurry', 'low detail', 'dull or washed-out colours', ...SCALE_NEG],
    textPrompt: `Premium MACRO close-up detail shot of ${p.productName} by ${p.brand}: an extreme close-up that highlights the ${feature} — the material texture, print pattern, weave and stitching in crisp razor-sharp detail, soft natural daylight, shallow depth of field. Preserve the product's EXACT vivid true colours (never dull or desaturate). A small elegant caption in a top corner naming the detail (a short label like "${feature}") in premium sans-serif. Tactile, editorial, magazine-quality.${styleTail}`,
  }
}

// A clean size/dimension diagram: the real product with measurement lines +
// arrows and the actual dimensions labelled, like Amazon's spec/size image.
export function buildDimensionPrompt(p: {
  productName: string
  brand: string
  category: string
  dimensions: string
  styleNote?: string
}): ImagePrompt {
  const dim = p.dimensions || 'the accurate product dimensions'
  const styleTail = p.styleNote ? ` Visual style: ${p.styleNote}.` : ''
  return {
    version: '1.0',
    type: 'dimension',
    lab: 'ListingLab',
    product: { name: p.productName, brand: p.brand, category: p.category, keyFeatures: [] },
    scene: { background: 'clean white technical backdrop', setting: 'dimension diagram', lighting: 'bright', mood: 'minimal' },
    composition: { angle: 'side', shot: 'medium', framing: 'centered', focusPoint: 'product with measurement callouts' },
    styling: { palette: ['#FFFFFF', '#EEF1F6', '#111111', '#6D5EF6'] },
    technical: { aspectRatio: '1:1', resolution: 'high', style: 'photographic' },
    negativePrompts: ['cluttered', 'gibberish text', 'misspelled words', ...SCALE_NEG],
    textPrompt: `Amazon product DIMENSION and size diagram for ${p.productName} by ${p.brand}. Show ONLY the actual product ITEM itself, presented flat or neatly folded on a clean white background (for a bedsheet show the folded/laid-out sheet; for a curtain the curtain panel; for apparel the garment) — do NOT show a bed, window, furniture, room or any props, ONLY the product. Add thin measurement lines and arrows along the product's own width, height and depth, each labelled with the real dimensions (${dim}) in a small legible sans-serif including the unit. Precise technical spec-sheet look, true-to-life accurate proportions, minimal and high contrast. Real correctly-spelled text and numbers only, no gibberish.${styleTail}`,
  }
}

export function buildAPlusPrompt(p: {
  productName: string
  brand: string
  story: string
  body?: string
  keyFeatures: string[]
  moduleType: 'comparison' | 'comparison-chart' | 'lifestyle' | 'brand-story' | 'spec-table'
  // Only for the comparison-chart layout: honest us-vs-ordinary rows.
  comparison?: { attribute: string; ours: string; theirs: string }[]
  // Optional art direction from the Creative Director agent.
  scene?: string
  palette?: string[]
  styleNote?: string
  renderText?: boolean
}): ImagePrompt {
  const feats = p.keyFeatures.slice(0, 4)
  // Trim the supporting line to a WHOLE-WORD boundary so on-image copy never ends
  // mid-word (e.g. "breathabl"). Falls back to a hard cut only if there's no space.
  const bodyLine = clampWords(p.body || '', 150)
  // Comparison rows: use the Director's honest rows, else derive a safe
  // has-it / doesn't-have-it table from the top features.
  const cmp = (p.comparison && p.comparison.length
    ? p.comparison
    : feats.map((f) => ({ attribute: f, ours: 'Yes', theirs: 'No' }))
  ).slice(0, 5)
  const dir = p.scene ? ` Art direction: ${p.scene}.` : ''
  const styleTail = p.styleNote ? ` Visual style: ${p.styleNote}.` : ''
  const renderText = p.renderText !== false

  // Each module type is a DISTINCT layout/pattern/palette so a set of A+ modules
  // never looks the same. All keep the real product (via image-to-image) and
  // legible, correctly-spelled English text.
  type T = {
    background: string
    setting: string
    lighting: ImagePrompt['scene']['lighting']
    mood: ImagePrompt['scene']['mood']
    angle: ImagePrompt['composition']['angle']
    framing: ImagePrompt['composition']['framing']
    palette: string[]
    textPrompt: string
    cleanPrompt: string
    layers: TextLayer[]
  }
  const templates: Record<string, T> = {
    'brand-story': {
      background: 'soft off-white editorial studio backdrop with gentle natural shadow',
      setting: 'editorial split-layout hero', lighting: 'soft', mood: 'premium',
      angle: 'hero', framing: 'asymmetric', palette: ['#F6F1EA', '#1C1C1C', '#B4744B'],
      textPrompt: `Amazon A+ editorial BRAND-STORY module for ${p.brand}, styled like a premium magazine hero (calm, expensive, lots of air). RIGHT HALF: the product beautifully staged on a natural stone plinth with a few tasteful botanical props and soft daylight shadows. LEFT HALF: generous off-white negative space holding, top to bottom, the brand name "${p.brand}" small at the top, a large elegant TWO-LINE headline "${p.story}", one short supporting line "${bodyLine}", and a single row of three small thin-line benefit icons with tiny labels along the bottom. Refined muted palette with a SINGLE warm accent colour (no harsh or saturated colours). Sophisticated modern typography, perfectly aligned, real correctly-spelled English only, no gibberish. 16:9.`,
      cleanPrompt: `Amazon A+ editorial BRAND-STORY BACKGROUND for ${p.brand}. RIGHT HALF: product on a natural stone plinth with tasteful botanical props, soft daylight. LEFT HALF: clean off-white negative space reserved for a headline and a row of three icon slots. Muted palette, single warm accent. Render NO text, NO letters, NO words anywhere. 16:9.`,
      layers: [
        { text: p.brand, xPct: 0.08, yPct: 0.14, sizePct: 0.045, color: '#8A8178', bold: true, align: 'left' },
        { text: p.story, xPct: 0.08, yPct: 0.34, sizePct: 0.085, color: '#1C1C1C', bold: true, align: 'left' },
        ...(bodyLine ? [{ text: bodyLine, xPct: 0.08, yPct: 0.52, sizePct: 0.04, color: '#5A544E', bold: false, align: 'left' as const }] : []),
      ],
    },
    comparison: {
      background: 'clean light studio with soft panels',
      setting: 'split feature layout', lighting: 'soft', mood: 'minimal',
      angle: 'three-quarter', framing: 'asymmetric', palette: ['#FFFFFF', '#F3F4F8', '#111111', '#10B981'],
      textPrompt: `Amazon A+ FEATURE-LIST module for ${p.brand}. LEFT half: the product on a clean white pedestal. RIGHT half: a vertical stack of ${feats.length} short benefit rows, each with a small green check icon and a legible label: ${feats.join(' / ')}. Structured grid, generous spacing, high contrast, real correctly-spelled English text, no gibberish. 16:9.`,
      cleanPrompt: `Amazon A+ FEATURE module BACKGROUND for ${p.brand}. LEFT half: product on a clean white pedestal. RIGHT half: a clean panel with ${feats.length} evenly-spaced small green check icons and empty label rows. Render NO text, NO letters, NO words. 16:9.`,
      layers: feats.map((f, i) => ({ text: f, xPct: 0.56, yPct: 0.24 + i * 0.16, sizePct: 0.05, color: '#111111', bold: false, align: 'left' as const })),
    },
    'comparison-chart': {
      background: 'clean white layout with two soft-tinted comparison columns',
      setting: 'side-by-side comparison table', lighting: 'bright', mood: 'minimal',
      angle: 'front', framing: 'centered', palette: ['#FFFFFF', '#F3F4F8', '#111111', '#10B981', '#9CA3AF'],
      textPrompt: `Amazon A+ COMPARISON CHART for ${p.brand}. A clean side-by-side comparison TABLE with two column headers: "${p.brand}" (highlighted accent column, green check marks) versus "Ordinary" (muted grey column, grey cross marks). ${cmp.length} attribute rows down the left: ${cmp.map((r) => r.attribute).join(' / ')}. In the ${p.brand} column each row reads a clear winning value (${cmp.map((r) => r.ours).join(', ')}); the Ordinary column reads the weaker value (${cmp.map((r) => r.theirs).join(', ')}). Product image sits at the top. Structured grid with thin dividers, generous spacing, high contrast, legible sans-serif, real correctly-spelled English text, no gibberish. 16:9.`,
      cleanPrompt: `Amazon A+ COMPARISON CHART BACKGROUND for ${p.brand}. A clean two-column comparison table grid (one accent-tinted column, one grey column) with ${cmp.length} empty rows and thin dividers, product image at the top. Render NO text, NO letters, NO words, NO numbers. 16:9.`,
      layers: [
        { text: p.brand, xPct: 0.58, yPct: 0.14, sizePct: 0.045, color: '#10B981', bold: true, align: 'center' },
        { text: 'Ordinary', xPct: 0.84, yPct: 0.14, sizePct: 0.045, color: '#9CA3AF', bold: true, align: 'center' },
        ...cmp.map((r, i) => ({ text: r.attribute, xPct: 0.06, yPct: 0.30 + i * 0.13, sizePct: 0.038, color: '#111111', bold: false, align: 'left' as const })),
      ],
    },
    lifestyle: {
      background: 'authentic real-world in-use environment',
      setting: 'lifestyle scene', lighting: 'natural', mood: 'cozy',
      angle: 'three-quarter', framing: 'rule-of-thirds', palette: ['#EFE7DC', '#3A342C', '#FFFFFF'],
      textPrompt: `Amazon A+ LIFESTYLE module for ${p.brand}. The product in an authentic, tastefully styled real-life setting, warm natural light, editorial (not stocky) photography. Compose everything at TRUE-TO-LIFE SCALE with correct, realistic proportions between any person and the product (never a giant pillow or an undersized bed). Any person must have correct natural human anatomy — properly formed limbs and body, a believable relaxed pose, NEVER merging or sinking into the bed/furniture — genuinely interacting with the product (a connected, natural moment; no floating hands). Set one short, elegant caption "${p.story}" in the LOWER-LEFT corner with comfortable margins — a premium, editorial typeface (refined medium weight, generous letter-spacing, NOT a heavy full-width flat bar), sitting over only a soft, subtle dark-to-transparent gradient just behind the text so it reads cleanly. Magazine-quality, tasteful, understated. Real, correctly-spelled English text. 16:9.`,
      cleanPrompt: `Amazon A+ LIFESTYLE module BACKGROUND for ${p.brand}. The product used in an authentic real-life setting at true-to-life scale (realistic proportions, any person naturally posed), warm natural light, editorial photography, with a soft gradient lower-third reserved for a caption. Render NO text, NO letters, NO words. 16:9.`,
      layers: [{ text: p.story, xPct: 0.5, yPct: 0.88, sizePct: 0.05, color: '#FFFFFF', bold: true, align: 'center' }],
    },
    'spec-table': {
      background: 'clean technical light background',
      setting: 'spec callout layout', lighting: 'bright', mood: 'minimal',
      angle: 'front', framing: 'centered', palette: ['#FFFFFF', '#EEF1F6', '#111111', '#6D5EF6'],
      textPrompt: `Amazon A+ SPEC module for ${p.brand}. The product centred with 3-4 spec callouts arranged around it, each a small icon plus a short label connected by a thin line: ${feats.join(' / ')}. Clean technical infographic style, legible sans-serif, real correctly-spelled English text, no gibberish. 16:9.`,
      cleanPrompt: `Amazon A+ SPEC module BACKGROUND for ${p.brand}. Product centred with 3-4 clean icon callout slots around it connected by thin lines, empty label areas. Render NO text, NO letters, NO words. 16:9.`,
      layers: feats.map((f, i) => ({ text: f, xPct: i % 2 === 0 ? 0.22 : 0.78, yPct: 0.28 + Math.floor(i / 2) * 0.34, sizePct: 0.045, color: '#111111', bold: false, align: 'center' as const })),
    },
  }
  const t = templates[p.moduleType] || templates['brand-story']

  return {
    version: '1.0',
    type: 'a_plus_module',
    lab: 'ListingLab',
    product: { name: p.productName, brand: p.brand, category: 'general', keyFeatures: p.keyFeatures },
    scene: { background: t.background, setting: t.setting, lighting: t.lighting, mood: t.mood },
    composition: { angle: t.angle, shot: 'wide', framing: t.framing, focusPoint: 'product with supporting text' },
    styling: { palette: p.palette && p.palette.length ? p.palette : t.palette },
    technical: { aspectRatio: '16:9', resolution: 'high', style: 'editorial' },
    negativePrompts: ['cluttered', 'low resolution', 'gibberish text', 'misspelled words', 'inconsistent typography', 'harsh or oversaturated colours', ...SCALE_NEG],
    renderText,
    layers: t.layers,
    textPrompt: (renderText ? t.textPrompt : t.cleanPrompt) + dir + styleTail,
  }
}

export function buildAdCreativePrompt(p: {
  productName: string
  brand: string
  angle: string
  angleType: 'social-proof' | 'before-after' | 'problem-solution' | 'testimonial' | 'us-vs-them'
  headline: string
  subheadline: string
  cta: string
  platform: 'meta' | 'tiktok' | 'google' | 'pinterest'
  color?: string
  palette?: string[]
  renderText?: boolean
}): ImagePrompt {
  const adPalette = p.palette && p.palette.length ? p.palette : ['#F4EFE9', '#1C1C1C', p.color || '#B4744B']
  const aspectRatio =
    p.platform === 'tiktok' || p.platform === 'pinterest' ? '9:16' :
    p.platform === 'meta' ? '1:1' :
    '1:1'
  const renderText = p.renderText !== false
  const layers: TextLayer[] = [
    { text: p.headline, xPct: 0.5, yPct: 0.13, sizePct: 0.09, color: '#FFFFFF', bold: true, align: 'center' },
    ...(p.subheadline ? [{ text: p.subheadline, xPct: 0.5, yPct: 0.27, sizePct: 0.05, color: '#FFFFFF', bold: false, align: 'center' as const }] : []),
    ...(p.cta ? [{ text: p.cta, xPct: 0.5, yPct: 0.85, sizePct: 0.05, color: '#FFFFFF', bold: true, align: 'center' as const }] : []),
  ]
  const cleanPrompt = `High-converting ${p.platform} ad creative BACKGROUND for ${p.productName} by ${p.brand}. Angle: ${p.angle} (${p.angleType}). Premium studio lighting, refined scroll-stopping composition, product hero at true-to-life scale. Use the brand's own palette — a tasteful, sophisticated background with a SINGLE accent colour, never a harsh saturated red. Reserve clean empty space at the top for a headline and at the bottom for a call-to-action button. Render NO text, NO letters, NO words anywhere. Cinematic style.`

  return {
    version: '1.0',
    type: 'ad_static',
    lab: 'AngleLab',
    product: {
      name: p.productName,
      brand: p.brand,
      category: 'general',
      keyFeatures: [p.angle],
      color: p.color,
    },
    scene: {
      background: 'refined brand-palette backdrop, single tasteful accent',
      setting: 'ad creative composition',
      lighting: 'dramatic',
      mood: 'premium',
    },
    composition: {
      angle: 'hero',
      shot: 'medium',
      framing: 'centered',
      focusPoint: 'product with bold headline',
    },
    styling: {
      palette: adPalette,
      typography: [
        { text: p.headline, font: 'display', position: 'top', color: '#FFFFFF' },
        { text: p.subheadline, font: 'sans', position: 'overlay', color: '#FFFFFF' },
        { text: p.cta, font: 'sans', position: 'bottom', color: '#FFFFFF' },
      ],
      overlay: [
        { type: 'callout', content: p.headline, position: 'top-right' },
      ],
    },
    technical: {
      aspectRatio,
      resolution: 'high',
      style: 'cinematic',
    },
    negativePrompts: [
      'boring', 'generic', 'low contrast', 'illegible text', 'cluttered',
      'harsh saturated red background', 'oversaturated colours', ...SCALE_NEG,
    ],
    renderText,
    layers,
    textPrompt: renderText
      ? `High-converting ${p.platform} ad creative for ${p.productName} by ${p.brand}. Angle: ${p.angle} (${p.angleType}). Bold headline: "${p.headline}". Subheadline: "${p.subheadline}". CTA: "${p.cta}". Dramatic lighting, energetic mood, scroll-stopping. Cinematic style.`
      : cleanPrompt,
  }
}

// ====== Helpers ======

// Truncate text to at most `max` chars WITHOUT cutting a word in half, and drop
// any dangling connector/punctuation so the line reads as a complete phrase.
function clampWords(text: string, max: number): string {
  const s = (text || '').trim()
  if (s.length <= max) return s
  const cut = s.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  const trimmed = (lastSpace > max * 0.5 ? cut.slice(0, lastSpace) : cut).trim()
  // Remove a trailing conjunction/preposition or stray punctuation left hanging.
  return trimmed
    .replace(/[\s,;:.\-]+$/, '')
    .replace(/\s+(and|or|but|yet|so|as|that|with|for|the|a|an|to|of|in|on)$/i, '')
    .trim()
}

function inferSetting(category: string): string {
  const map: Record<string, string> = {
    'kitchen': 'modern kitchen',
    'beauty': 'bathroom vanity',
    'fitness': 'home gym',
    'fashion': 'urban street',
    'outdoor': 'mountain landscape',
    'office': 'minimal home office',
    'baby': 'bright nursery',
    'pet': 'cozy living room',
    'automotive': 'driveway at sunset',
  }
  const lower = category.toLowerCase()
  for (const [k, v] of Object.entries(map)) {
    if (lower.includes(k)) return v
  }
  return 'minimalist lifestyle setting'
}

function moodPalette(mood: string): string[] {
  const map: Record<string, string[]> = {
    premium: ['#000000', '#FFFFFF', '#C9A961'],
    casual: ['#F5F5F0', '#4A4A4A', '#E8D5B7'],
    energetic: ['#FF4444', '#000000', '#FFFFFF'],
    minimal: ['#FFFFFF', '#F5F5F5', '#000000'],
    cozy: ['#3D2914', '#F5E6D3', '#8B5A3C'],
  }
  return map[mood] || map.premium
}

// ====== Premium photography recipe ======
// Inspired by structured D2C prompt systems (fofr.ai JSON methodology): every
// image carries an explicit camera/lens, lighting, film-stock and grade brief so
// output reads as "shot by someone who cares", not a generic render.

const RECIPE: Record<string, string> = {
  photographic:
    'Shot on a Sony A7R V with an 85mm f/1.8 lens at f/4, soft diffused window light from upper-left at ~4800K, gentle graduated shadows, Kodak Portra 400 warmth, fine grain in shadows only, tack-sharp subject, asymmetric composition with generous negative space',
  cinematic:
    'Cinematic commercial photography, Leica SL2 with 90mm Summicron at f/2.8, dramatic directional key light with soft rim, rich warm color grade, shallow depth of field, high dynamic range, editorial energy',
  editorial:
    'Editorial magazine composition, medium-format Hasselblad look, soft natural light, refined muted color grade, considered negative space, premium and material-honest',
  '3d-render':
    'Clean product render, physically based materials, soft studio HDRI lighting, subtle contact shadow, crisp edges',
  illustration:
    'Clean modern vector-style illustration, flat considered palette, crisp shapes, high legibility',
}

const QUALITY_TAIL =
  'Commercial-grade, magazine-quality result: 8K detail, physically accurate materials and true-to-life color, flawless focus and micro-contrast, professional color grade, natural realistic shadows and reflections. No watermark, no logo overlay, no distortion, no extra limbs or artifacts, no plastic/over-smoothed look.'

// Applied only to images that carry baked-in text (infographic / A+ / ad). This
// is what makes on-image copy look designed rather than AI-typed: a specific,
// premium typeface direction + crisp rendering + strict anti-gibberish cues.
const TYPOGRAPHY_TAIL =
  'Typography must look professionally designed: use a clean, modern geometric sans-serif (Inter / Helvetica Neue / Montserrat / SF Pro style), confident bold weight for headlines and a lighter weight for supporting copy, tight and even kerning, baseline-aligned, generous letter-spacing where appropriate. Text rendered crisp and razor-sharp with high contrast against its background, perfectly legible at a glance, real correctly-spelled English only — absolutely no warped, distorted, blurry, duplicated, or gibberish letters and no fake/garbled words.'

// Image types that render text inside the image and therefore need the type recipe.
const TEXT_BEARING: ReadonlySet<string> = new Set(['infographic', 'a_plus_module', 'ad_static', 'dimension', 'detail'])

// Serialize a prompt for image APIs that take a single text string. Appends the
// photography recipe + negative cues so every generation hits a premium bar.
export function serializePrompt(prompt: ImagePrompt): string {
  const recipe = RECIPE[prompt.technical.style] || RECIPE.photographic
  // Magic Layers: clean-background images must carry ZERO baked text (the copy
  // ships as editable layers instead), so skip typography and force "no text".
  const cleanBg = prompt.renderText === false
  const hasText = !cleanBg && (TEXT_BEARING.has(prompt.type) || !!prompt.styling?.typography?.length)

  // Build a tightly-structured creative brief from the full JSON breakdown. Each
  // dimension (subject / scene / composition / camera / format / palette) is
  // stated explicitly and unambiguously — next-gen image models resolve a dense,
  // sectioned brief far more faithfully than a single prose paragraph.
  const pr = prompt.product
  const sc = prompt.scene
  const co = prompt.composition
  const tech = prompt.technical
  const palette = prompt.styling?.palette?.length ? prompt.styling.palette.slice(0, 5).join(', ') : ''

  const subject = [pr.color, pr.material, pr.name].filter(Boolean).join(' ')
  const lines: string[] = [prompt.textPrompt.trim()]
  lines.push(
    `SUBJECT: ${subject} by ${pr.brand}${prompt.referenceImageUrl ? ', rendered EXACTLY as the reference product — identical print/pattern, motif, design, shape, colour, logo and proportions; never re-imagined, redrawn or varied' : ''}.`
  )
  lines.push(
    `SCENE: ${sc.background}; ${sc.setting}; ${sc.lighting} lighting${sc.timeOfDay ? ` (${sc.timeOfDay})` : ''}; ${sc.mood} mood.`
  )
  lines.push(
    `COMPOSITION: ${co.angle} angle, ${co.shot} shot, ${co.framing} framing, focal point on ${co.focusPoint}.`
  )
  lines.push(`CAMERA & RENDER: ${recipe}.`)
  lines.push(`FORMAT: ${tech.aspectRatio} aspect ratio, ${tech.resolution} resolution, ${tech.style} style.`)
  if (palette) lines.push(`PALETTE: ${palette}.`)
  if (hasText) lines.push(`TYPOGRAPHY: ${TYPOGRAPHY_TAIL}`)
  if (hasText && pr.brand) lines.push(`BRAND LOCKUP: render the brand name "${pr.brand}" as ONE clean, consistent logo lockup in the brand's REAL logo font and colour — styled IDENTICALLY in every image (never a different font, weight or colour each time). Keep it small, tasteful and correctly spelled; do not stretch or restyle it. Do NOT set the rest of the copy in that logo font.`)
  lines.push(`QUALITY: ${QUALITY_TAIL}`)

  const negs = [...prompt.negativePrompts]
  if (hasText) negs.push('any em-dash or en-dash (— or –) in rendered text; use plain words, commas, or periods instead')
  if (cleanBg) negs.push('ANY text, letters, words, numbers, captions, labels, watermarks or typography of any kind — the image must be completely text-free')
  if (negs.length) lines.push(`AVOID: ${negs.join(', ')}.`)

  const out = lines.join('\n')
  // Never feed an em/en/horizontal dash into the model — it renders them as long
  // strokes in baked-in text. Collapse to a space (normal hyphens are preserved).
  return out.replace(/\s*[‒–—―]\s*/g, ' ')
}
