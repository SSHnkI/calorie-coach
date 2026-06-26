import { LanguageSwitcher } from './LanguageSwitcher'
import { useApp } from '../../context/AppContext'

export function LanguageBar() {
  const { isAuthenticated, logout } = useApp()

  return (
    <div className="fixed right-3 top-3 z-[100] flex flex-col items-end gap-1.5 rounded-xl bg-obliq-black/85 p-1.5 backdrop-blur-sm">
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
