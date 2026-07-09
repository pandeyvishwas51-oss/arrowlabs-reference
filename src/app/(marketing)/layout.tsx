import { SiteNav } from '@/components/site/nav'
import { BackgroundFX } from '@/components/site/background-fx'
import { Footer } from '@/components/site/footer'
import { StructuredData } from '@/components/site/structured-data'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <StructuredData />
      <BackgroundFX />
      <SiteNav />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
