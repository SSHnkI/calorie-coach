import { LanguageSwitcher } from './LanguageSwitcher'
import { useApp } from '../../context/AppContext'

export function LanguageBar() {
  const { isAuthenticated, logout } = useApp()

  return (
    <div className="fixed right-4 top-4 z-[100] flex flex-col items-end gap-1.5">
      <LanguageSwitcher />
      {isAuthenticated && (
        <button
          type="button"
          onClick={() => logout()}
          className="rounded-md border border-obliq-border bg-obliq-surface px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white/50 hover:text-white"
        >
          Sair
        </button>
      )}
    </div>
  )
}
