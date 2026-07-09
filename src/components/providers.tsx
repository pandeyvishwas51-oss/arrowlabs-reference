'use client'

import { SessionProvider } from 'next-auth/react'
import { Suspense } from 'react'
import { PageTracker } from '@/components/page-tracker'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <Suspense fallback={null}>
        <PageTracker />
      </Suspense>
      {children}
    </SessionProvider>
  )
}
