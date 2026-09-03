// Que hora carimbar num registro retroativo.
//
// A lista do dia e ordenada por logged_at, do mais novo pro mais antigo. A
// primeira versao usava a hora de agora, e isso jogava o item recem anotado pro
// meio da lista: anotar as 14h uma refeicao de quarta que ja tinha registro das
// 20h colocava a nova antes das 20h.
//
// O que a pessoa espera e o que acontece em hoje: o que acabou de entrar aparece
// em cima.

/** So o que interessa aqui de um FoodEntry. */
export type Registrado = { logged_at: string }

export function horaNoDia(dia: Date, jaRegistradas: readonly Registrado[]): Date {
  const fimDoDia = new Date(dia)
  fimDoDia.setHours(23, 59, 59, 0)

  const ultima = jaRegistradas.reduce((max, e) => {
    const t = new Date(e.logged_at).getTime()
    return Number.isFinite(t) ? Math.max(max, t) : max
  }, 0)

  // Um minuto depois da ultima, sem nunca vazar pro dia seguinte.
  if (ultima > 0) return new Date(Math.min(ultima + 60_000, fimDoDia.getTime()))

  // Dia ainda vazio: meio-dia e neutro e deixa margem pros dois lados.
  const meioDia = new Date(dia)
  meioDia.setHours(12, 0, 0, 0)
  return meioDia
}
