import { NavLink } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nContext'
import { useApp } from '../../context/AppContext'

export function BottomNav() {
  const { t } = useI18n()
  const { user, isTrainer, isNutri } = useApp()
  const isAdmin = user?.email === 'victorguilhermevg3@gmail.com'

  const links = [
    { to: '/dashboard', label: t.nav.dashboard, icon: '📊' },
    { to: '/workout', label: t.nav.workout, icon: '💪' },
    { to: '/diet', label: 'Dieta', icon: '🥗' },
    { to: '/pricing', label: t.nav.pro, icon: '⚡' },
    ...(isTrainer || isAdmin ? [{ to: '/trainer', label: 'Treinador', icon: '🧑‍🏫' }] : []),
    ...(isNutri || isAdmin ? [{ to: '/nutritionist', label: 'Nutri', icon: '🍎' }] : []),
    ...(isAdmin ? [{ to: '/admin', label: 'Admin', icon: '🛠️' }] : []),
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-obliq-border bg-obliq-black/95 backdrop-blur-md md:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-around gap-0.5 overflow-x-auto px-2 py-2 scrollbar-none">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex shrink-0 flex-col items-center gap-0.5 rounded-xl px-2.5 py-2 text-[9px] font-bold uppercase tracking-wide transition-all active:scale-95 ${
                isActive
                  ? 'text-obliq-red'
                  : 'text-white/40 hover:text-white/70'
              }`
            }
          >
            <span className="text-lg">{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
