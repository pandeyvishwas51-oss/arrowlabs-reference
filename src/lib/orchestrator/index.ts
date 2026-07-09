// Orchestrator - the brain that ties everything together.
// Input: ASIN (and optional marketplace + target audience + labs)
// Output: full campaign with scraped data, keywords, angles, listing, and
//         assets (JSON prompts + generated image/video URLs).
//
// Every billable step is metered + charged to the user's wallet via credits.ts.
// Generated media is persisted to public/generated (not stored as base64 blobs).

import { scrapeAsin, type ScrapeResult } from '@/lib/scraper/asin'
import { scrapeMarketplace, isMarketplacePlatform } from '@/lib/scraper/marketplace'
import { crawlCompetitors, type CompetitorReport } from '@/lib/scraper/competitors'
import { researchKeywords } from '@/lib/keywords'
import { generateJSON, generateText, type TextMessage } from '@/lib/ai/text'
import { generateImage, bestModelFor } from '@/lib/ai/image'
import { planCreatives } from '@/lib/creative/director'
import { generateVideo } from '@/lib/ai/video'
import { generateVoiceover } from '@/lib/ai/voice'
import {
  buildMainImagePrompt,
  buildLifestylePrompt,
  buildInfographicPrompt,
  buildDimensionPrompt,
  buildDetailPrompt,
  buildAPlusPrompt,
  type ImagePrompt,
} from '@/lib/prompting/image-prompts'
import { validateTitle, validateBullets, validateAdAngles, healTitle } from '@/lib/selfhealing'
import { db } from '@/lib/db'
import { getLLMProvider, getImageProvider, getVideoProvider, config } from '@/lib/config'
import { saveBase64 } from '@/lib/storage'
import { debitForUsage, InsufficientCreditsError, type UsageKind } from '@/lib/credits'
import { logError } from '@/lib/logger'
import { localizationDirective, getPlatform, type PlatformPack } from '@/lib/platforms'

export type Lab = 'ListingLab' | 'APlusLab' | 'AngleLab' | 'PhotoLab' | 'VideoLab'

export type OrchestratorInput = {
  asin: string
  marketplace?: string
  // Raw mode: skip scraping — the user supplies their own product. The hero image
  // (already uploaded, absolute URL) drives image-to-image product lock, and the
  // title/description seed the listing, keywords, A+ and creatives.
  raw?: {
    title: string
    description?: string
    brand?: string
    category?: string
    heroImageUrl: string
    price?: number
    currency?: string
    dimensions?: string
  }
  // Optional A+ theme the modules should be built around.
  theme?: string
  targetAudience?: string
  labs?: Lab[]
  generateImages?: boolean // if false, only build prompts (skip image gen)
  generateVideo?: boolean
  // 'ugc' = authentic customer selfie style; 'overview' = clean marketplace product video.
  videoStyle?: 'ugc' | 'overview'
  userId?: string | null
  orgId?: string | null
  subscriberId?: string
  // Region localizes any humans in images (e.g. Indian models for India).
  region?: string
  // TARGET marketplace to generate for (drives guidelines, sizes, aspect ratios).
  platform?: string
  // SOURCE marketplace to SCRAPE the product from (Amazon ASIN, Flipkart FSN, …).
  // Defaults to Amazon. Lets a seller scrape a product listed on one marketplace
  // and generate a full listing for a DIFFERENT target platform (e.g. Amazon → Noon).
  sourcePlatform?: string
  // User-controllable quantities per asset type.
  counts?: {
    lifestyle?: number
    infographic?: number
    aPlus?: number
    productPhoto?: number
    dimension?: number
    detail?: number
    video?: number
  }
}

export type OrchestratorResult = {
  campaignId: string
  asin: string
  status: 'completed' | 'partial' | 'failed'
  scraped: ScrapeResult
  competitors: CompetitorReport
  keywords: { keyword: string; intent: string; source?: string }[]
  angles?: any[]
  listing?: {
    title: string
    itemHighlight?: string
    bullets: string[]
    features?: string[]
    description?: string
    aPlusContent: { heading: string; body: string }[]
    selfHealing?: any
  }
  brandDna?: any
  video?: { url: string; script: string; voiceoverUrl?: string } | null
  assets: {
    id?: string
    type: string
    lab: string
    prompt: ImagePrompt
    imageUrl?: string
    status: 'pending' | 'completed' | 'failed'
    error?: string
  }[]
  creditsCharged: number
  errors: string[]
  durationMs: number
}

// Fire-and-forget background start: creates the campaign row immediately, runs the
// full pipeline server-side (so it keeps going even if the user leaves the page),
// and returns the campaignId to poll. Progress is persisted on the campaign.
export async function startOrchestration(input: OrchestratorInput): Promise<{ campaignId: string }> {
  const campaign = await db.campaign.create({
    data: {
      asin: input.asin,
      marketplace: input.marketplace || 'US',
      status: 'scraping',
      source: input.subscriberId ? 'subscriber' : input.userId ? 'studio' : 'api',
      subscriberId: input.subscriberId || null,
      userId: input.userId || null,
      orgId: input.orgId || null,
    },
  })
  // Run in the background; do NOT await. Errors are logged + marked on the campaign.
  orchestrate(input, { id: campaign.id }).catch((e) => logError('orchestrator.background', e, { campaignId: campaign.id }))
  return { campaignId: campaign.id }
}

