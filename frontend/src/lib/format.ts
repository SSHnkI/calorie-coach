import type { Locale } from '../i18n/types'

export function formatKcal(value: number, locale: Locale = 'pt-BR'): string {
  return new Intl.NumberFormat(locale).format(Math.round(value))
}

export function formatMacro(value: number): string {
  return `${Math.round(value)}g`
}
