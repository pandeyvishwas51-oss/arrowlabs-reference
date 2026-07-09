// Email - Resend transport with a dev fallback that logs the link to console.
// Used for magic-link sign-in, team invites, and transactional notifications.

import { config } from '@/lib/config'
import { logError } from '@/lib/logger'

type SendArgs = { to: string; subject: string; html: string; text?: string }

export async function sendEmail({ to, subject, html, text }: SendArgs): Promise<{ ok: boolean; dev?: boolean }> {
  if (!config.resend.apiKey) {
    // Dev fallback - no key configured. Surface the content so flows still work.
    console.log(`\n[email:dev] To: ${to}\n[email:dev] Subject: ${subject}\n[email:dev] ${text || html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}\n`)
    return { ok: true, dev: true }
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.resend.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: config.resend.from, to, subject, html, text }),
    })
    if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`)
    return { ok: true }
  } catch (e) {
    await logError('email.send', e, { to, subject })
    return { ok: false }
  }
}

// ===== Templates =====

const shell = (inner: string) => `<!doctype html><html><body style="margin:0;background:#fafafa;font-family:-apple-system,Segoe UI,Inter,sans-serif;color:#111">
  <div style="max-width:480px;margin:40px auto;padding:32px;background:#fff;border:1px solid #eee;border-radius:16px">
    <div style="font-size:20px;font-weight:600;letter-spacing:-.02em">Arrow<span style="color:#6D5EF6">Labs</span></div>
    <div style="height:1px;background:#eee;margin:20px 0"></div>
    ${inner}
    <div style="height:1px;background:#eee;margin:24px 0"></div>
    <div style="font-size:12px;color:#999">ArrowLabs - the creative operating system for commerce.</div>
  </div>
</body></html>`

export function magicLinkEmail(url: string) {
  return {
    subject: 'Your ArrowLabs sign-in link',
    html: shell(`
      <p style="font-size:15px;line-height:1.6;color:#333">Click below to sign in to ArrowLabs. This link expires in 24 hours.</p>
      <a href="${url}" style="display:inline-block;margin-top:8px;padding:12px 20px;background:linear-gradient(120deg,#6D5EF6,#E24BF0 55%,#FF5C7A);color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px">Sign in to ArrowLabs</a>
      <p style="font-size:12px;color:#999;margin-top:20px">If you didn't request this, you can ignore this email.</p>`),
    text: `Sign in to ArrowLabs: ${url}`,
  }
}

export function welcomeEmail(trialDays: number, _credits: number) {
  return {
    subject: 'Welcome to ArrowLabs - your free trial is live',
    html: shell(`
      <p style="font-size:15px;line-height:1.6;color:#333">Your <b>${trialDays}-day free trial</b> is active - <b>completely free, unlimited generation</b> across listings, ad angles, product photos, and video. No credit card, no limits.</p>
      <a href="${config.app.url}/studio" style="display:inline-block;margin-top:8px;padding:12px 20px;background:linear-gradient(120deg,#6D5EF6,#E24BF0 55%,#FF5C7A);color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px">Open the Studio</a>`),
    text: `Welcome to ArrowLabs. Your ${trialDays}-day trial is completely free with unlimited generation. Open the studio: ${config.app.url}/studio`,
  }
}

export function campaignReadyEmail(product: string, assetCount: number, campaignUrl: string) {
  return {
    subject: `Your ${product || 'campaign'} creatives are ready`,
    html: shell(`
      <p style="font-size:15px;line-height:1.6;color:#333">Your campaign for <b>${product || 'your product'}</b> is done. We generated a full kit: optimized listing, ranked ad angles, ${assetCount} creative assets, and more.</p>
      <a href="${campaignUrl}" style="display:inline-block;margin-top:8px;padding:12px 20px;background:linear-gradient(120deg,#6D5EF6,#E24BF0 55%,#FF5C7A);color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px">View & download your campaign</a>`),
    text: `Your ${product || 'campaign'} creatives are ready (${assetCount} assets). View: ${campaignUrl}`,
  }
}

export function lowCreditsEmail(balance: number) {
  return {
    subject: `You're running low on credits (${balance} left)`,
    html: shell(`
      <p style="font-size:15px;line-height:1.6;color:#333">Your company has <b>${balance} credits</b> remaining. Top up to keep generating without interruption.</p>
      <a href="${config.app.url}/account" style="display:inline-block;margin-top:8px;padding:12px 20px;background:linear-gradient(120deg,#6D5EF6,#E24BF0 55%,#FF5C7A);color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px">Top up credits</a>`),
    text: `Low credits: ${balance} left. Top up: ${config.app.url}/account`,
  }
}

export function resetPasswordEmail(url: string) {
  return {
    subject: 'Reset your ArrowLabs password',
    html: shell(`
      <p style="font-size:15px;line-height:1.6;color:#333">We got a request to reset your ArrowLabs password. Click below to choose a new one. This link expires in 1 hour.</p>
      <a href="${url}" style="display:inline-block;margin-top:8px;padding:12px 20px;background:linear-gradient(120deg,#6D5EF6,#E24BF0 55%,#FF5C7A);color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px">Reset password</a>
      <p style="font-size:12px;color:#999;margin-top:20px">If you didn't request this, you can safely ignore this email, your password won't change.</p>`),
    text: `Reset your ArrowLabs password (expires in 1 hour): ${url}`,
  }
}

// Promotional / broadcast email. Pass a headline, body paragraphs, and a CTA.
export function promotionalEmail(opts: {
  subject: string
  headline: string
  body: string
  ctaText?: string
  ctaUrl?: string
}) {
  const cta = opts.ctaText && opts.ctaUrl
    ? `<a href="${opts.ctaUrl}" style="display:inline-block;margin-top:14px;padding:12px 22px;background:linear-gradient(120deg,#6D5EF6,#E24BF0 55%,#FF5C7A);color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px">${opts.ctaText}</a>`
    : ''
  return {
    subject: opts.subject,
    html: shell(`
      <h1 style="font-size:22px;font-weight:700;letter-spacing:-.02em;margin:0 0 12px">${opts.headline}</h1>
      <div style="font-size:15px;line-height:1.65;color:#333">${opts.body}</div>
      ${cta}
      <p style="font-size:11px;color:#aaa;margin-top:24px">You're receiving this because you signed up for ArrowLabs. <a href="${config.app.url}/unsubscribe" style="color:#aaa">Unsubscribe</a>.</p>`),
    text: `${opts.headline}\n\n${opts.body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}${opts.ctaUrl ? `\n\n${opts.ctaText}: ${opts.ctaUrl}` : ''}`,
  }
}

export function inviteEmail(inviterEmail: string, company: string) {
  const url = `${config.app.url}/login`
  return {
    subject: `${inviterEmail} invited you to ${company} on ArrowLabs`,
    html: shell(`
      <p style="font-size:15px;line-height:1.6;color:#333"><b>${inviterEmail}</b> invited you to join <b>${company}</b> on ArrowLabs - a shared workspace for your team's listings, ads, product photos, and video.</p>
      <p style="font-size:14px;color:#555">Sign in with your company email to join automatically.</p>
      <a href="${url}" style="display:inline-block;margin-top:8px;padding:12px 20px;background:linear-gradient(120deg,#6D5EF6,#E24BF0 55%,#FF5C7A);color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px">Join ${company}</a>`),
    text: `${inviterEmail} invited you to join ${company} on ArrowLabs. Sign in with your company email: ${url}`,
  }
}
