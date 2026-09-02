import { LanguageSwitcher } from './LanguageSwitcher'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { ADMIN_EMAIL } from '../../lib/users'

// Barra utilitaria discreta. Nao compete com o conteudo da tela.
export function LanguageBar() {
  const { isAuthenticated, logout, user } = useApp()
  const ehAdmin = user?.email === ADMIN_EMAIL

  return (
    <div className="fixed right-3 top-3 z-50 flex items-center gap-2 rounded-lg bg-obliq-black/80 px-1.5 py-1 backdrop-blur-sm">
      <LanguageSwitcher />
      {isAuthenticated && (
        <>
          {ehAdmin && (
            <>
              <span className="h-3 w-px bg-obliq-border" aria-hidden="true" />
              <Link
                to="/usuarios"
                className="rounded px-1.5 py-0.5 font-mono text-[10px] tracking-[0.1em] text-obliq-faint transition-colors duration-200 hover:text-obliq-chalk"
              >
                USUÁRIOS
              </Link>
            </>
          )}
          <span className="h-3 w-px bg-obliq-border" aria-hidden="true" />
          <Link
            to="/reset-password"
            className="rounded px-1.5 py-0.5 font-mono text-[10px] tracking-[0.1em] text-obliq-faint transition-colors duration-200 hover:text-obliq-chalk"
          >
            SENHA
          </Link>
          <span className="h-3 w-px bg-obliq-border" aria-hidden="true" />
          <button
            type="button"
            onClick={() => logout()}
            className="rounded px-1.5 py-0.5 font-mono text-[10px] tracking-[0.1em] text-obliq-faint transition-colors duration-200 hover:text-obliq-red"
          >
            SAIR
          </button>
        </>
      )}
    </div>
  )
}
