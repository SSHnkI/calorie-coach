import type { Objetivo } from './recompensa'

// Quanta energia cabe em um quilo de tecido adiposo. Numero de livro, nao de
// balanca: a projecao e uma tendencia, nunca uma promessa.
export const KCAL_POR_KG = 7700

// Em kcal por dia. Abaixo disso o saldo e ruido de estimativa, nao direcao.
export const PARADO = 100
// Manutencao tolera mais: manter peso e ficar perto de zero, nao em zero.
export const PARADO_MANTER = 150

export type Rumo = 'certo' | 'parado' | 'contra'

/** Quilos por semana no ritmo de um saldo diario medio. */
export function kgPorSemana(saldoDiario: number): number {
  return (saldoDiario * 7) / KCAL_POR_KG
}

/**
 * O objetivo esta contido na meta do dia: ela e a manutencao mais o deficit ou
 * o superavit escolhido no onboarding. Ler dali evita carregar o perfil inteiro
 * ate a projecao so pra saber o sinal.
 */
export function objetivoDaMeta(meta: number, manutencao: number): Objetivo {
  if (meta < manutencao - 50) return 'lose'
  if (meta > manutencao + 50) return 'gain'
  return 'maintain'
}

/**
 * Para que lado a pessoa esta indo, em relacao ao que ela quer.
 *
 * O sinal do saldo sozinho nao diz nada: perder 0,3 kg por semana e otimo pra
 * quem quer emagrecer e e o fracasso de quem quer ganhar massa. Quem sabe a
 * diferenca e o objetivo, e e por isso que a cor da tela sai daqui e nao do
 * sinal do numero. O app ja errou nessa direcao antes, comemorando alcancar a
 * meta pra quem devia parar de comer.
 */
export function rumoDoSaldo(saldo: number, objetivo: Objetivo): Rumo {
  if (objetivo === 'maintain') return Math.abs(saldo) <= PARADO_MANTER ? 'certo' : 'contra'
  const aFavor = objetivo === 'lose' ? -saldo : saldo
  if (aFavor >= PARADO) return 'certo'
  if (aFavor > -PARADO) return 'parado'
  return 'contra'
}
