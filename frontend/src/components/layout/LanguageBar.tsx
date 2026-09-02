import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LanguageSwitcher } from './LanguageSwitcher'
import { TemaSwitcher } from './TemaSwitcher'
import { useApp } from '../../context/AppContext'
import { ADMIN_EMAIL } from '../../lib/users'
import { Icon } from '../ui/Icon'

/**
 * Barra utilitaria. No celular cabem so os dois seletores: o resto vai
 * pra um menu, senao a barra cobre o logo do cabecalho.
 */
export function LanguageBar() {
  const { isAuthenticated, logout, user } = useApp()
  const [aberto, setAberto] = useState(false)
  const ehAdmin = user?.email === ADMIN_EMAIL

  const links = [
    ...(ehAdmin ? [{ to: '/usuarios', label: 'Usuários' }] : []),
    { to: '/reset-password', label: 'Trocar senha' },
  ]

  return (
    <div
      style={{ top: 'calc(0.5rem + env(safe-area-inset-top))' }}
      className="fixed right-3 z-50 flex flex-col items-end gap-1"
    >
      <div className="flex items-center gap-1.5 rounded-lg bg-obliq-black/85 px-1.5 py-1 backdrop-blur-sm">
        <LanguageSwitcher />
        <span className="h-3 w-px bg-obliq-border" aria-hidden="true" />
        <TemaSwitcher />

        {isAuthenticated && (
          <>
            <span className="h-3 w-px bg-obliq-border" aria-hidden="true" />

            {/* Telas largas mostram tudo. No celular, um botao so. */}
            <div className="hidden items-center gap-1.5 sm:flex">
              {links.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-obliq-faint transition-colors duration-200 hover:text-obliq-chalk"
                >
                  {l.label}
                </Link>
              ))}
              <button
                type="button"
                onClick={() => logout()}
                className="rounded px-1.5 py-0.5 font-mono text-[10px] tracking-[0.1em] text-obliq-faint transition-colors duration-200 hover:text-obliq-red"
              >
                SAIR
              </button>
            </div>

            <button
              type="button"
              onClick={() => setAberto((a) => !a)}
              aria-expanded={aberto}
              aria-label="Menu da conta"
              className="p-1 text-obliq-faint transition-colors duration-200 hover:text-obliq-chalk sm:hidden"
            >
              <Icon name="menu" className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {aberto && isAuthenticated && (
        <nav className="rise flex flex-col overflow-hidden rounded-lg bg-obliq-surface py-1 shadow-lift ring-1 ring-obliq-border sm:hidden">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setAberto(false)}
              className="px-4 py-2.5 text-right text-sm text-obliq-dim transition-colors hover:text-obliq-chalk"
            >
              {l.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => {
              setAberto(false)
              logout()
            }}
            className="px-4 py-2.5 text-right text-sm text-obliq-dim transition-colors hover:text-obliq-red"
          >
            Sair
          </button>
        </nav>
      )}
    </div>
  )
}
