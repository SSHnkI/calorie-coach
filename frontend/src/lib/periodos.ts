// As quatro janelas do dia, num lugar so.
//
// Estavam declaradas dentro do Refeicoes.tsx, e a hora do registro era decidida
// em outro arquivo sem olhar pra elas. Resultado: o app mostrava a refeicao numa
// janela e carimbava a hora em outra. Agora a lista mora aqui e todo mundo le
// daqui: as caixas da tela, a meta de cada refeicao, o agrupamento do diario e a
// hora carimbada no registro.
//
// A noite termina em 29 (5h do dia seguinte) de proposito: quem come a 1h da
// manha comeu de noite, nao de manha. A soma das quatro janelas tem que dar 24,
// senao metasPorRefeicao distribui a meta do dia errado.

export const PERIODOS = [
  { id: 'manha', rotulo: 'manhã', de: 5, ate: 12 },
  { id: 'almoco', rotulo: 'almoço', de: 12, ate: 14 },
  { id: 'tarde', rotulo: 'tarde', de: 14, ate: 18 },
  { id: 'noite', rotulo: 'noite', de: 18, ate: 29 },
] as const

export type Periodo = (typeof PERIODOS)[number]
export type PeriodoId = Periodo['id']

/** Onde a madrugada quebra: antes disso a hora pertence a noite anterior. */
const VIRADA = 5

/** A hora do relogio (0 a 23) na escala continua das janelas (5 a 29). */
export function horaContinua(hora: number): number {
  return hora < VIRADA ? hora + 24 : hora
}

export function periodoDaHora(hora: number): PeriodoId {
  const h = horaContinua(hora)
  return PERIODOS.find((p) => h >= p.de && h < p.ate)?.id ?? 'noite'
}

export function periodoDe(data: Date): PeriodoId {
  return periodoDaHora(data.getHours())
}

export function periodoAgora(): PeriodoId {
  return periodoDe(new Date())
}

