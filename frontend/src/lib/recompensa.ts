// Onde o app comemora, e por quê.
//
// A regra que orienta este arquivo: reforçar o comportamento que a pessoa quer
// repetir. Registrar todo dia é isso. Terminar o dia dentro da meta também.
// Chegar na meta comendo, para quem quer emagrecer, é o momento de parar, não
// de comemorar, e era exatamente aí que a festa caía antes.

export type Objetivo = 'lose' | 'maintain' | 'gain'

// Marcos de sequência. Espaçados de propósito: se todo dia fosse marco,
// nenhum dia seria.
export const MARCOS = [3, 7, 14, 30, 60, 100, 200, 365] as const

/** Maior marco que uma sequência de `dias` já alcançou. */
export function marcoDaSequencia(dias: number): number | null {
  let achado: number | null = null
  for (const m of MARCOS) if (dias >= m) achado = m
  return achado
}

/**
 * Decide se há marco novo para comemorar, comparando com o último comemorado.
 *
 * `guardar` é o valor a persistir. Quando a sequência quebra, ele desce junto,
 * senão a pessoa que perdeu a corrente de 30 dias nunca mais veria uma festa.
 */
export function marcoNovo(
  dias: number,
  ultimoComemorado: number,
): { marco: number | null; guardar: number } {
  const atual = marcoDaSequencia(dias) ?? 0
  if (atual > ultimoComemorado) return { marco: atual, guardar: atual }
  if (atual < ultimoComemorado) return { marco: null, guardar: atual }
  return { marco: null, guardar: ultimoComemorado }
}

export type Desfecho = 'vazio' | 'andando' | 'dentro' | 'acima' | 'atingiu' | 'anotado'

/**
 * Chao do dia, em fracao da meta. Abaixo disto o dia fecha NEUTRO, sem festa.
 *
 * Antes, `dentro` valia para qualquer consumo acima de zero abaixo da meta: 800
 * kcal de uma meta de 1800 fechava o dia com exatamente a mesma comemoracao que
 * 1750. A regra de ouro protegia o teto e deixava o chao escancarado, e o
 * resultado era reforco positivo direto de restricao, cada vez mais facil de
 * obter quanto menos a pessoa comesse.
 *
 * O segundo motivo e igualmente importante: uma unica linha de 300 kcal fechava
 * o dia em festa. O app pagava pelo buraco no dado, e ensinava em poucos dias
 * que anotar menos rende mais festa do que anotar tudo.
 */
export const PISO_DO_DIA = 0.7

/**
 * Como o dia está indo, no idioma do objetivo da pessoa.
 *
 * `fechado` diz se o dia já acabou: dia passado, ou hoje depois da hora em que
 * quase ninguém come mais. Antes disso, estar abaixo da meta não é vitória, é
 * só o dia andando.
 */
export function desfechoDoDia(p: {
  objetivo: Objetivo
  kcal: number
  meta: number
  fechado: boolean
}): Desfecho {
  if (p.kcal <= 0) return 'vazio'
  if (p.meta <= 0) return 'andando'

  // Quem quer ganhar peso tem a meta como alvo a alcançar, não como teto.
  if (p.objetivo === 'gain') return p.kcal >= p.meta ? 'atingiu' : 'andando'

  if (p.kcal > p.meta) return 'acima'
  if (!p.fechado) return 'andando'

  // Dia fechado muito abaixo da meta nao e vitoria: ou faltou comida, ou faltou
  // registro, e nenhuma das duas merece festa. Fecha anotado, que e neutro.
  return p.kcal >= p.meta * PISO_DO_DIA ? 'dentro' : 'anotado'
}

export function comemora(d: Desfecho): boolean {
  return d === 'dentro' || d === 'atingiu'
}
