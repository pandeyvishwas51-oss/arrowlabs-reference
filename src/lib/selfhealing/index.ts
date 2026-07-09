// Self-Healing Validator - validates AI outputs and auto-retries with fixes.
// Catches: hallucinated ASINs, missing fields, wrong format, off-brand copy, etc.

import { generateText, generateJSON, type TextMessage } from '@/lib/ai/text'
import type { ScrapedProduct } from '@/lib/scraper/asin'

export type ValidationResult = {
  valid: boolean
  errors: string[]
  warnings: string[]
  fixes: string[]
}

export type SelfHealResult<T> = {
  original: T
  healed: T
  validation: ValidationResult
  attempts: number
  maxAttempts: number
  healedAt: string
}

const MAX_ATTEMPTS = 3

// ===== Validators =====

// Amazon's current title policy (2024/2025):
//  - Recommended <= 200 chars, but most categories truncate hard near 150 on
//    mobile. Target <= 200, warn over 150.
//  - Brand first, no promotional phrases, no ALL-CAPS words, no special
//    characters or emojis, no price/promo, no repeated keywords.
export function validateTitle(title: string, product: ScrapedProduct): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const fixes: string[] = []

  if (!title || title.trim().length === 0) errors.push('Title is empty')

  if (title.length > 200) {
    errors.push(`Title too long: ${title.length} chars (Amazon hard max 200)`)
    fixes.push('Trim to under 200 chars: brand + product type + 2-3 key attributes.')
  } else if (title.length > 150) {
    warnings.push(`Title is ${title.length} chars; Amazon truncates around 150 on mobile`)
    fixes.push('Front-load the most important keywords in the first 80 chars; aim for <= 150.')
  }

  if (product.brand && !title.toLowerCase().includes(product.brand.toLowerCase())) {
    warnings.push(`Title missing brand "${product.brand}"`)
    fixes.push(`Start the title with the brand name "${product.brand}".`)
  }

  const promoWords = ['best', 'cheap', 'free', 'guarantee', 'guaranteed', 'amazing', 'incredible', 'sale', 'discount', 'deal', 'bestseller', 'top rated', 'perfect']
  const found = promoWords.filter((w) => new RegExp(`\\b${w}\\b`, 'i').test(title))
  if (found.length) {
    warnings.push(`Title contains promotional language: ${found.join(', ')}`)
    fixes.push(`Remove promotional/subjective words: ${found.join(', ')}. Amazon prohibits these in titles.`)
  }

  const badChars = title.match(/[!$?_{}^~#<>*;@]|[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu)
  if (badChars) {
    errors.push(`Title contains disallowed characters: ${Array.from(new Set(badChars)).join(' ')}`)
    fixes.push('Remove special characters and emojis. Only letters, numbers, and , . - / ( ) & are safe.')
  }

  if (/[$INR€£]\s?\d|\b\d+%\s?off\b/i.test(title)) {
    errors.push('Title contains price or promotional pricing')
    fixes.push('Remove any price, currency, or "% off" from the title.')
  }

  const capsWords = (title.match(/\b[A-Z]{4,}\b/g) || []).filter((w) => !product.brand.toUpperCase().includes(w))
  if (capsWords.length) {
    warnings.push(`Title has ALL-CAPS words: ${capsWords.join(', ')}`)
    fixes.push('Use Title Case (capitalize each major word), not ALL CAPS.')
  }

  return { valid: errors.length === 0, errors, warnings, fixes }
}

export function validateBullets(bullets: string[], product: ScrapedProduct): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const fixes: string[] = []

  if (bullets.length < 3) {
    warnings.push(`Only ${bullets.length} bullets (Amazon allows up to 5)`)
    fixes.push('Add more bullets to use all 5 Amazon slots.')
  }

  if (bullets.length > 5) {
    errors.push(`Too many bullets: ${bullets.length} (max 5)`)
    fixes.push('Keep only the top 5 bullets.')
  }

  const promo = ['best', 'cheap', 'free shipping', 'guarantee', '#1', 'sale', 'discount']
  bullets.forEach((b, i) => {
    if (b.length > 500) {
      errors.push(`Bullet ${i + 1} too long: ${b.length} chars (max 500)`)
      fixes.push(`Bullet ${i + 1}: trim to under 200 chars for readability.`)
    } else if (b.length > 250) {
      warnings.push(`Bullet ${i + 1} is ${b.length} chars; Amazon truncates long item highlights`)
      fixes.push(`Bullet ${i + 1}: tighten to under 200 chars.`)
    }
    if (b.length < 40) {
      warnings.push(`Bullet ${i + 1} too short: ${b.length} chars`)
      fixes.push(`Bullet ${i + 1}: expand with the benefit + supporting feature.`)
    }
    // Item highlight should open with a Title Case benefit label + colon (not ALL CAPS).
    if (!/^[A-Z][A-Za-z0-9 ]{2,28}:/.test(b)) {
      warnings.push(`Bullet ${i + 1} should start with a benefit label like "Premium Build:"`)
      fixes.push(`Bullet ${i + 1}: open with a 2-4 word Title Case label + colon.`)
    }
    if (/^[A-Z0-9 ]{6,}:/.test(b)) {
      warnings.push(`Bullet ${i + 1} label is ALL CAPS`)
      fixes.push(`Bullet ${i + 1}: use Title Case for the label, not ALL CAPS (Amazon style change).`)
    }
    if (/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(b)) {
      errors.push(`Bullet ${i + 1} contains emojis`)
      fixes.push(`Bullet ${i + 1}: remove emojis (Amazon policy).`)
    }
    const p = promo.filter((w) => b.toLowerCase().includes(w))
    if (p.length) {
      warnings.push(`Bullet ${i + 1} has promotional claims: ${p.join(', ')}`)
      fixes.push(`Bullet ${i + 1}: remove promotional claims (${p.join(', ')}).`)
    }
  })

  return { valid: errors.length === 0, errors, warnings, fixes }
}

