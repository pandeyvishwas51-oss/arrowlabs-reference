'use client'

import { useState, useEffect, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Logo } from '@/components/site/logo'
import { BackgroundFX } from '@/components/site/background-fx'

const PUBLIC = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'aol.com', 'proton.me', 'protonmail.com', 'live.com']

function isCompany(email: string) {
  const d = email.trim().toLowerCase().split('@')[1] || ''
  return d.includes('.') && !PUBLIC.includes(d)
}

function LoginInner() {
  const params = useSearchParams()
  const [mode, setMode] = useState<'password' | 'magic'>('password')
  const [register, setRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sent, setSent] = useState(params.get('sent') === '1')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(params.get('error') === 'company_only' ? 'Please use your company email. Personal inboxes are not supported.' : '')
  const [googleEnabled, setGoogleEnabled] = useState(false)

  // Show "Continue with Google" only when the provider is actually configured.
  useEffect(() => {
    fetch('/api/auth/providers')
      .then((r) => r.json())
      .then((p) => setGoogleEnabled(!!p?.google))
      .catch(() => {})
  }, [])

  async function magicSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!isCompany(email)) return setError('Please use your company email. Personal inboxes are not supported.')
    setLoading(true)
    try {
      const res = await signIn('email', { email, redirect: false, callbackUrl: '/studio' })
      if (res?.error) setError('Could not send the link. Please try again.')
      else setSent(true)
    } catch { setError('Something went wrong. Please try again.') } finally { setLoading(false) }
  }

  async function passwordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!isCompany(email)) return setError('Please use your company email. Personal inboxes are not supported.')
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    setLoading(true)
    try {
      const r = await fetch('/api/auth/password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: register ? 'register' : 'login', email, password }),
      }).then((x) => x.json())
      if (!r.ok) setError(r.error || 'Could not sign in.')
      // Full page load so NextAuth's SessionProvider re-initialises with the new
      // session cookie (a soft router.push leaves useSession() stale).
      else window.location.assign('/studio')
    } catch { setError('Something went wrong. Please try again.') } finally { setLoading(false) }
  }


  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <BackgroundFX />
      <Link href="/" className="mb-8"><Logo /></Link>

      <div className="glass-strong w-full max-w-md rounded-2xl p-8 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.35)]">
        {mode === 'magic' && sent ? (
          <div className="text-center">
            <h1 className="font-display text-xl font-medium">Check your inbox</h1>
            <p className="mt-2 text-sm text-muted-foreground">We sent a sign-in link to <span className="font-medium text-foreground">{email || 'your email'}</span>.</p>
            <p className="mt-4 text-xs text-muted-foreground">No email provider in dev? The link is printed to the server console.</p>
            <button onClick={() => setSent(false)} className="mt-6 text-sm text-accent link-underline">Use a different email</button>
          </div>
        ) : (
          <>
            <h1 className="font-display text-2xl font-medium tracking-tight">
              {register ? 'Create your workspace' : 'Sign in to ArrowLabs'}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Company email only.</span> New companies get 7 days completely free - unlimited generation.
            </p>

            <div className="mt-5">
            {googleEnabled && (
              <>
                <button
                  onClick={() => signIn('google', { callbackUrl: '/studio' })}
                  className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-black/[0.03]"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"/></svg>
                  Continue with Google
                </button>
                <div className="my-4 flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
                </div>
              </>
            )}
            {mode === 'password' ? (
              <form onSubmit={passwordSubmit} className="space-y-3">
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@yourcompany.com"
                  className="w-full rounded-xl border border-border bg-white/60 px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" />
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min 8 chars)"
                  className="w-full rounded-xl border border-border bg-white/60 px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" />
                {error && <p className="text-sm text-accent">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60">
                  {loading ? 'Please wait…' : register ? 'Create account' : 'Sign in'}
                </button>
              </form>
            ) : (
              <form onSubmit={magicSubmit} className="space-y-3">
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@yourcompany.com"
                  className="w-full rounded-xl border border-border bg-white/60 px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" />
                {error && <p className="text-sm text-accent">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60">
                  {loading ? 'Sending…' : 'Send magic link'}
                </button>
              </form>
            )}

            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              {mode === 'password' ? (
                <div className="flex items-center gap-3">
                  <button onClick={() => setRegister(!register)} className="link-underline">
                    {register ? 'Have an account? Sign in' : 'New company? Create account'}
                  </button>
                  {!register && <Link href="/reset" className="link-underline text-accent">Forgot password?</Link>}
                </div>
              ) : <span />}
              <button onClick={() => setMode(mode === 'password' ? 'magic' : 'password')} className="link-underline">
                {mode === 'password' ? 'Use a magic link instead' : 'Use password instead'}
              </button>
            </div>
            </div>
          </>
        )}
      </div>
      <Link href="/" className="mt-6 text-sm text-muted-foreground link-underline">← Back to home</Link>
    </div>
  )
}

export default function LoginPage() {
  return <Suspense fallback={null}><LoginInner /></Suspense>
}
