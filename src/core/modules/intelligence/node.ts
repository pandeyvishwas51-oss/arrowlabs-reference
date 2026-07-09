// Node intelligence builder. Produces the Category/Node File every ASIN in a node
// reuses: volume-ranked keywords (from the keyword provider), plus best-seller signals
// mined from the top-ranking products (their keywords become commercial-intent terms,
// and BSR is turned into an estimated-sales + demand score). Built once per node,
// refreshed on schedule. Degrades gracefully: any missing provider is skipped, never fatal.

import type { BestSellerEntry, KeywordEntry, NodeFile } from '../../contracts/domain'
import type { IntelBuildInput, NodeIntelligenceBuilder } from '../../contracts/intelligence'
import type { BestSellerProvider, KeywordProvider } from '../../contracts/services'
import type { Ctx } from '../../contracts/types'
import { mineKeywordsFromCompetitors } from '../../intelligence/best-sellers'
import { bsrDemandScore, estimateMonthlySales } from '../../intelligence/demand'

export function createNodeBuilder(deps: {
  keywordProvider?: KeywordProvider
  bestSellerProvider?: BestSellerProvider
}): NodeIntelligenceBuilder {
  return {
    id: 'node.default',
    kind: 'node',
    async build(input: IntelBuildInput, ctx: Ctx): Promise<NodeFile> {
      const nodeKey = input.nodeKey
      const platform = input.platform
      if (!nodeKey || !platform) throw new Error('node.default: nodeKey and platform are required')

      const keywords: KeywordEntry[] = []
      if (deps.keywordProvider) {
        try {
          keywords.push(...(await deps.keywordProvider.keywords(nodeKey, platform)))
        } catch (err) {
          ctx.log.warn('node.default: keyword provider failed, continuing', { err: String(err) })
        }
      }

      // Best-sellers: turn BSR into demand estimates, and mine the winners' keywords so
      // our copy covers what already ranks.
      let bestSellers: BestSellerEntry[] = []
      if (deps.bestSellerProvider) {
        try {
          const sellers = await deps.bestSellerProvider.topSellers(nodeKey, platform)
          const category = input.seed?.categoryPath?.[0]
          bestSellers = sellers.map((s) => ({
            externalId: s.externalId ?? '',
            bsr: s.bsr,
            title: s.title,
            price: s.price,
            signals: {
              estMonthlySales: estimateMonthlySales(s.bsr, category),
              demandScore: bsrDemandScore(s.bsr),
            },
          }))
          const mined = mineKeywordsFromCompetitors(sellers)
          const have = new Set(keywords.map((k) => k.term.toLowerCase()))
          for (const m of mined.keywordsFromWinners) {
            if (!have.has(m.term)) {
              keywords.push({ term: m.term, intent: 'commercial', source: 'best-seller', score: Math.min(100, m.freq * 15) })
            }
          }
        } catch (err) {
          ctx.log.warn('node.default: best-seller provider failed, continuing', { err: String(err) })
        }
      }

      return { nodeKey, platform, version: 1, keywords, bestSellers, insights: [] }
    },
  }
}
