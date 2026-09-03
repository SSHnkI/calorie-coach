import type { Locale } from '../i18n/types'

export function formatKcal(value: number, locale: Locale = 'pt-BR'): string {
  return new Intl.NumberFormat(locale).format(Math.round(value))
}

export function formatMacro(value: number): string {
  return `${Math.round(value)}g`
}

// Quantidade de um item do diario, com o valor por unidade quando ha mais de uma.
//
// Existe porque "2 bife 600" nao deixa claro se as 600 kcal sao do par ou de cada
// um. Mostrar "2 bife · 300 cada" torna a multiplicacao visivel, e o usuario
// consegue conferir a estimativa de cabeca em vez de confiar nela.
export function formatQuantidade(quantity: number, unit: string, kcal: number): string {
  const base = `${quantity} ${unit}`.trim()
  if (!(quantity > 1) || !(kcal > 0)) return base
  return `${base} · ${Math.round(kcal / quantity)} cada`
}
