// Creative Director agent - the "analyze" agent that studies the WHOLE product
// (title, description, features/specs, category, price, AND review verbatims),
// then designs a bespoke, professional creative strategy: a visual identity plus
// a distinct concept for every A+ module, lifestyle scene, and the main image.
// This is what makes each campaign's creative look art-directed for THAT product
// instead of a generic template. The real product photo is still locked in via
// image-to-image; the Director decides the scenes, framing, palette, and copy.

import type { ScrapeResult } from '@/lib/scraper/asin'
import { generateJSON, type TextMessage } from '@/lib/ai/text'

export type CreativePlan = {
  visualIdentity: {
    palette: string[] // 3-5 hex colours that fit the product/category
    mood: string // e.g. "premium and calm", "bold and energetic"
    styleKeywords: string[] // e.g. ["editorial", "matte", "high-contrast"]
    lighting: string // e.g. "soft diffused daylight", "dramatic rim light"
  }
  heroBenefit: string // the single biggest selling point to lead with
  mainImageNote: string // art direction for the clean main image
  aPlus: Array<{
    layout: 'brand-story' | 'comparison' | 'comparison-chart' | 'lifestyle' | 'spec-table'
    headline: string // real, correctly-spelled headline for this module
    body: string // one short supporting line
    scene: string // the specific scene/composition for this module
    highlight: string // the feature/benefit this module proves
    // Only for the comparison-chart layout: honest us-vs-typical rows.
    comparison?: { attribute: string; ours: string; theirs: string }[]
  }>
  lifestyleScenes: string[] // 2-3 specific, product-appropriate scenes
}

