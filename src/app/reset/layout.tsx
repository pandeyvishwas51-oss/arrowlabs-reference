import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Reset password',
  description: 'Reset your ArrowLabs password.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/reset' },
  openGraph: { title: 'Reset password · ArrowLabs', url: '/reset' },
}

export default function ResetLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <noscript>
        <div style={{ padding: 24, textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
          Please enable JavaScript to reset your password.
        </div>
      </noscript>
      {children}
    </>
  )
}