export async function orchestrate(input: OrchestratorInput, existingCampaign?: { id: string }): Promise<OrchestratorResult> {
  const start = Date.now()
  const labs = input.labs || ['ListingLab', 'AngleLab']
  const generateImages = input.generateImages ?? false
  const errors: string[] = []
  const userId = input.userId || null
  const orgId = input.orgId || null
  let creditsCharged = 0

  // Meter + charge a billable step. Returns false if the org is out of credits.
  const charge = async (kind: UsageKind, opts: { quantity?: number; provider?: string; model?: string; campaignId?: string; meta?: any } = {}) => {
    try {
      const { charged } = await debitForUsage({ orgId, userId, kind, ...opts })
      creditsCharged += charged
      return true
    } catch (e) {
      if (e instanceof InsufficientCreditsError) {
        errors.push(`Out of credits at "${kind}" (need ${e.required}, have ${e.available}).`)
        return false
      }
      await logError('orchestrator.charge', e, { kind })
      return true // metering failure shouldn't block generation
    }
  }

  // 1. Create campaign record (or reuse one created by startOrchestration).
  const campaign = existingCampaign
    ? { id: existingCampaign.id }
    : await db.campaign.create({
        data: {
          asin: input.asin,
          marketplace: input.marketplace || 'US',
          status: 'scraping',
          source: input.subscriberId ? 'subscriber' : userId ? 'studio' : 'api',
          subscriberId: input.subscriberId || null,
          userId,
          orgId,
        },
      })

  // Live progress the UI polls (survives navigation): steps flip pending→active→done.
  const progressState = {
    stage: 'Analyze Product',
    percent: 0,
    images: { done: 0, total: 0 },
    steps: [
      { key: 'product', label: 'Product Data', status: 'active' as string },
      { key: 'reviews', label: 'Review Analysis', status: 'pending' as string },
      { key: 'competitors', label: 'Competitor Analysis', status: 'pending' as string },
      { key: 'keywords', label: 'Keyword Research', status: 'pending' as string },
      { key: 'avatars', label: 'Customer Avatars & Brand DNA', status: 'pending' as string },
      { key: 'listing', label: 'Listing & A+ Facts', status: 'pending' as string },
      { key: 'concepts', label: 'Creative Concepts', status: 'pending' as string },
      { key: 'images', label: 'Generate Images', status: 'pending' as string },
    ] as { key: string; label: string; status: string }[],
  }
  // Add a Video step to the progress when the user asked for a video.
  if ((input.labs || []).includes('VideoLab') && (input.generateVideo ?? false)) {
    progressState.steps.push({ key: 'video', label: 'Generate Video', status: 'pending' })
  }
  const writeProgress = async () => {
    const steps = progressState.steps
    const total = steps.length || 1
    const doneCount = steps.filter((s) => s.status === 'done').length
    // Let the images step contribute fractionally so the bar moves per-image.
    const img = steps.find((s) => s.key === 'images')
    let frac = doneCount
    if (img && img.status === 'active' && progressState.images.total) frac += progressState.images.done / progressState.images.total
    const allDone = steps.every((s) => s.status === 'done')
    progressState.percent = allDone ? 100 : Math.min(99, Math.round((frac / total) * 100))
    const active = steps.find((s) => s.status === 'active')
    progressState.stage = allDone ? 'Complete' : active?.label || progressState.stage
    await db.campaign.update({ where: { id: campaign.id }, data: { progress: progressState as any } }).catch(() => {})
  }
  const mark = async (key: string, status: string) => {
    const st = progressState.steps.find((s) => s.key === key)
    if (st) st.status = status
    await writeProgress()
  }
  await writeProgress()

  try {
    // 2. Get the product: raw upload (no scrape) → scrape the SOURCE marketplace
    // (Flipkart/Myntra/Noon/Namshi via the scraper service) → Amazon ASIN scrape.
    // Non-Amazon scraping needs residential proxies to beat bot-walls; if it can't
    // fetch it throws a clear error (the campaign is marked failed) — it never
    // invents a different product.
    // SOURCE = where we scrape from (defaults to Amazon); TARGET = input.platform,
    // which drives the generated listing's guidelines/sizes — they can differ.
    const source = input.sourcePlatform || 'amazon_in'
    const scraped = input.raw
      ? buildRawScrapeResult(input.raw)
      : isMarketplacePlatform(source)
        ? await scrapeMarketplace(source, input.asin, input.region)
        : await scrapeAsin(input.asin, input.marketplace || 'US')
    if (!input.raw) {
      await charge('scrape', { campaignId: campaign.id, provider: scraped.provider, meta: { asin: input.asin } })
    }
    await db.campaign.update({
      where: { id: campaign.id },
      data: { productName: scraped.product.title, status: 'generating', scrapedData: scraped as any },
    })
    await mark('product', 'done'); await mark('reviews', 'done'); await mark('competitors', 'active')

    // 3. Research keywords + crawl competitors (parallel)
    const seedKeyword = scraped.product.title.split(' ').slice(0, 4).join(' ') || input.asin
    const [keywordResearch, competitors] = await Promise.all([
      researchKeywords(seedKeyword, input.marketplace || 'US').catch((e) => {
        errors.push(`Keyword research failed: ${e.message}`)
        return { seed: seedKeyword, keywords: [], provider: 'none' }
      }),
      crawlCompetitors(seedKeyword, input.marketplace || 'US', 10).catch((e) => {
        errors.push(`Competitor crawl failed: ${e.message}`)
        return null
      }),
    ])
    await charge('keywords', { campaignId: campaign.id })
    if (competitors) await charge('competitors', { campaignId: campaign.id })
    await mark('competitors', 'done'); await mark('keywords', 'active')

    // Expand into a comprehensive keyword set with Opus (scraping alone is
    // often blocked and returns very few). Merges LLM keywords + title n-grams +
    // review terms + competitor terms, deduped.
    let mergedKeywords: { keyword: string; intent: string; source?: string }[] = keywordResearch.keywords as any
    if (getLLMProvider()) {
      try {
        const expanded = await expandKeywords(scraped, competitors)
        const seen = new Set(mergedKeywords.map((k) => k.keyword.toLowerCase()))
        for (const k of expanded) {
          if (!seen.has(k.keyword.toLowerCase())) {
            mergedKeywords.push(k)
            seen.add(k.keyword.toLowerCase())
          }
        }
      } catch (e: any) {
        errors.push(`Keyword expansion failed: ${e.message}`)
      }
    }

    // Persist keywords (dash-free, like all shipped content)
    // Keyword hygiene (marketplace rules): no commas/semicolons inside a term
    // (search-terms fields separate with single semicolons — never double), dash-free,
    // deduped, and no single word repeated more than twice across the whole set.
    const wordCount: Record<string, number> = {}
    const cleanKeywords: { keyword: string; intent: string }[] = []
    const seenKw = new Set<string>()
    for (const kw of mergedKeywords) {
      const term = (kw.keyword || '').replace(/\s*[‒–—―]\s*/g, ' ').replace(/[;,]+/g, ' ').replace(/\s{2,}/g, ' ').trim()
      const low = term.toLowerCase()
      if (!term || seenKw.has(low)) continue
      // Cap repetition: skip a term if every one of its words already appears twice.
      const words = low.split(/\s+/).filter((w) => w.length > 2)
      if (words.length && words.every((w) => (wordCount[w] || 0) >= 2)) continue
      words.forEach((w) => { wordCount[w] = (wordCount[w] || 0) + 1 })
      seenKw.add(low)
      cleanKeywords.push({ keyword: term, intent: kw.intent })
      if (cleanKeywords.length >= 40) break
    }
    mergedKeywords = cleanKeywords as any
    for (const kw of cleanKeywords) {
      await db.keyword.create({ data: { campaignId: campaign.id, keyword: kw.keyword, intent: kw.intent } }).catch(() => {})
    }

    await mark('keywords', 'done'); await mark('avatars', 'active')

    // Brand DNA - synthesize the full picture from reviews + product + competitors.
    let brandDna: any = null
    if (getLLMProvider()) {
      try {
        brandDna = await generateBrandDna(scraped, competitors)
        await db.campaign.update({ where: { id: campaign.id }, data: { brandDna } })
      } catch (e: any) {
        errors.push(`Brand DNA failed: ${e.message}`)
      }
    }
    await mark('avatars', 'done'); await mark('listing', 'active')

    // 4. Generate listing (ListingLab)
    let listing: OrchestratorResult['listing']
    if (labs.includes('ListingLab') && getLLMProvider()) {
      try {
        listing = await generateListing(scraped, input.targetAudience, getPlatform(input.platform))
        await charge('listing', { campaignId: campaign.id, provider: getLLMProvider() || undefined })
        await db.campaign.update({ where: { id: campaign.id }, data: { listing: listing as any } })
      } catch (e: any) {
        errors.push(`Listing generation failed: ${e.message}`)
      }
    }
    await mark('listing', 'done'); await mark('concepts', 'active')

    // 5. Generate ad angles (AngleLab)
    let angles: any[] = []
    if (labs.includes('AngleLab') && getLLMProvider()) {
      try {
        angles = await generateAngles(scraped, competitors, input.targetAudience)
        await charge('angles', { campaignId: campaign.id, provider: getLLMProvider() || undefined })
        await db.campaign.update({ where: { id: campaign.id }, data: { angles: angles as any } })
      } catch (e: any) {
        errors.push(`Angle generation failed: ${e.message}`)
      }
    }

    // 5.5 Creative Director agent: analyze the WHOLE product (description, specs,
    // features + review verbatims) and art-direct a bespoke, professional creative
    // plan (visual identity, per-module A+ concepts, specific lifestyle scenes).
    const willBuildImages = labs.includes('PhotoLab') || labs.includes('APlusLab')
    // Use the org's saved official brand colours (Account → brand) if set, so every
    // module + on-image text uses the real brand palette consistently.
    let brandColors: string[] | undefined
    if (orgId) {
      try {
        const org = await db.organization.findUnique({ where: { id: orgId }, select: { brandData: true } })
        const c = (org?.brandData as any)?.colors
        if (Array.isArray(c)) brandColors = c.filter(Boolean)
        else if (typeof c === 'string') brandColors = c.split(/[,\s]+/).map((s: string) => s.trim()).filter(Boolean)
      } catch { /* ignore */ }
    }
    const plan = willBuildImages ? await planCreatives(scraped, input.theme, brandColors).catch(() => null) : null
    const planNote = plan
      ? `${plan.visualIdentity.mood}; ${plan.visualIdentity.styleKeywords.join(', ')}; lighting ${plan.visualIdentity.lighting}`
      : undefined
    // Region localization (e.g. Indian models for India) rides along on styleNote
    // into every image prompt, so humans always match the target shopper.
    const regionNote = localizationDirective(input.region)
    const styleNote = [planNote, regionNote].filter(Boolean).join(' · ') || undefined
    const dirPalette = plan?.visualIdentity.palette
    await mark('concepts', 'done'); await mark('images', 'active')

    // 6. Build image prompts for every asset. Quantities are user-controllable
    // (clamped to safe maximums); defaults match the classic kit.
    const assets: OrchestratorResult['assets'] = []
    const c = input.counts || {}
    const clampN = (n: number | undefined, def: number, max: number) =>
      Math.max(0, Math.min(typeof n === 'number' ? Math.round(n) : def, max))
    const counts = {
      // Standard per-SKU kit = 9 images (1 main + these) + 7 A+ + 1 video.
      lifestyle: clampN(c.lifestyle, 2, 4),
      infographic: clampN(c.infographic, 2, 4),
      aPlus: clampN(c.aPlus, 7, 7),
      productPhoto: clampN(c.productPhoto, 1, 6),
      dimension: clampN(c.dimension, 1, 2),
      detail: clampN(c.detail, 2, 4),
      video: clampN(c.video, 1, 2),
    }
    // Catalog images MUST use the target platform's required aspect ratio
    // (Amazon 1:1 square, Myntra/Namshi 3:4 portrait, etc.) — never a hardcoded
    // ratio. A+ modules stay wide (banner) and ads keep their channel ratio.
    const platformImgRatio = getPlatform(input.platform).image.aspectRatio
    const bullets = scraped.product.bullets
    const lifeScene = (i: number) => {
      const s = plan?.lifestyleScenes
      return s && s.length ? s[i % s.length] : undefined
    }

    if (labs.includes('PhotoLab')) {
      // Main image - always exactly one.
      assets.push({
        type: 'main_image',
        lab: 'ListingLab',
        prompt: buildMainImagePrompt({
          productName: scraped.product.title,
          brand: scraped.product.brand,
          category: scraped.product.category || 'general',
          keyFeatures: bullets,
        }),
        status: 'pending',
      })
      // Lifestyle scenes (user count).
      const lifeMoods = ['premium', 'casual', 'cozy', 'energetic'] as const
      for (let i = 0; i < counts.lifestyle; i++) {
        assets.push({
          type: 'lifestyle',
          lab: 'ListingLab',
          prompt: buildLifestylePrompt({
            productName: scraped.product.title,
            brand: scraped.product.brand,
            category: scraped.product.category || 'general',
            keyFeatures: bullets,
            useCase: bullets[i] || 'everyday use',
            targetAudience: input.targetAudience || 'modern consumer',
            mood: lifeMoods[i % lifeMoods.length],
            scene: lifeScene(i),
            styleNote,
          }),
          status: 'pending',
        })
      }
      // Infographics (user count).
      for (let i = 0; i < counts.infographic; i++) {
        assets.push({
          type: 'infographic',
          lab: 'ListingLab',
          prompt: buildInfographicPrompt({
            productName: scraped.product.title,
            brand: scraped.product.brand,
            keyFeatures: bullets,
            specs: [],
          }),
          status: 'pending',
        })
      }
      // Dimension / size images (user count) — show the product's real size with
      // clean measurement callouts, like a spec/dimension diagram on Amazon.
      for (let i = 0; i < counts.dimension; i++) {
        assets.push({
          type: 'dimension',
          lab: 'ListingLab',
          prompt: buildDimensionPrompt({
            productName: scraped.product.title,
            brand: scraped.product.brand,
            category: scraped.product.category || 'general',
            dimensions: dimensionText(scraped.product),
            styleNote,
          }),
          status: 'pending',
        })
      }
      // Macro detail / angle shots — extreme close-ups of texture, print and finish.
      for (let i = 0; i < counts.detail; i++) {
        assets.push({
          type: 'detail',
          lab: 'ListingLab',
          prompt: buildDetailPrompt({
            productName: scraped.product.title,
            brand: scraped.product.brand,
            category: scraped.product.category || 'general',
            feature: bullets[i] || 'material texture and print detail',
            styleNote,
          }),
          status: 'pending',
        })
      }
    }

    // A+ content modules as images (from the generated A+ copy).
    if (labs.includes('APlusLab') && counts.aPlus > 0 && (plan?.aPlus?.length || listing?.aPlusContent?.length)) {
      const moduleTypes = ['brand-story', 'comparison-chart', 'lifestyle', 'spec-table'] as const
      // Prefer the Creative Director's art-directed, distinct modules (built from
      // the full product analysis); fall back to the listing's A+ copy.
      const aplusSource: any[] =
        plan?.aPlus?.length
          ? plan.aPlus
          : (listing!.aPlusContent || []).map((m: any, i: number) => ({
              layout: moduleTypes[i % moduleTypes.length],
              headline: m.heading,
              body: m.body,
              scene: '',
            }))
      // Guarantee the user always gets a comparison chart in their A+ set: if one
      // exists but falls outside the requested count, pull it into range.
      if (!aplusSource.slice(0, counts.aPlus).some((m: any) => m.layout === 'comparison-chart')) {
        const idx = aplusSource.findIndex((m: any) => m.layout === 'comparison-chart')
        if (idx >= counts.aPlus) {
          const [chart] = aplusSource.splice(idx, 1)
          aplusSource.splice(Math.max(0, counts.aPlus - 1), 0, chart)
        }
      }
      aplusSource.slice(0, counts.aPlus).forEach((mod: any, i: number) => {
        assets.push({
          type: 'a_plus_module',
          lab: 'ListingLab',
          prompt: buildAPlusPrompt({
            productName: scraped.product.title,
            brand: scraped.product.brand,
            story: mod.headline || mod.heading || '',
            body: mod.body,
            keyFeatures: scraped.product.bullets,
            moduleType: mod.layout || moduleTypes[i % moduleTypes.length],
            comparison: mod.comparison || undefined,
            scene: mod.scene || undefined,
            palette: dirPalette,
            styleNote,
          }),
          status: 'pending',
        })
      })
    }

    // PhotoLab - product photography scenes (user count).
    if (labs.includes('PhotoLab') && counts.productPhoto > 0) {
      const photoMoods = ['premium', 'energetic', 'minimal', 'casual', 'cozy'] as const
      for (let i = 0; i < counts.productPhoto; i++) {
        const mood = photoMoods[i % photoMoods.length]
        assets.push({
          type: 'product_photo',
          lab: 'PhotoLab',
          prompt: buildLifestylePrompt({
            productName: scraped.product.title,
            brand: scraped.product.brand,
            category: scraped.product.category || 'general',
            keyFeatures: bullets,
            useCase: bullets[i] || 'in use',
            targetAudience: input.targetAudience || 'modern consumer',
            mood,
            scene: lifeScene(i + 2),
            styleNote,
          }),
          status: 'pending',
        })
      }
    }


    // Enforce the platform's catalog aspect ratio on every product/catalog image
    // (main, lifestyle, product photos, infographics). A+ modules and ad creatives
    // keep their own ratios (banner / ad-channel).
    for (const asset of assets) {
      if (['main_image', 'lifestyle', 'product_photo', 'infographic', 'dimension', 'detail'].includes(asset.type)) {
        asset.prompt.technical.aspectRatio = platformImgRatio
      }
    }

    // PRODUCT LOCK: attach the REAL scraped product photo to every product image
    // so generation is image-to-image (edit) and the product design never changes.
    const refImage = (scraped.product.images || []).find((u) => typeof u === 'string' && u.startsWith('http'))
    if (refImage) {
      for (const asset of assets) {
        if (['main_image', 'lifestyle', 'product_photo', 'a_plus_module', 'infographic', 'dimension', 'detail'].includes(asset.type)) {
          asset.prompt.referenceImageUrl = refImage
        }
      }
    }

    // 7. Persist asset prompts, then generate images IN PARALLEL across the pool.
    const canImage = generateImages && !!getImageProvider()
    // Create all asset rows first (fast).
    for (const asset of assets) {
      const assetRecord = await db.asset.create({
        data: {
          campaignId: campaign.id,
          type: asset.type,
          lab: asset.lab,
          prompt: asset.prompt.textPrompt,
          promptJson: asset.prompt as any,
          status: canImage ? 'generating' : 'pending',
        },
      })
      asset.id = assetRecord.id
    }

    if (canImage) {
      progressState.images.total = assets.length
      await writeProgress()
      // Generate concurrently, each worker starting on a different gpt-image-2
      // resource (poolOffset). This spreads load across all endpoints so a batch
      // finishes ~Nx faster and stays well within the request timeout — no more
      // half-generated campaigns stuck on "pending".
      const poolSize = Math.max(1, config.azure.image.pool.length || 1)
      const CONCURRENCY = Math.min(6, Math.max(2, poolSize))
      let cursor = 0
      const worker = async (wi: number) => {
        while (true) {
          const i = cursor++
          if (i >= assets.length) return
          const asset = assets[i]
          try {
            const result = await generateImage(asset.prompt, { model: bestModelFor(asset.type), poolOffset: i })
            const url = result.url.startsWith('data:')
              ? await saveBase64(result.url, 'png', asset.type)
              : result.url
            asset.imageUrl = url
            asset.status = 'completed'
            await charge('image', { campaignId: campaign.id, provider: result.provider, model: result.model })
            await db.asset.update({
              where: { id: asset.id! },
              data: { imageUrl: url, status: 'completed', metadata: { provider: result.provider, model: result.model } as any },
            })
            progressState.images.done++
            await writeProgress()
          } catch (e: any) {
            asset.status = 'failed'
            asset.error = e.message
            errors.push(`Image gen failed for ${asset.type}: ${e.message}`)
            await db.asset.update({ where: { id: asset.id! }, data: { status: 'failed' } }).catch(() => {})
          }
        }
      }
      await Promise.all(Array.from({ length: CONCURRENCY }, (_, wi) => worker(wi)))
    }

    // 8. VideoLab - script + product video (only for platforms that allow video).
    let video: OrchestratorResult['video'] = null
    const platformVideo = getPlatform(input.platform).video
    const videoAllowed = platformVideo.allowed !== false
    if (labs.includes('VideoLab') && (input.generateVideo ?? false) && getVideoProvider() && videoAllowed && counts.video > 0) {
      await mark('images', 'done'); await mark('video', 'active')
      // Landscape product-overview video(s) — count is user-controllable (1-2).
      const vRatio = videoRatioFor(platformVideo.aspectRatio)
      for (let i = 0; i < counts.video; i++) {
        try {
          const v = await generateProductVideo(scraped, input.targetAudience, vRatio, 'overview')
          if (i === 0) video = v
          await db.asset.create({
            data: {
              campaignId: campaign.id,
              type: 'product_video',
              lab: 'VideoLab',
              prompt: v.script,
              videoUrl: v.url,
              imageUrl: v.voiceoverUrl,
              status: 'completed',
              metadata: { voiceoverUrl: v.voiceoverUrl } as any,
            },
          })
          await charge('video', { campaignId: campaign.id, provider: 'azure', model: 'sora-2' })
        } catch (e: any) {
          errors.push(`Video ${i + 1} generation failed: ${e.message}`)
        }
      }
    } else if (labs.includes('VideoLab') && (input.generateVideo ?? false) && !videoAllowed) {
      errors.push(`${getPlatform(input.platform).label} does not support product video, so it was skipped.`)
    }

    // 9. Mark campaign complete — flip any remaining steps to done so the bar hits 100%.
    for (const s of progressState.steps) if (s.status !== 'done') s.status = 'done'
    await writeProgress()
    await db.campaign.update({ where: { id: campaign.id }, data: { status: 'completed' } })

    // Automated "campaign ready" email (best-effort) when a user rendered images.
    if (userId && generateImages) {
      try {
        const user = await db.user.findUnique({ where: { id: userId } })
        if (user?.email) {
          const { sendEmail, campaignReadyEmail } = await import('@/lib/email')
          const { subject, html, text } = campaignReadyEmail(scraped.product.title, assets.length, `${config.app.url}/studio`)
          await sendEmail({ to: user.email, subject, html, text })
        }
      } catch (e) {
        await logError('orchestrator.campaignReadyEmail', e)
      }
    }

    return {
      campaignId: campaign.id,
      asin: input.asin,
      status: errors.length === 0 ? 'completed' : 'partial',
      scraped,
      competitors: competitors || ({} as CompetitorReport),
      keywords: mergedKeywords,
      brandDna,
      angles,
      listing,
      video,
      assets,
      creditsCharged,
      errors,
      durationMs: Date.now() - start,
    }
  } catch (e: any) {
    await db.campaign.update({ where: { id: campaign.id }, data: { status: 'failed', error: e.message } }).catch(() => {})
    throw e
  }
}