// Analyze the product and return an art-directed plan. Best-effort: returns null
// on any failure so the orchestrator falls back to its default templates.
export async function planCreatives(scraped: ScrapeResult, theme?: string, brandColors?: string[]): Promise<CreativePlan | null> {
  const p = scraped.product
  const ins = scraped.reviewInsights
  const desc = (p.description || '').slice(0, 900)
  const feats = (p.bullets || []).slice(0, 8)

  const system: TextMessage = {
    role: 'system',
    content: `You are an award-winning Amazon creative director and conversion strategist. You study a product end to end and art-direct a premium, category-appropriate creative set that would out-convert the best listings on Amazon.

Think like a pro:
- Use the product's DESCRIPTION, FEATURES/SPECS, category and price to decide the right visual language (a gaming chair, a skincare serum, and a kitchen gadget each demand totally different art direction, palette, lighting, and scenes). Do NOT default to generic studio shots.
- Ground the concepts in what actually sells this product: real features + specs first, reinforced by what reviewers praise. Never rely on reviews alone, and never invent features the product lacks.
- Every A+ module must be a DISTINCT layout and concept (no repetition). Headlines and body must be real, correctly-spelled English, punchy, benefit-led, Amazon-policy-safe (no "best/#1/guaranteed").
- ONE module MUST be a "comparison-chart": an honest side-by-side table contrasting THIS product against a typical/ordinary alternative. Give 4-5 comparison rows in "comparison": each { "attribute": short buyer-relevant spec/benefit, "ours": this product's win (e.g. "Yes", "100% cotton", "2-yr warranty"), "theirs": the ordinary option's weaker value (e.g. "No", "Poly blend", "None") }. Ground rows in the real features + competitive edge — never fabricate.
- Lifestyle scenes must be specific and believable for THIS product and its buyer.

Return JSON only:
{
  "visualIdentity": { "palette": ["#hex", ...], "mood": string, "styleKeywords": [string], "lighting": string },
  "heroBenefit": string,
  "mainImageNote": string,
  "aPlus": [ { "layout": "brand-story"|"comparison-chart"|"lifestyle"|"spec-table", "headline": string, "body": string, "scene": string, "highlight": string, "comparison": [{ "attribute": string, "ours": string, "theirs": string }] } ],
  "lifestyleScenes": [string, string, string]
}
Give 6 aPlus modules following this proven Indian-marketplace A+ structure, in order:
1) HERO / brand banner (layout "brand-story") — lead with the customer's aspiration in a relatable Indian home context, not just the product name.
2) COMPARISON chart (layout "comparison-chart", with "comparison" rows filled) — this vs an ordinary alternative.
3) MATERIAL & QUALITY PROOF (layout "spec-table") — fabric GSM / thread count / grade / certifications / origin (Indian buyers are skeptical, prove quality).
4) KEY BENEFITS (layout "spec-table" or "brand-story") — 3-4 core benefits, why this product in under 5 seconds.
5) FEATURE DEEP-DIVE (layout "lifestyle") — one major feature that answers a real objection (durability, safety, ease of use).
6) BRAND STORY / HOW TO USE (layout "lifestyle" or "brand-story") — build trust + care/usage instructions to reduce returns.
${theme ? `\nIMPORTANT — the brand gave this A+ THEME; base every module's mood, styling and copy on it: "${theme}".\n` : ''}${brandColors && brandColors.length ? `The brand's OFFICIAL colours are ${brandColors.join(', ')} — use these EXACT colours as the palette/accents CONSISTENTLY across every module and on-image text.` : 'The palette MUST reflect the real brand\'s actual colours seen in the product/packaging, not generic colours.'} Apply the palette consistently so the whole set looks like ONE branded system.`,
  }

  const user: TextMessage = {
    role: 'user',
    content: `PRODUCT: ${p.title}
BRAND: ${p.brand} · CATEGORY: ${p.category || 'general'} · PRICE: ${p.price} ${p.currency} · RATING: ${p.rating}/5 (${p.reviewCount} reviews)

DESCRIPTION:
${desc || '(none)'}

FEATURES / SPECS:
${feats.map((f) => `- ${f}`).join('\n') || '(none)'}

WHAT REVIEWERS PRAISE: ${ins.topPraises.join(' | ') || '(none)'}
WHAT REVIEWERS COMPLAIN ABOUT: ${ins.topComplaints.join(' | ') || '(none)'}

Art-direct the full creative plan now.`,
  }

  try {
    const { data } = await generateJSON<any>([system, user], { temperature: 0.6, maxTokens: 2000 })
    if (!data || !Array.isArray(data.aPlus)) return null
    return {
      visualIdentity: {
        // Brand's official colours win when provided; else the model's derived palette.
        palette: (brandColors && brandColors.length ? brandColors : (Array.isArray(data.visualIdentity?.palette) ? data.visualIdentity.palette : ['#FFFFFF', '#111111'])).slice(0, 5),
        mood: data.visualIdentity?.mood || 'premium',
        styleKeywords: Array.isArray(data.visualIdentity?.styleKeywords) ? data.visualIdentity.styleKeywords.slice(0, 6) : ['editorial'],
        lighting: data.visualIdentity?.lighting || 'soft studio light',
      },
      heroBenefit: data.heroBenefit || '',
      mainImageNote: data.mainImageNote || '',
      aPlus: data.aPlus.slice(0, 7).map((m: any) => ({
        layout: ['brand-story', 'comparison', 'comparison-chart', 'lifestyle', 'spec-table'].includes(m.layout) ? m.layout : 'brand-story',
        headline: (m.headline || '').slice(0, 80),
        body: (m.body || '').slice(0, 160),
        scene: (m.scene || '').slice(0, 300),
        highlight: (m.highlight || '').slice(0, 120),
        comparison: Array.isArray(m.comparison)
          ? m.comparison.slice(0, 5).map((r: any) => ({
              attribute: String(r?.attribute || '').slice(0, 40),
              ours: String(r?.ours || '').slice(0, 30),
              theirs: String(r?.theirs || '').slice(0, 30),
            })).filter((r: any) => r.attribute)
          : undefined,
      })),
      lifestyleScenes: Array.isArray(data.lifestyleScenes) ? data.lifestyleScenes.slice(0, 3).map((s: any) => String(s).slice(0, 250)) : [],
    }
  } catch {
    return null
  }
}