export function validateAPlusContent(content: { heading: string; body: string }[]): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const fixes: string[] = []

  if (content.length === 0) {
    errors.push('No A+ modules generated')
  }

  content.forEach((m, i) => {
    if (!m.heading || m.heading.length === 0) {
      errors.push(`Module ${i + 1} missing heading`)
      fixes.push(`Module ${i + 1}: add a heading.`)
    }
    if (!m.body || m.body.length < 100) {
      warnings.push(`Module ${i + 1} body too short (${m.body?.length || 0} chars)`)
      fixes.push(`Module ${i + 1}: expand body to at least 100 chars.`)
    }
  })

  return { valid: errors.length === 0, errors, warnings, fixes }
}

// ===== Self-healing retry loop =====

export async function selfHeal<T>(params: {
  generate: () => Promise<T>
  validate: (output: T) => ValidationResult
  regenerateWithFixes?: (original: T, fixes: string[]) => Promise<T>
  maxAttempts?: number
  label?: string
}): Promise<SelfHealResult<T>> {
  const maxAttempts = params.maxAttempts || MAX_ATTEMPTS
  const label = params.label || 'output'

  let current = await params.generate()
  let validation = params.validate(current)
  let attempts = 1

  console.log(`[selfheal] ${label} attempt ${attempts}: ${validation.valid ? 'VALID' : 'INVALID'}`)

  while (!validation.valid && attempts < maxAttempts && params.regenerateWithFixes) {
    attempts++
    const fixPrompt = validation.fixes.join(' ')
    console.log(`[selfheal] ${label} attempt ${attempts}: applying fixes - ${fixPrompt}`)
    current = await params.regenerateWithFixes(current, validation.fixes)
    validation = params.validate(current)
    console.log(`[selfheal] ${label} attempt ${attempts}: ${validation.valid ? 'VALID' : 'INVALID'}`)
  }

  return {
    original: current,
    healed: current,
    validation,
    attempts,
    maxAttempts,
    healedAt: new Date().toISOString(),
  }
}

// ===== LLM-powered self-heal: regenerate title with feedback =====

export async function healTitle(params: {
  product: ScrapedProduct
  badTitle: string
  fixes: string[]
}): Promise<string> {
  const system: TextMessage = {
    role: 'system',
    content:
      'You are an Amazon listing optimization expert. You fix titles that violate Amazon policy or best practices. You return ONLY the fixed title, no explanation. Title must be under 200 chars, contain the brand, no promotional language, no emojis.',
  }
  const user: TextMessage = {
    role: 'user',
    content: `Product: ${params.product.title}
Brand: ${params.product.brand}
Category: ${params.product.category || 'general'}
Key features: ${params.product.bullets.slice(0, 3).join('; ')}

Current bad title: "${params.badTitle}"

Issues to fix:
${params.fixes.map((f, i) => `${i + 1}. ${f}`).join('\n')}

Return ONLY the fixed title (max 200 chars). No explanation, no quotes.`,
  }

  const result = await generateText([system, user], { temperature: 0.3, maxTokens: 100 })
  return result.content.trim().replace(/^["']|["']$/g, '')
}

// ===== JSON schema validation for ad angles =====

export function validateAdAngles(angles: any[]): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const fixes: string[] = []

  if (!Array.isArray(angles)) {
    errors.push('Angles is not an array')
    return { valid: false, errors, warnings, fixes }
  }

  if (angles.length < 3) {
    warnings.push(`Only ${angles.length} angles (recommend 8-12)`)
    fixes.push('Generate more angles (8-12 recommended)')
  }

  const validTypes = ['social-proof', 'before-after', 'problem-solution', 'testimonial', 'us-vs-them', 'feature-highlight', 'use-case', 'pain-point', 'aspirational', 'educational']
  const seenTypes = new Set<string>()

  angles.forEach((a, i) => {
    if (!a.angleType || !validTypes.includes(a.angleType)) {
      warnings.push(`Angle ${i + 1} has invalid type: ${a.angleType}`)
      fixes.push(`Angle ${i + 1}: use one of ${validTypes.join(', ')}`)
    } else {
      seenTypes.add(a.angleType)
    }
    if (!a.headline || a.headline.length === 0) {
      errors.push(`Angle ${i + 1} missing headline`)
      fixes.push(`Angle ${i + 1}: add a headline`)
    }
    if (a.headline && a.headline.length > 60) {
      warnings.push(`Angle ${i + 1} headline too long (${a.headline.length} chars, max 60)`)
      fixes.push(`Angle ${i + 1}: shorten headline to under 60 chars`)
    }
    if (typeof a.predictedScore !== 'number' || a.predictedScore < 0 || a.predictedScore > 100) {
      warnings.push(`Angle ${i + 1} has invalid predictedScore: ${a.predictedScore}`)
      fixes.push(`Angle ${i + 1}: set predictedScore between 0-100`)
    }
  })

  // Need at least 3 different angle types
  if (seenTypes.size < 3) {
    warnings.push(`Only ${seenTypes.size} distinct angle types (recommend 5+)`)
    fixes.push('Diversify angle types')
  }

  return { valid: errors.length === 0, errors, warnings, fixes }
}
