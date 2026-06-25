import type { ReactNode } from 'react'
import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'
import { Logo } from './Logo'
import { useI18n } from '../../i18n/I18nContext'

type AppShellProps = {
  children: ReactNode
  showNav?: boolean
  titleKey?: 'dashboard' | 'workout' | 'pricing'
}

export function AppShell({ children, showNav = true, titleKey }: AppShellProps) {
  const { t } = useI18n()
  const title = titleKey
    ? titleKey === 'dashboard'
      ? t.dashboard.title
      : titleKey === 'workout'
        ? t.workout.title
        : t.pricing.title
    : undefined

  return (
    <div className={`min-h-dvh bg-obliq-black ${showNav ? 'md:pl-56' : ''}`}>
      {showNav && <Sidebar />}
      {title && (
        <header className="sticky top-0 z-40 border-b border-obliq-border bg-obliq-black/95 backdrop-blur-md md:hidden">
          <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-4 pr-16">
            <Logo size="sm" />
            <span className="text-sm font-bold uppercase tracking-wider text-white/60">
              {title}
            </span>
          </div>
        </header>
      )}
      <main className={`mx-auto max-w-lg px-4 md:max-w-3xl ${showNav ? 'pb-24 pt-4 md:pb-8' : 'py-4'}`}>
        {children}
      </main>
      {showNav && <BottomNav />}
    </div>
  )
}
