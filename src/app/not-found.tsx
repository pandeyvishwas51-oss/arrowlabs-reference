import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="font-display text-6xl font-bold text-gradient">404</div>
      <h1 className="mt-3 font-display text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <div className="mt-6 flex gap-3">
        <Link href="/" className="btn-gradient rounded-xl px-6 py-2.5 text-sm font-semibold">Go home</Link>
        <Link href="/studio" className="rounded-xl border border-border px-6 py-2.5 text-sm font-semibold text-foreground hover:bg-black/[0.03]">Open the Studio</Link>
      </div>
    </div>
  )
}
