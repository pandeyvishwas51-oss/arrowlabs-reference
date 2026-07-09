'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Logo } from '@/components/site/logo'

function ResetInner() {
  const params = useSearchParams()
  const token = params.get('token') || ''
  const email = params.get('email') || ''
  const hasToken = !!token && !!email

  const [addr, setAddr] = useState(email)
  const [password, setPassword] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'sent' | 'done' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  async function requestLink(e: React.FormEvent) {
    e.preventDefault()
    setState('loading'); setMsg('')
    try {
      const r = await fetch('/api/auth/reset', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request', email: addr }),
      }).then((x) => x.json())
      if (r.ok) setState('sent')
      else { setState('error'); setMsg(r.error || 'Something went wrong.') }
    } catch { setState('error'); setMsg('Network error.') }
  }

  async function confirmReset(e: React.FormEvent) {
    e.preventDefault()
    setState('loading'); setMsg('')
    try {
      const r = await fetch('/api/auth/reset', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm', email, token, password }),
      }).then((x) => x.json())
      if (r.ok) { setState('done'); setTimeout(() => window.location.assign('/studio'), 800) }
      else { setState('error'); setMsg(r.error || 'Reset failed.') }
    } catch { setState('error'); setMsg('Network error.') }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="mb-8"><Logo /></div>
      <div className="rounded-2xl border border-border bg-white/70 p-8 backdrop-blur">
        {hasToken ? (
          <>
            <h1 className="font-display text-2xl font-semibold">Set a new password</h1>
            <p className="mt-1 text-sm text-muted-foreground">for {email}</p>
            {state === 'done' ? (
              <p className="mt-6 text-sm font-medium text-emerald-600">Password updated. Signing you in…</p>
            ) : (
              <form onSubmit={confirmReset} className="mt-6 space-y-3">
                <input
                  type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password (min 8 characters)" minLength={8} required
                  className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-accent"
                />
                <button disabled={state === 'loading'} className="btn-gradient w-full rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
                  {state === 'loading' ? 'Saving…' : 'Update password'}
                </button>
              </form>
            )}
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl font-semibold">Reset your password</h1>
            <p className="mt-1 text-sm text-muted-foreground">We'll email you a secure reset link.</p>
            {state === 'sent' ? (
              <p className="mt-6 text-sm font-medium text-emerald-600">If an account exists for {addr}, a reset link is on its way. Check your inbox.</p>
            ) : (
              <form onSubmit={requestLink} className="mt-6 space-y-3">
                <input
                  type="email" value={addr} onChange={(e) => setAddr(e.target.value)}
                  placeholder="you@company.com" required
                  className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-accent"
                />
                <button disabled={state === 'loading'} className="btn-gradient w-full rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
                  {state === 'loading' ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            )}
          </>
        )}
        {msg && <p className="mt-3 text-sm text-red-600">{msg}</p>}
        <p className="mt-5 text-sm text-muted-foreground">
          <Link href="/login" className="text-accent hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}

export default function ResetPage() {
  return (
    <Suspense fallback={null}>
      <ResetInner />
    </Suspense>
  )
}