// ====== Raw mode: synthesize a ScrapeResult from user-provided product ======

// Turn a free-text description into a few clean "feature" bullets so the creative
// director + image prompts have key points to work with (the listing generator
// will still write the final, policy-safe bullets).
function splitToBullets(description: string): string[] {
  return (description || '')
    .split(/[\n.;•]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12)
    .slice(0, 6)
}

function buildRawScrapeResult(raw: NonNullable<OrchestratorInput['raw']>): ScrapeResult {
  return {
    product: {
      asin: 'RAW',
      title: raw.title,
      brand: raw.brand || '',
      price: raw.price || 0,
      currency: raw.currency || 'USD',
      rating: 0,
      reviewCount: 0,
      category: raw.category || 'general',
      features: [],
      description: raw.description || '',
      bullets: splitToBullets(raw.description || ''),
      images: raw.heroImageUrl ? [raw.heroImageUrl] : [],
      variants: [],
      dimensions: raw.dimensions ? { size: raw.dimensions } : undefined,
      availability: 'in stock',
      marketplace: 'RAW',
      scrapedAt: new Date().toISOString(),
    },
    reviews: [],
    reviewInsights: { total: 0, avgRating: 0, topPraises: [], topComplaints: [], desiredImprovements: [], keywords: [] },
    provider: 'raw',
  }
}

