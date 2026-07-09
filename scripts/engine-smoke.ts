// Runtime smoke test for the v2 engine. Two isolated scenarios:
//   A. Resilience: validators force regenerates, a throwing generator is skipped,
//      counts produce N indexed assets, IDQ scores.
//   B. Intelligence: a fake brandStore and keywordProvider feed the builders, and
//      the resulting Brand File and Node File reach the Listing File.
//
// Run: npm run smoke:engine

import {
  configureEngine,
  registerGenerator,
  registerScraper,
  run,
  scoreIdq,
  scoreListingQuality,
  optimizeListing,
  getPlatform,
  _resetEngineForTests,
  type Asset,
  type Ctx,
  type ListingCopy,
} from '../src/core'

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg)
    process.exit(1)
  }
  console.log('ok:', msg)
}

const log = {
  debug: () => {},
  info: (m: string) => console.log('  [info]', m),
  warn: (m: string) => console.log('  [warn]', m),
  error: (m: string) => console.log('  [error]', m),
}
const ctx: Ctx = { orgId: 'org_test', log, now: () => new Date(0) }

let idc = 0
const newId = () => `id_${++idc}`

// --- Scenario A: resilience + self-heal -------------------------------------
async function resilienceScenario() {
  console.log('\n[A] resilience + self-heal')
  _resetEngineForTests()
  configureEngine() // no services: vision validator degrades to pass

  registerScraper({
    id: 'scraper.test',
    supports: (ref) => ref.platform === 'test',
    async fetch(ref) {
      return {
        externalId: ref.externalId,
        platform: 'test',
        title: 'Test Product',
        bullets: ['b1', 'b2', 'b3', 'b4', 'b5'],
        features: ['f1', 'f2', 'f3', 'f4', 'f5'],
        description: 'x'.repeat(250),
        images: ['https://example.test/src.jpg'],
      }
    },
  })

  let heroAttempts = 0
  registerGenerator({
    id: 'gen.hero',
    kind: 'image.hero',
    async generate(_l, _p, _c, options): Promise<Asset> {
      heroAttempts++
      const caption = options?.comment
        ? 'Soft and Breathable'
        : 'This on image caption is deliberately far too long for a mobile screen to read'
      return {
        id: newId(),
        kind: 'image.hero',
        moduleKey: 'gen.hero',
        url: 'https://example.test/hero.jpg',
        meta: { caption },
        version: 1,
        validationStatus: 'pending',
      }
    },
  })

  let listingAttempts = 0
  const EM = String.fromCharCode(0x2014)
  registerGenerator({
    id: 'gen.listing',
    kind: 'listing',
    async generate(_l, _p, _c, options): Promise<Asset> {
      listingAttempts++
      const title = options?.comment ? 'Cortina Bedsheet Set' : `Cortina ${EM} Bedsheet Set`
      return {
        id: newId(),
        kind: 'listing',
        moduleKey: 'gen.listing',
        url: '',
        meta: { title, bullets: ['b1', 'b2', 'b3', 'b4', 'b5'], features: ['f1', 'f2', 'f3', 'f4', 'f5'], description: 'y'.repeat(250), searchTerms: 'cotton bedsheet king' },
        version: 1,
        validationStatus: 'pending',
      }
    },
  })

  registerGenerator({
    id: 'gen.video',
    kind: 'video',
    async generate(): Promise<Asset> {
      throw new Error('simulated model outage')
    },
  })

  registerGenerator({
    id: 'gen.detail',
    kind: 'image.detail',
    async generate(_l, _p, _c, opts): Promise<Asset> {
      return {
        id: `d_${opts?.index ?? 0}`,
        kind: 'image.detail',
        moduleKey: 'gen.detail',
        url: 'https://example.test/detail.jpg',
        meta: { caption: 'Close up', index: opts?.index },
        version: 1,
        validationStatus: 'pending',
      }
    },
  })

  const result = await run(
    { source: { platform: 'test', externalId: 'TEST123' }, targetPlatform: 'amazon_in', labs: ['listing', 'image.hero', 'video'] },
    ctx,
    newId,
  )

  const hero = result.assets.find((a) => a.kind === 'image.hero')
  const listing = result.assets.find((a) => a.kind === 'listing')
  assert(heroAttempts === 2, 'hero regenerated exactly once after the mobile check failed')
  assert(hero?.validationStatus === 'passed', 'hero passed validation after the fix')
  assert(listingAttempts === 2, 'listing regenerated once after the em dash was caught')
  assert(listing?.validationStatus === 'passed', 'listing passed compliance after the fix')
  assert(!result.assets.some((a) => a.kind === 'video'), 'throwing video generator was skipped, not fatal')
  assert(result.assets.length === 2, 'campaign completed with the two healthy assets')

  const idq = scoreIdq(result.assets, getPlatform('amazon_in'))
  assert(idq.score > 0 && idq.score <= 100, `IDQ scored (${idq.score})`)

  const counted = await run(
    { source: { platform: 'test', externalId: 'T2' }, targetPlatform: 'amazon_in', labs: ['image.detail'], counts: { 'image.detail': 3 } },
    ctx,
    newId,
  )
  const details = counted.assets.filter((a) => a.kind === 'image.detail')
  assert(details.length === 3, 'counts produced exactly 3 detail assets')
  assert(new Set(details.map((a) => a.meta.index)).size === 3, 'each of the 3 assets got a distinct index')
}

