import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import enUS from './locales/en-US'
import ptBR from './locales/pt-BR'
import type { Locale, TranslationKeys } from './types'

const STORAGE_KEY = 'obliq_locale'

const locales: Record<Locale, TranslationKeys> = {
  'pt-BR': ptBR,
  'en-US': enUS,
}

function loadLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'pt-BR' || stored === 'en-US') return stored
  } catch {
    /* ignore */
  }
  const browser = navigator.language
  return browser.startsWith('pt') ? 'pt-BR' : 'en-US'
}

function saveLocale(locale: Locale) {
  localStorage.setItem(STORAGE_KEY, locale)
}

type I18nContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: TranslationKeys
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => loadLocale())

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    saveLocale(next)
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
    document.title = locales[locale].meta.title
  }, [locale])

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: locales[locale],
    }),
    [locale, setLocale],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}

export function interpolate(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ''))
}