// ====== Listing generation with self-healing ======

async function generateListing(scraped: ScrapeResult, targetAudience?: string, platform: PlatformPack = getPlatform('amazon_in')) {
  const c = platform.content
  const system: TextMessage = {
    role: 'system',
    content: `You are a ${platform.label} listing optimization expert following ${platform.label}'s CURRENT (2026) style guidelines. Generate a high-converting, policy-compliant listing as JSON tailored to ${platform.label}.

TITLE rules (${platform.label}):
- ${c.titleStructure}.
- HARD MAX ${c.titleMax} characters including spaces — never exceed it. Front-load the most important keywords.
- Title Case. NO ALL-CAPS words, NO emojis, NO special characters, NO price, NO promotional/subjective words (best, cheap, free, sale, #1, perfect, guaranteed). NO em-dashes.
${c.highlightsMax ? `\nITEM HIGHLIGHTS field: one line, max ${c.highlightsMax} chars, material/use-case details that don't fit the title (do not repeat title keywords).` : ''}
BULLET rules (${platform.label}):
- Exactly ${c.bulletCount} bullets. Each starts with a concise 2-4 word benefit label in Title Case + colon (e.g. "Premium Build:").
- Each up to ${c.bulletMaxChars} chars. Lead with the customer benefit, then the feature. NO emojis, NO special symbols, NO promo claims, NO em-dashes, NO HTML.

DESCRIPTION: up to ${c.descriptionMax} chars, no HTML.${c.bilingual ? ' Provide clean English; this platform also supports Arabic (English is fine here).' : ''}

FEATURES: exactly 5 concise, standalone product features/specs (2-5 words each, e.g. "210 TC Cotton", "Machine Washable", "Fade Resistant", "Skin-Friendly Weave", "Fits King Beds") — factual attributes, distinct from the benefit-led bullets. No punctuation clutter.

A+ / enhanced content: 3 modules, each a heading (3-6 words) + body (100+ chars) telling a benefit-led brand story.

COSMO / RUFUS / AEO (Amazon AI-search era, 2026):
- Amazon's COSMO engine and the Rufus shopping assistant rank on semantic relevance and real-world usage context, not just exact-match keywords. Write for intent: name the use-cases, occasions, compatible items, and problems solved (e.g. "for long gaming sessions", "fits standard desks", "for broad shoulders").
- Front-load a clear, natural-language value proposition Rufus can quote when a shopper asks "which X is best for Y". Answer implicit buyer questions inside the bullets.

REVIEW INTELLIGENCE (this is your edge, use it):
- The customer language below comes from real reviews. Weave the SPECIFIC features buyers praise into the title/bullets using their own words (if reviewers love an "anti-leak lid" or "no-slip grip", name that exact benefit).
- Proactively DEFUSE the top complaints and expectation gaps: if reviews say a product "looks grey not black" or "runs small", pre-empt it honestly in a bullet or A+ module (accurate color/size expectations, what to expect) so buyers trust the listing.
- Turn frequent review keywords into natural keyword coverage. Never fabricate features the product does not have.

Return JSON: { "title": string, ${c.highlightsMax ? '"itemHighlight": string, ' : ''}"bullets": string[], "features": string[], "description": string, "aPlusContent": [{ "heading": string, "body": string }] }`,
  }
  const ins = scraped.reviewInsights
  const user: TextMessage = {
    role: 'user',
    content: `Product: ${scraped.product.title}
Brand: ${scraped.product.brand}
Category: ${scraped.product.category || 'general'}
Price: ${scraped.product.price} ${scraped.product.currency}
Rating: ${scraped.product.rating}/5 (${scraped.product.reviewCount} reviews)
Existing bullets: ${scraped.product.bullets.join(' | ')}

--- REVIEW INTELLIGENCE (${ins.total} reviews analyzed) ---
Loved features (echo these): ${ins.topPraises.join(' | ') || '(none captured)'}
Top complaints (defuse these): ${ins.topComplaints.join(' | ') || '(none captured)'}
Expectation gaps / requests: ${ins.desiredImprovements.join(' | ') || '(none captured)'}
Frequent review keywords: ${(ins.keywords || []).slice(0, 12).map((k) => k.word).join(', ') || '(none)'}
--------------------------------------------------

Target audience: ${targetAudience || 'general consumer'}

Generate the listing JSON now, applying the review intelligence above.`,
  }

  const { data } = await generateJSON<any>([system, user], { temperature: 0.7, maxTokens: 2000 })

  const titleValidation = validateTitle(data.title, scraped.product)
  if (!titleValidation.valid) {
    const healedTitle = await healTitle({ product: scraped.product, badTitle: data.title, fixes: titleValidation.fixes })
    data.title = healedTitle
  }

  // Hard-strip banned promotional words the model occasionally slips through, so
  // policy-violating copy never ships to the user (Amazon rejects these).
  data.title = stripPromo(data.title)
  // Hard-enforce the platform title limit (Amazon 75) at a whole-word boundary so
  // it's always compliant and scores full on IDQ.
  if (data.title && data.title.length > c.titleMax) {
    data.title = data.title.slice(0, c.titleMax).replace(/\s+\S*$/, '').trim()
  }
  data.bullets = (data.bullets || []).map(stripPromo)
  data.description = stripPromo(data.description || '')
  data.itemHighlight = stripPromo(data.itemHighlight || '')
  data.features = (data.features || []).map(stripPromo).filter(Boolean).slice(0, 5)
  data.aPlusContent = (data.aPlusContent || []).map((m: any) => ({
    heading: stripPromo(m?.heading || ''),
    body: stripPromo(m?.body || ''),
  }))

  const bulletValidation = validateBullets(data.bullets || [], scraped.product)

  return {
    title: data.title,
    itemHighlight: data.itemHighlight || '',
    bullets: data.bullets || [],
    features: data.features || [],
    description: data.description || '',
    aPlusContent: data.aPlusContent || [],
    selfHealing: { title: titleValidation, bullets: bulletValidation },
  }
}

// Remove Amazon-banned subjective/promo words (safe set only - never touches
// context-dependent words like "free" that appear in "BPA-free"). Cleans up the
// resulting spacing/punctuation so the copy stays grammatical.
const BANNED_PROMO = /\b(best|#1|no\.?\s*1|guaranteed?|bestseller|amazing|incredible|unbeatable|world[- ]?class|top[- ]?rated)\b/gi
function stripPromo(s: string): string {
  if (!s) return s
  return s
    .replace(BANNED_PROMO, '')
    // Remove em/en/horizontal/figure dashes entirely (keep normal hyphens like
    // "BPA-free"/"anti-skid"). We never ship an em-dash in content or images.
    .replace(/\s*[‒–—―]\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .replace(/([.,;:])\1+/g, '$1')
    .trim()
}

// ====== Brand DNA synthesis (Opus) ======

async function generateBrandDna(scraped: ScrapeResult, competitors: CompetitorReport | null) {
  const r = scraped.reviewInsights
  const system: TextMessage = {
    role: 'system',
    content: `You are a brand strategist. From an Amazon product's data + reviews, synthesize the product's full "Brand DNA".
Return JSON:
{
  "positioning": string (one-line positioning statement),
  "idealCustomer": string (ICP description),
  "sentiment": { "positive": number, "neutral": number, "negative": number } (percentages summing ~100),
  "loves": string[] (what customers love, 4-6),
  "painPoints": string[] (top complaints, 4-6),
  "returnReasons": string[] (likely reasons for returns, inferred from reviews, 3-5),
  "improvements": string[] (concrete product/listing improvements, 4-6),
  "toneOfVoice": string[] (3-5 adjectives for the brand voice),
  "competitiveEdge": string (how to differentiate vs competitors),
  "keyThemes": { "theme": string, "mentions": number }[] (5-8 recurring themes)
}`,
  }
  const user: TextMessage = {
    role: 'user',
    content: `Product: ${scraped.product.title}
Brand: ${scraped.product.brand}
Category: ${scraped.product.category || 'general'}
Price: ${scraped.product.price} ${scraped.product.currency} | Rating: ${scraped.product.rating}/5 (${scraped.product.reviewCount} reviews)
Features: ${scraped.product.bullets.join(' | ')}
Top praises: ${r.topPraises.join(' | ')}
Top complaints: ${r.topComplaints.join(' | ')}
Desired improvements: ${r.desiredImprovements.join(' | ')}
Review keywords: ${r.keywords.map((k) => `${k.word}(${k.count})`).join(', ')}
Sample reviews: ${scraped.reviews.slice(0, 8).map((rv) => `[${rv.rating}★] ${rv.title}: ${rv.body.slice(0, 160)}`).join('\n')}
Competitors: ${competitors?.topBrands?.map((b) => b.brand).slice(0, 5).join(', ') || 'unknown'}

Synthesize the Brand DNA JSON now.`,
  }
  const { data } = await generateJSON<any>([system, user], { maxTokens: 3000 })
  return data
}

// ====== Comprehensive keyword analysis (Opus) ======

async function expandKeywords(
  scraped: ScrapeResult,
  competitors: CompetitorReport | null,
): Promise<{ keyword: string; intent: string; source: string }[]> {
  const system: TextMessage = {
    role: 'system',
    content: `You are an Amazon SEO + PPC keyword strategist. Generate a COMPREHENSIVE keyword set for a product.
Include: primary/head terms, long-tail buyer phrases, competitor & comparison terms, problem/use-case terms, and seasonal/gift terms.
Return JSON: { "keywords": [{ "keyword": string, "intent": "informational"|"commercial"|"transactional", "type": "head"|"long-tail"|"competitor"|"use-case"|"seasonal" }] }
Return 30-40 diverse, realistic keywords a shopper would actually type.`,
  }
  const user: TextMessage = {
    role: 'user',
    content: `Product: ${scraped.product.title}
Brand: ${scraped.product.brand}
Category: ${scraped.product.category || 'general'}
Features: ${scraped.product.bullets.slice(0, 6).join(' | ')}
Top praises: ${scraped.reviewInsights.topPraises.join(' | ')}
Top complaints: ${scraped.reviewInsights.topComplaints.join(' | ')}
Competitor brands: ${competitors?.topBrands?.map((b) => b.brand).slice(0, 5).join(', ') || 'unknown'}
Competitor title terms: ${competitors?.commonKeywords?.map((k) => k.word).slice(0, 10).join(', ') || 'unknown'}

Generate the comprehensive keyword JSON now.`,
  }
  const { data } = await generateJSON<{ keywords: any[] }>([system, user], { maxTokens: 3000 })
  return (data.keywords || []).map((k) => ({
    keyword: String(k.keyword || '').trim(),
    intent: k.intent || 'commercial',
    source: k.type || 'llm',
  })).filter((k) => k.keyword)
}

// ====== Ad angle generation ======

async function generateAngles(
  scraped: ScrapeResult,
  competitors: CompetitorReport | null,
  targetAudience?: string,
): Promise<any[]> {
  const system: TextMessage = {
    role: 'system',
    content: `You are an ad creative strategist. Generate 8-12 ad angles for a product.
Return JSON: { "angles": [{ "angleType": "social-proof"|"before-after"|"problem-solution"|"testimonial"|"us-vs-them"|"feature-highlight"|"use-case"|"pain-point"|"aspirational"|"educational", "headline": string (max 60 chars), "subheadline": string, "cta": string, "predictedScore": number (0-100), "reasoning": string }] }`,
  }
  const user: TextMessage = {
    role: 'user',
    content: `Product: ${scraped.product.title}
Brand: ${scraped.product.brand}
Top features: ${scraped.product.bullets.slice(0, 5).join(' | ')}
Top praises: ${scraped.reviewInsights.topPraises.join(' | ')}
Top complaints: ${scraped.reviewInsights.topComplaints.join(' | ')}
Competitor price range: ${competitors?.priceRange ? `$${competitors.priceRange.min}-$${competitors.priceRange.max}` : 'unknown'}
Target audience: ${targetAudience || 'general consumer'}

Generate the angles JSON now.`,
  }

  const { data } = await generateJSON<{ angles: any[] }>([system, user], { temperature: 0.8, maxTokens: 2500 })
  const angles = data.angles || []
  validateAdAngles(angles)
  return angles.sort((a, b) => (b.predictedScore || 0) - (a.predictedScore || 0))
}

// ====== VideoLab: clean product video (Sora) + voiceover ======

// Map a platform's video aspect ratio to the set Sora supports.
function videoRatioFor(ratio: string): '16:9' | '9:16' | '1:1' {
  if (ratio === '9:16') return '9:16'
  if (ratio === '1:1') return '1:1'
  if (ratio === '3:4' || ratio === '4:5') return '9:16' // nearest portrait
  return '16:9' // default landscape (Amazon/Flipkart/Noon)
}

// Pull a human-readable size/dimension string from the product (spec field, else
// a "L x W x H unit" pattern in the title/description).
function dimensionText(product: any): string {
  const d = product?.dimensions
  if (d?.size) return String(d.size)
  const hay = `${product?.title || ''} ${product?.description || ''}`
  const m = hay.match(/(\d[\d.,]*\s*[x×]\s*\d[\d.,]*(?:\s*[x×]\s*\d[\d.,]*)?\s*(?:cm|mm|m|in|inch|inches|ft|"|')?)/i)
  return m ? m[1].trim() : ''
}

async function generateProductVideo(
  scraped: ScrapeResult,
  targetAudience?: string,
  aspectRatio: '16:9' | '9:16' | '1:1' = '16:9',
  style: 'ugc' | 'overview' = 'overview',
) {
  const isUgc = style === 'ugc'
  let script = isUgc
    ? `Okay I have to show you this ${scraped.product.title} — honestly obsessed. You need this.`
    : `${scraped.product.title}. Crafted for everyday quality. Discover it today.`
  let visualPrompt = isUgc
    ? `Authentic UGC-style vertical selfie video: a real person casually showing and using ${scraped.product.title} at home, handheld phone feel, natural light, genuine and relatable`
    : `A clean, premium commercial product overview video of ${scraped.product.title}, smooth cinematic camera moves, professional studio and lifestyle shots, elegant lighting, product hero focus`

  // If an LLM is available, script it properly.
  if (getLLMProvider()) {
    try {
      const { data } = await generateJSON<{ script: string; visualPrompt: string }>(
        [
          {
            role: 'system',
            content: isUgc
              ? 'You write authentic UGC (user-generated-content) video ad scripts — a real customer talking to camera, casual and genuine. Return JSON: { "script": string (2-3 sentences, first-person, conversational), "visualPrompt": string (a vivid text-to-video prompt: handheld selfie feel, real home, natural light) }'
              : 'You write short, premium PRODUCT OVERVIEW video scripts (brand-quality, not amateur UGC). Return JSON: { "script": string (2-3 sentences, confident and clean voiceover), "visualPrompt": string (a vivid text-to-video prompt: polished commercial shots, camera moves, lighting, product focus) }',
          },
          {
            role: 'user',
            content: `Product: ${scraped.product.title} by ${scraped.product.brand}. Key features: ${scraped.product.bullets.slice(0, 3).join('; ')}. Audience: ${targetAudience || 'modern consumer'}.`,
          },
        ],
        { temperature: 0.8, maxTokens: 600 },
      )
      if (data.script) script = data.script
      if (data.visualPrompt) visualPrompt = data.visualPrompt
    } catch {
      /* fall back to defaults */
    }
  }

  // One next-level ~12s clip (Sora max): product hero + on-screen feature text,
  // soft/no audio, landscape, product-consistent.
  const productDesc = `${scraped.product.title} by ${scraped.product.brand}${scraped.product.category ? `, a ${scraped.product.category}` : ''}`
  const featureText = scraped.product.bullets.slice(0, 3).map((b) => b.split(/[:.]/)[0].trim().split(/\s+/).slice(0, 4).join(' ')).filter(Boolean).join(', ')
  const finalPrompt = `${visualPrompt}\n\nA next-level, high-end commercial product video of ${productDesc}. Show the product beautifully from several angles with smooth cinematic camera moves and soft premium lighting. Overlay short, clean on-screen TEXT callouts of the key features${featureText ? ` (${featureText})` : ''} in a modern sans-serif, appearing tastefully one at a time. Keep the product 100% identical throughout. AUDIO: no voiceover or speech at all - only soft, gentle background music (or silence). Magazine-quality, polished, about 12 seconds.`
  const videoResult = await generateVideo({ prompt: finalPrompt, aspectRatio, seconds: 12 }, { maxWaitMs: 12 * 60 * 1000 })

  let voiceoverUrl: string | undefined
  try {
    const vo = await generateVoiceover({ text: script, format: 'mp3' })
    voiceoverUrl = vo.url
  } catch {
    /* voiceover optional */
  }

  return { url: videoResult.url, script, voiceoverUrl }
}
