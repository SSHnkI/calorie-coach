import type { ReactNode } from 'react'
import { BottomNav } from './BottomNav'
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
    <div className="min-h-dvh bg-obliq-black">
      {title && (
        <header className="sticky top-0 z-40 border-b border-obliq-border bg-obliq-black/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-4 pr-28">
            <Logo size="sm" />
            <span className="text-sm font-bold uppercase tracking-wider text-white/60">
              {title}
            </span>
          </div>
        </header>
      )}
      <main className={`mx-auto max-w-lg px-4 ${showNav ? 'pb-24 pt-4' : 'py-4'}`}>
        {children}
      </main>
      {showNav && <BottomNav />}
    </div>
  )
}
