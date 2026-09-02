import { useI18n } from '../../i18n/I18nContext'
import type { Locale } from '../../i18n/types'

const options: { locale: Locale; label: string }[] = [
  { locale: 'pt-BR', label: 'PT' },
  { locale: 'en-US', label: 'EN' },
]

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n()

  return (
    <div className="inline-flex gap-1" role="group" aria-label="Idioma">
      {options.map(({ locale: loc, label }) => (
        <button
          key={loc}
          type="button"
          onClick={() => setLocale(loc)}
          aria-pressed={locale === loc}
          className={`rounded px-1.5 py-0.5 font-mono text-[10px] tracking-[0.1em] transition-colors duration-200 ${
            locale === loc
              ? 'text-obliq-chalk'
              : 'text-obliq-faint hover:text-obliq-dim'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
