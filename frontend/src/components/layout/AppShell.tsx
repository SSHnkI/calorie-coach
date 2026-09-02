import type { ReactNode } from 'react'
import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'
import { Logo } from './Logo'

type AppShellProps = {
  children: ReactNode
  showNav?: boolean
  titleKey?: 'dashboard' | 'workout' | 'pricing' | 'diet'
}

export function AppShell({ children, showNav = true }: AppShellProps) {
  return (
    <div className={`min-h-dvh bg-obliq-black ${showNav ? 'md:pl-56' : ''}`}>
      {showNav && <Sidebar />}

      <header className="mx-auto max-w-3xl px-5 pt-6">
        <Logo size="sm" />
      </header>

      <main
        id="conteudo"
        className={`mx-auto max-w-3xl px-5 pt-6 ${showNav ? 'pb-24 md:pb-10' : 'pb-10'}`}
      >
        {children}
      </main>

      {showNav && <BottomNav />}
    </div>
  )
}