// --- Scenario B: intelligence layer -----------------------------------------
async function intelligenceScenario() {
  console.log('\n[B] intelligence layer')
  _resetEngineForTests()
  // Fake services feed the real builders.
  configureEngine({
    brandStore: {
      async get(brandId) {
        return brandId === 'brand_cortina'
          ? {
              brandId,
              name: 'Cortina',
              colors: { primary: '#123456', secondary: '#abcdef' },
              fonts: { display: 'Poppins', body: 'Inter' },
              voice: 'warm, premium, homely',
            }
          : null
      },
    },
    keywordProvider: {
      id: 'kw.fake',
      async keywords() {
        return [
          { term: 'king size bedsheet', intent: 'transactional', source: 'fake', volume: 5000 },
          { term: 'how to wash microfiber', intent: 'informational', source: 'fake' },
        ]
      },
    },
    bestSellerProvider: {
      id: 'bs.fake',
      async topSellers() {
        return [
          { externalId: 'C1', title: 'Premium Cotton King Bedsheet Set', bullets: ['soft cotton weave'], price: 999, bsr: 120 },
          { externalId: 'C2', title: 'Cotton King Bedsheet Breathable', bullets: ['breathable cotton'], price: 899, bsr: 340 },
        ]
      },
    },
  })

  registerScraper({
    id: 'scraper.test',
    supports: (ref) => ref.platform === 'test',
    async fetch(ref) {
      return {
        externalId: ref.externalId,
        platform: 'test',
        title: 'Cortina Bedsheet',
        brand: 'Cortina',
        bullets: ['soft', 'breathable'],
        features: ['microfiber'],
        images: ['https://example.test/p.jpg'],
        nodeExternalId: 'node_bedsheets',
      }
    },
  })

  registerGenerator({
    id: 'gen.listing',
    kind: 'listing',
    async generate(l): Promise<Asset> {
      return {
        id: `${l.id}:listing`,
        kind: 'listing',
        moduleKey: 'gen.listing',
        url: '',
        meta: { title: 'Cortina Bedsheet', bullets: [], features: [], voiceSeen: l.brand?.voice ?? null },
        version: 1,
        validationStatus: 'pending',
      }
    },
  })

  const result = await run(
    { source: { platform: 'test', externalId: 'C1' }, targetPlatform: 'amazon_in', brandId: 'brand_cortina', labs: ['listing'] },
    ctx,
    newId,
  )

  assert(result.listing.brand?.name === 'Cortina', 'brand file built and attached to the listing')
  assert(result.listing.brand?.compliance.forbidden.includes('em-dash') === true, 'brand compliance inherits the no-dash rule')
  assert((result.listing.node?.keywords.length ?? 0) >= 2, 'node file built with keywords from the provider')
  assert(
    result.listing.node?.keywords.some((k) => k.source === 'fake') === true,
    'provider keywords retained alongside mined best-seller keywords',
  )
  assert(
    result.listing.node?.keywords.some((k) => k.intent === 'transactional') === true,
    'node keywords carry buyer intent',
  )
  const listingAsset = result.assets.find((a) => a.kind === 'listing')
  assert(listingAsset?.meta.voiceSeen === 'warm, premium, homely', 'brand voice reached the generator')

  // Best-sellers: BSR turned into demand signals, winning keywords mined and merged.
  assert((result.listing.node?.bestSellers.length ?? 0) === 2, 'node file built with 2 best-sellers')
  const topSeller = result.listing.node?.bestSellers[0]
  const est = (topSeller?.signals as Record<string, unknown> | undefined)?.estMonthlySales
  assert(typeof est === 'number' && est > 0, 'best-seller carries an estimated-sales signal from BSR')
  assert(
    result.listing.node?.keywords.some((k) => k.source === 'best-seller') === true,
    'winning keywords mined from best-sellers merged into the node',
  )
}

// --- Scenario C: agentic optimizer (marketplace-aware self-improvement) ----
async function optimizerScenario() {
  console.log('\n[C] agentic optimizer')
  const platform = getPlatform('amazon_in')
  const keywords = [
    { term: 'cotton bedsheet king size', intent: 'transactional' as const, source: 't', score: 100 },
    { term: 'breathable microfiber', intent: 'commercial' as const, source: 't', score: 80 },
  ]
  const initial: ListingCopy = { title: 'Bedsheet', bullets: [], features: [], description: '', searchTerms: '' }
  const before = scoreListingQuality(initial, platform, keywords).score

  // A rewriter that produces a strong, keyword-covering, rule-compliant listing.
  const rewrite = async (copy: ListingCopy): Promise<ListingCopy> => ({
    title: 'Cotton Bedsheet King Size, Soft Breathable Microfiber',
    bullets: [
      'Soft breathable microfiber weave stays cool through the night',
      'Sized to fit king beds with deep pockets that stay tucked',
      'Colorfast print resists fading wash after wash',
      'Easy care, machine washable and quick drying',
      'Durable double stitched hems for years of use',
    ],
    features: ['Cotton feel', 'King size', 'Breathable microfiber', 'Colorfast', 'Machine washable'],
    description: 'A '.repeat(1).concat('cotton bedsheet king size set in breathable microfiber. ').repeat(8),
    searchTerms: 'cotton bedsheet king size breathable microfiber soft bedding set',
  })

  const result = await optimizeListing(initial, platform, ctx, rewrite, { keywords, maxRounds: 3, targetScore: 95 })
  assert(result.score > before, `optimizer improved the score (${before} to ${result.score})`)
  assert(result.rounds >= 1, 'optimizer ran at least one improvement round')
  assert(result.history[0].score === before, 'optimizer recorded the starting score in its history')
  assert(result.breakdown.dimensions.length > 0, 'optimizer returned a scored breakdown')
}

async function main() {
  await resilienceScenario()
  await intelligenceScenario()
  await optimizerScenario()
  console.log('\nALL SMOKE CHECKS PASSED.')
}

main().catch((err) => {
  console.error('smoke test crashed:', err)
  process.exit(1)
})
