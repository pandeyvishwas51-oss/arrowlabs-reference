// Email domain gating - ArrowLabs is B2B, so only company (corporate) email
// domains may sign up. Public/free mailbox providers are blocked. The trial is
// granted once per company domain.

// Common public/free email providers (not exhaustive, but covers the mainstream).
const PUBLIC_DOMAINS = new Set([
  'gmail.com', 'googlemail.com',
  'yahoo.com', 'yahoo.co.in', 'yahoo.co.uk', 'ymail.com', 'rocketmail.com',
  'outlook.com', 'hotmail.com', 'hotmail.co.uk', 'live.com', 'msn.com',
  'icloud.com', 'me.com', 'mac.com',
  'aol.com', 'protonmail.com', 'proton.me', 'pm.me', 'zoho.com', 'zohomail.com',
  'gmx.com', 'gmx.net', 'mail.com', 'yandex.com', 'yandex.ru',
  'fastmail.com', 'hey.com', 'tutanota.com', 'rediffmail.com',
  // disposable / temporary
  'mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com',
  'trashmail.com', 'sharklasers.com', 'getnada.com', 'yopmail.com', 'dispostable.com',
])

export function domainOf(email: string): string {
  return (email || '').trim().toLowerCase().split('@')[1] || ''
}

export function isPublicDomain(domain: string): boolean {
  return PUBLIC_DOMAINS.has(domain.toLowerCase())
}

// True only for a real company email (has a domain, and it isn't a public one).
export function isCompanyEmail(email: string): boolean {
  const d = domainOf(email)
  if (!d || !d.includes('.')) return false
  return !isPublicDomain(d)
}

// A human-friendly company name guess from a domain ("opptra.com" -> "Opptra").
export function companyNameFromDomain(domain: string): string {
  const base = domain.split('.')[0] || domain
  return base.charAt(0).toUpperCase() + base.slice(1)
}
