import type { ReactNode } from 'react'
import { Logo } from './Logo'

// ponytail: sem menu. O app tem duas telas e a de usuarios so o admin abre.
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-obliq-black">
      <header className="mx-auto max-w-3xl px-5 pb-1 pt-14 sm:pt-6">
        <Logo size="sm" />
      </header>

      <main id="conteudo" className="mx-auto max-w-3xl px-5 pb-10 pt-6">
        {children}
      </main>
    </div>
  )
}
