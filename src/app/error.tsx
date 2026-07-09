'use client'

// Segment error boundary - catches render/runtime errors in any route below the
// root layout and shows a friendly recover screen instead of a broken page.
import Link from 'next/link'

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient text-xl font-bold text-white">↗</div>
      <h1 className="mt-5 font-display text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        This page hit an unexpected error. Try again - your data is safe.
      </p>
      <div className="mt-6 flex gap-3">
        <button onClick={() => reset()} className="btn-gradient rounded-xl px-6 py-2.5 text-sm font-semibold">Try again</button>
        <Link href="/" className="rounded-xl border border-border px-6 py-2.5 text-sm font-semibold text-foreground hover:bg-black/[0.03]">Go home</Link>
      </div>
    </div>
  )
}
