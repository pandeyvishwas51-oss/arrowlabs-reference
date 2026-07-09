'use client'

// Root error boundary - catches errors in the root layout itself. Must render
// its own <html>/<body>. Uses inline styles only (no external CSS dependency)
// so it always renders even if everything else is broken.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#faf9ff', color: '#14121f' }}>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(120deg,#6D5EF6,#E24BF0 55%,#FF5C7A)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 26, fontWeight: 700 }}>↗</div>
          <h1 style={{ marginTop: 20, fontSize: 24, fontWeight: 700 }}>Something went wrong</h1>
          <p style={{ marginTop: 8, color: '#6b6880', maxWidth: 380 }}>An unexpected error occurred. Please try again - if it keeps happening, it&apos;s on us and we&apos;re on it.</p>
          <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
            <button onClick={() => reset()} style={{ padding: '11px 22px', borderRadius: 10, border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer', background: 'linear-gradient(120deg,#6D5EF6,#E24BF0 55%,#FF5C7A)' }}>Try again</button>
            <a href="/" style={{ padding: '11px 22px', borderRadius: 10, border: '1px solid #e5e3ee', color: '#14121f', textDecoration: 'none', fontWeight: 600 }}>Go home</a>
          </div>
        </div>
      </body>
    </html>
  )
}
