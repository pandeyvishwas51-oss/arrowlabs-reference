import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to ArrowLabs.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/login' },
  openGraph: { title: 'Sign in · ArrowLabs', url: '/login' },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <noscript>
        <div style={{ padding: 24, textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
          Please enable JavaScript to sign in to ArrowLabs.
        </div>
      </noscript>
      {children}
    </>
  )
}
