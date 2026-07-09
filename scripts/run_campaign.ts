// One-off quality test: run a real campaign through the orchestrator (scrape +
// listing + A+ incl. comparison chart + images + one video) and print a summary.
// Usage: npx tsx --env-file=.env scripts/run_campaign.ts <ASIN> <MARKETPLACE>
import { orchestrate } from '@/lib/orchestrator'

const asin = process.argv[2] || 'B0DJQQWBS4'
const marketplace = process.argv[3] || 'IN'
const withVideo = process.argv.includes('--video')

async function main() {
const res = await orchestrate({
  asin,
  marketplace,
  labs: withVideo
    ? ['ListingLab', 'APlusLab', 'AngleLab', 'PhotoLab', 'VideoLab']
    : ['ListingLab', 'APlusLab', 'AngleLab', 'PhotoLab'],
  generateImages: true,
  generateVideo: withVideo,
  region: 'IN',
  platform: 'amazon_in',
  counts: { lifestyle: 1, infographic: 1, aPlus: 2, productPhoto: 0, dimension: 1, detail: 1, video: withVideo ? 1 : 0 },
  userId: 'cmr6bq79h0000vqjhbv38p8cw',
  orgId: 'cmr6bq79j0001vqjhsl9gh9y5',
})

const p = res.scraped.product
console.log('\n================ CAMPAIGN SUMMARY ================')
console.log('status:', res.status, '| durationMs:', res.durationMs, '| credits:', res.creditsCharged)
console.log('scrape provider:', res.scraped.provider)
console.log('PRODUCT:', p.title, '|', p.brand, '|', p.rating + '★', '(' + p.reviewCount + ')')
console.log('images scraped:', (p.images || []).length, 'reviews:', res.scraped.reviews.length)
console.log('\n--- LISTING ---')
console.log('title:', res.listing?.title, `(${(res.listing?.title || '').length} chars)`)
console.log('bullets:', (res.listing?.bullets || []).length)
;(res.listing?.bullets || []).forEach((b: string) => console.log('  •', b))
console.log('features:', (res.listing?.features || []).length, '→', (res.listing?.features || []).join(' | '))
console.log('keywords:', res.keywords?.length, '| brandDna:', res.brandDna ? 'yes' : 'no')
console.log('\n--- A+ MODULES ---')
;(res.assets || []).filter((a) => a.type === 'a_plus_module').forEach((a: any, i) => {
  const j = a.prompt
  console.log(`  [${i}] layout=${j?.scene?.setting} status=${a.status}`)
  console.log('      url:', a.imageUrl || '(none)')
})
console.log('\n--- ALL ASSETS ---')
;(res.assets || []).forEach((a: any) => console.log(`  ${a.status.padEnd(10)} ${a.type.padEnd(16)} ${a.imageUrl || ''}`))
if (res.video) console.log('\n--- VIDEO ---\n  ', res.video.url, '\n  script:', res.video.script)
console.log('\nerrors:', res.errors)
console.log('==================================================\n')
process.exit(0)
}

main().catch((e) => { console.error('RUN FAILED:', e); process.exit(1) })
