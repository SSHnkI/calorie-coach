// Verde, ambar, vermelho: quanto daquela meta ja foi consumido.
//
// A mesma regra vale na coluna da refeicao e na coluna do dia, e por isso mora
// aqui: sao duas leituras do mesmo numero, e se cada tela tivesse a sua tabela
// de corte elas iam discordar entre si na primeira mudanca.
//
// A cor sai como borda de 2px no topo da coluna. A coluna continua preta: a cor
// informa, nao decora, e ocupa o minimo pra isso.

/** Abaixo disso ainda cabe comida sem susto. */
export const FOLGA = 0.85

export type Faixa = 'vazio' | 'folga' | 'limite' | 'passou'

export function faixaDoConsumo(kcal: number, alvo: number): Faixa {
  if (!(kcal > 0)) return 'vazio'
  if (!(alvo > 0)) return 'folga'
  const parte = kcal / alvo
  if (parte > 1) return 'passou'
  if (parte > FOLGA) return 'limite'
  return 'folga'
}

const BORDAS: Record<Faixa, string> = {
  vazio: 'border-t-obliq-border',
  folga: 'border-t-obliq-green',
  limite: 'border-t-obliq-amber',
  passou: 'border-t-obliq-red',
}

export function bordaDoConsumo(kcal: number, alvo: number): string {
  return BORDAS[faixaDoConsumo(kcal, alvo)]
}
