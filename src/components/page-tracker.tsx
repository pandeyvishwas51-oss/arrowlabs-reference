'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

// Fires a lightweight pageview beacon on every route change. Skips app-internal
// churn by debouncing identical consecutive paths.
export function PageTracker() {
  const pathname = usePathname()
  useEffect(() => {
    const ctrl = new AbortController()
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname, referrer: document.referrer || '' }),
      signal: ctrl.signal,
      keepalive: true,
    }).catch(() => {})
    return () => ctrl.abort()
  }, [pathname])
  return null
}
