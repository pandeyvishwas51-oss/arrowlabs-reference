// The ThreeArrow AI ecosystem - one company, a suite of tools for commerce.
// ArrowLabs (this app) is the creative OS; ArrowCrawl is the revenue-intelligence
// tool (buy box, ranking, stock, scraping). ThreeArrow AI is the parent.

export const COMPANY = {
  parent: 'ThreeArrow AI',
  parentUrl: 'https://threearrowai.com',
  tagline: 'Applied AI for modern commerce',
  poweredBy: 'Powered by ThreeArrow AI',
}

export type EcosystemProduct = {
  name: string
  url: string
  blurb: string
  cta: string
  current?: boolean
}

export const ECOSYSTEM: EcosystemProduct[] = [
  {
    name: 'ArrowLabs',
    url: '/',
    blurb:
      'The creative operating system. One product link becomes listings, A+ content, ad angles, product photography, and UGC video.',
    cta: 'You are here',
    current: true,
  },
  {
    name: 'ArrowCrawl',
    url: 'https://arrowcrawl.com',
    blurb:
      'Revenue intelligence for e-commerce brands. Buy-box tracking, keyword and rank monitoring, stock and inventory alerts, and competitor scraping across marketplaces.',
    cta: 'Explore ArrowCrawl',
  },
  {
    name: 'ThreeArrow AI',
    url: 'https://threearrowai.com',
    blurb:
      'The parent company building the applied-AI stack for commerce. One team, one mission: help brands sell more with less busywork.',
    cta: 'About ThreeArrow AI',
  },
]
