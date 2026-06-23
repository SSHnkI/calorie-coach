import { useI18n } from '../../i18n/I18nContext'
import type { Locale } from '../../i18n/types'

const options: { locale: Locale; label: string }[] = [
  { locale: 'pt-BR', label: 'PT-BR' },
  { locale: 'en-US', label: 'EN-US' },
]

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n()

  return (
    <div
      className="inline-flex rounded-lg border border-obliq-border bg-obliq-surface p-0.5"
      role="group"
      aria-label="Language"
    >
      {options.map(({ locale: loc, label }) => (
        <button
          key={loc}
          type="button"
          onClick={() => setLocale(loc)}
          className={`rounded-md px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition-all sm:px-3 sm:py-1.5 sm:text-xs ${
            locale === loc
              ? 'bg-red-gradient text-white shadow-red-glow'
              : 'text-white/40 hover:text-white/70'
          }`}
          aria-pressed={locale === loc}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
