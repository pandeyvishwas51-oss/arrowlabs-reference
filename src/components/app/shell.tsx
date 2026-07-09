'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { Home, Sparkles, Palette, Boxes, Users, Settings, LogOut, PanelLeftClose, PanelLeft } from 'lucide-react'
import { Logo } from '@/components/site/logo'

// Dashboard shell - soft blush canvas + collapsible labeled sidebar + top bar.

const NAV = [
  { href: '/studio', icon: Home, label: 'Studio' },
  { href: '/generate', icon: Sparkles, label: 'Generate' },
  { href: '/brand', icon: Palette, label: 'Brand DNA' },
  { href: '/assets', icon: Boxes, label: 'Assets' },
  { href: '/account', icon: Users, label: 'Account' },
  { href: '/admin', icon: Settings, label: 'Admin' },
]

export function Shell({ title, credits, unlimited, children }: { title: string; credits?: number; unlimited?: boolean; children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const user = session?.user as any
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('al_sidebar_collapsed')
    if (saved) setCollapsed(saved === '1')
  }, [])
  const toggle = () => {
    setCollapsed((c) => {
      localStorage.setItem('al_sidebar_collapsed', c ? '0' : '1')
      return !c
    })
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(120%_80%_at_50%_-10%,oklch(0.97_0.03_20)_0%,oklch(0.99_0.005_60)_45%,oklch(1_0_0)_100%)]">
      <div className="mx-auto flex min-h-screen max-w-[1500px] gap-0 p-3 sm:p-5">
        {/* Sidebar */}
        <aside
          className={`sticky top-5 hidden h-[calc(100vh-2.5rem)] shrink-0 flex-col justify-between rounded-3xl border border-black/5 bg-white/70 py-4 backdrop-blur-xl transition-[width] duration-300 sm:flex ${
            collapsed ? 'w-16 items-center' : 'w-56 px-3'
          }`}
        >
          <div className={`flex w-full flex-col gap-1.5 ${collapsed ? 'items-center' : ''}`}>
            <div className={`mb-3 flex items-center ${collapsed ? 'justify-center' : 'justify-between px-1'}`}>
              <Link href="/">{collapsed ? <Logo showWordmark={false} /> : <Logo />}</Link>
            </div>
            {NAV.filter((n) => n.href !== '/admin' || user?.role === 'admin').map(({ href, icon: Icon, label }) => {
              const base = href.split('#')[0]
              const active = pathname === base
              return (
                <Link
                  key={label}
                  href={href}
                  title={label}
                  className={`flex items-center gap-3 rounded-xl transition ${collapsed ? 'h-10 w-10 justify-center' : 'w-full px-3 py-2'} ${
                    active ? 'bg-accent/10 text-accent' : 'text-muted-foreground hover:bg-black/5 hover:text-foreground'
                  }`}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  {!collapsed && <span className="text-sm font-medium">{label}</span>}
                </Link>
              )
            })}
          </div>

          <div className={`flex w-full flex-col gap-1.5 ${collapsed ? 'items-center' : ''}`}>
            <button
              onClick={toggle}
              title={collapsed ? 'Expand' : 'Collapse'}
              className={`flex items-center gap-3 rounded-xl text-muted-foreground transition hover:bg-black/5 hover:text-foreground ${collapsed ? 'h-10 w-10 justify-center' : 'w-full px-3 py-2'}`}
            >
              {collapsed ? <PanelLeft className="h-[18px] w-[18px]" /> : <><PanelLeftClose className="h-[18px] w-[18px]" /><span className="text-sm font-medium">Collapse</span></>}
            </button>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              title="Sign out"
              className={`flex items-center gap-3 rounded-xl text-muted-foreground transition hover:bg-black/5 hover:text-foreground ${collapsed ? 'h-10 w-10 justify-center' : 'w-full px-3 py-2'}`}
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span className="text-sm font-medium">Sign out</span>}
            </button>
          </div>
        </aside>

        {/* Main panel */}
        <div className="flex min-w-0 flex-1 flex-col sm:pl-4">
          <header className="mb-4 flex items-center justify-between rounded-2xl border border-black/5 bg-white/70 px-4 py-2.5 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <Link href="/" className="sm:hidden"><Logo showWordmark={false} /></Link>
              <span className="font-display text-[15px] font-semibold tracking-tight">{title}</span>
            </div>
            <div className="flex items-center gap-2">
              {unlimited ? (
                <span className="label-mono rounded-full bg-gradient-to-r from-accent/15 to-accent/5 px-3 py-1 text-xs font-semibold text-accent">✦ Unlimited · free trial</span>
              ) : typeof credits === 'number' ? (
                <span className="label-mono rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">{credits} credits</span>
              ) : null}
              {user ? (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-accent/30 to-accent/10 text-xs font-semibold text-accent">
                  {(user.email || '?')[0].toUpperCase()}
                </div>
              ) : (
                <Link href="/login" className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white">Sign in</Link>
              )}
            </div>
          </header>
          <main className="flex-1 pb-6">{children}</main>
        </div>
      </div>
    </div>
  )
}

export function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl border border-black/5 bg-white/80 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_12px_32px_-24px_rgba(0,0,0,0.25)] backdrop-blur-xl ${className}`}>
      {children}
    </div>
  )
}
