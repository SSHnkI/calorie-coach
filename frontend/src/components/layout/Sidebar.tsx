import { NavLink } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nContext'
import { Logo } from './Logo'

export function Sidebar() {
  const { t } = useI18n()
  const links = [
    { to: '/dashboard', label: t.nav.dashboard, icon: '📊' },
    { to: '/workout', label: t.nav.workout, icon: '💪' },
    { to: '/pricing', label: t.nav.pro, icon: '⚡' },
  ]

  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-56 flex-col border-r border-obliq-border bg-obliq-black/95 px-4 py-6 md:flex">
      <div className="mb-8 px-2">
        <Logo size="md" />
      </div>
      <nav className="flex flex-col gap-1">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-wide transition-all ${
                isActive
                  ? 'bg-obliq-red/10 text-obliq-red shadow-red-glow'
                  : 'text-white/50 hover:text-white/80'
              }`
            }
          >
            <span className="text-lg">{l.icon}</span>
            {l.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
