import { NavLink } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nContext'

export function BottomNav() {
  const { t } = useI18n()

  const links = [
    { to: '/dashboard', label: t.nav.dashboard, icon: '📊' },
    { to: '/workout', label: t.nav.workout, icon: '💪' },
    { to: '/pricing', label: t.nav.pro, icon: '⚡' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-obliq-border bg-obliq-black/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-center justify-around px-4 py-2">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 rounded-xl px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-all ${
                isActive
                  ? 'text-obliq-red shadow-red-glow'
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
