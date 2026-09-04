import { PERIODOS, periodoDe, type PeriodoId } from './periodos.ts'

// Que hora carimbar num registro que nao e "agora".
//
// Duas coisas caem aqui:
//
// 1. Dia passado. A lista do dia e ordenada por logged_at, do mais novo pro mais
//    antigo, e a primeira versao usava a hora de agora: anotar as 14h uma
//    refeicao de quarta que ja tinha registro das 20h colocava a nova antes das
//    20h, no meio da lista. O que a pessoa espera e o que acontece em hoje: o
//    que acabou de entrar aparece em cima.
//
// 2. Periodo escolhido a mao. Se ela diz que aquilo foi o almoco, a hora tem que
//    cair dentro da janela do almoco, senao a caixa da tela e o agrupamento do
//    diario mostram a comida em outro lugar.
//
// As duas se resolvem com a mesma conta: um minuto depois do ultimo registro
// DAQUELE periodo, preso dentro da janela.

/** So o que interessa aqui de um FoodEntry. */
export type Registrado = { logged_at: string }

function emQue(dia: Date, hora: number, minuto = 0): Date {
  const d = new Date(dia)
  d.setHours(hora, minuto, 0, 0)
  return d
}

export function horaNoPeriodo(
  dia: Date,
  periodo: PeriodoId,
  jaRegistradas: readonly Registrado[],
): Date {
  const janela = PERIODOS.find((p) => p.id === periodo) ?? PERIODOS[3]

  const inicio = emQue(dia, janela.de)
  // Um minuto antes do fim da janela, e nunca depois das 23:59 do proprio dia:
  // a noite vai ate as 5h da manha seguinte, mas o registro pertence a este dia.
  const fim = new Date(
    Math.min(emQue(dia, janela.ate).getTime() - 60_000, emQue(dia, 23, 59).getTime()),
  )

  const ultima = jaRegistradas.reduce((max, e) => {
    const d = new Date(e.logged_at)
    if (!Number.isFinite(d.getTime()) || periodoDe(d) !== periodo) return max
    return Math.max(max, d.getTime())
  }, 0)

  if (ultima > 0) {
    return new Date(Math.min(Math.max(ultima + 60_000, inicio.getTime()), fim.getTime()))
  }

  // Janela ainda vazia: o meio dela deixa margem pros dois lados.
  return new Date(Math.round((inicio.getTime() + fim.getTime()) / 2))
}
