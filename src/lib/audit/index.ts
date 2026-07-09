// Audit & Optimize - the differentiator no visual-first competitor has.
// Reads the LIVE listing, scores each field against Amazon guidelines + keyword
// coverage + review verbatims, and returns a diff: keep what's strong, rewrite
// only what's weak. This is what ListingOptimization.ai / CopyMonkey lack.

import type { ScrapeResult } from '@/lib/scraper/asin'
import { generateJSON, type TextMessage } from '@/lib/ai/text'
import { validateTitle, validateBullets, validateAPlusContent } from '@/lib/selfhealing'

export type FieldAudit = {
  field: string
  score: number // 0-100
  status: 'keep' | 'improve' | 'rewrite'
  issues: string[]
  suggestion?: string // present only when status !== 'keep'
}

export type ListingAudit = {
  overall: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  summary: string
  strengths: string[]
  missingKeywords: string[]
  unaddressedComplaints: string[]
  fields: FieldAudit[]
}

function grade(n: number): ListingAudit['grade'] {
  if (n >= 90) return 'A'
  if (n >= 80) return 'B'
  if (n >= 70) return 'C'
  if (n >= 55) return 'D'
  return 'F'
}

export async function auditListing(scraped: ScrapeResult, keywords: string[] = []): Promise<ListingAudit> {
  const p = scraped.product
  const ins = scraped.reviewInsights

  // Deterministic signals to ground the model.
  const titleVal = validateTitle(p.title || '', p)
  const bulletVal = validateBullets(p.bullets || [], p)
  const aplusVal = validateAPlusContent([])

  const hay = `${p.title || ''} ${(p.bullets || []).join(' ')}`.toLowerCase()
  const missingKeywords = keywords
    .filter((k) => k && !hay.includes(k.toLowerCase()))
    .slice(0, 15)

  const system: TextMessage = {
    role: 'system',
    content: `You are a senior Amazon listing auditor (AMALYZE-style). You audit a LIVE listing field by field and return JSON.

Rules:
- Score each field 0-100 against: Amazon's current style guide, keyword coverage, and whether it reflects real customer review language.
- CRITICAL: do NOT rewrite fields that are already strong. Mark them "keep" with no suggestion. Only rewrite fields that are genuinely weak (status "rewrite") or need light edits ("improve"). Blindly rewriting a converting title is a downgrade.
- For "improve"/"rewrite", provide a concrete better version in "suggestion" that fixes the specific issues, weaves in the MISSING keywords where natural, features the praised benefits in buyers' words, and defuses top complaints. Never invent features the product lacks. No emojis, no ALL-CAPS, no banned promo words.
- Be honest and specific in "issues" (what's wrong and why), and list genuine "strengths".

Return JSON: { "overall": number, "summary": string, "strengths": string[], "unaddressedComplaints": string[], "fields": [ { "field": "Title"|"Bullets"|"A+ Content", "score": number, "status": "keep"|"improve"|"rewrite", "issues": string[], "suggestion": string } ] }`,
  }

  const user: TextMessage = {
    role: 'user',
    content: `PRODUCT: ${p.title}
BRAND: ${p.brand} · CATEGORY: ${p.category || 'general'} · RATING: ${p.rating}/5 (${p.reviewCount} reviews)

--- LIVE LISTING ---
TITLE: ${p.title}
BULLETS:
${(p.bullets || []).map((b, i) => `${i + 1}. ${b}`).join('\n') || '(none)'}
--------------------

STRUCTURAL FLAGS (from validators):
- Title: ${titleVal.valid ? 'passes' : (titleVal.fixes || []).join('; ')}
- Bullets: ${bulletVal.valid ? 'passes' : (bulletVal.fixes || []).join('; ')}
- A+: ${aplusVal.valid ? 'present' : 'no A+ content detected on the live listing'}

HIGH-VALUE KEYWORDS MISSING FROM THE LISTING: ${missingKeywords.join(', ') || '(good coverage)'}
REVIEW PRAISES (should be featured): ${ins.topPraises.join(' | ') || '(none captured)'}
REVIEW COMPLAINTS (should be defused): ${ins.topComplaints.join(' | ') || '(none captured)'}
EXPECTATION GAPS: ${ins.desiredImprovements.join(' | ') || '(none)'}

Audit the listing now. Remember: keep strong fields, only rewrite weak ones.`,
  }

  const { data } = await generateJSON<any>([system, user], { temperature: 0.4, maxTokens: 2200 })

  const fields: FieldAudit[] = (data.fields || []).map((f: any) => ({
    field: f.field || 'Field',
    score: Math.max(0, Math.min(100, Number(f.score) || 0)),
    status: ['keep', 'improve', 'rewrite'].includes(f.status) ? f.status : 'improve',
    issues: Array.isArray(f.issues) ? f.issues.slice(0, 6) : [],
    suggestion: f.status === 'keep' ? undefined : (f.suggestion || undefined),
  }))

  const overall = Math.round(
    data.overall != null
      ? Math.max(0, Math.min(100, Number(data.overall)))
      : fields.length
        ? fields.reduce((s, f) => s + f.score, 0) / fields.length
        : 0,
  )

  return {
    overall,
    grade: grade(overall),
    summary: data.summary || '',
    strengths: Array.isArray(data.strengths) ? data.strengths.slice(0, 6) : [],
    missingKeywords,
    unaddressedComplaints: Array.isArray(data.unaddressedComplaints) ? data.unaddressedComplaints.slice(0, 6) : [],
    fields,
  }
}
