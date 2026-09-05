// Verde, ambar, vermelho: quanto daquela meta ja foi consumido.
//
// A mesma regra vale na coluna da refeicao e na coluna do dia, e por isso mora
// aqui: sao duas leituras do mesmo numero, e se cada tela tivesse a sua tabela
// de corte elas iam discordar entre si na primeira mudanca.
//
// A cor mora no PREENCHIMENTO, nao numa borda fixa no topo. A borda dizia a
// faixa mas nao dizia o tamanho: 100 kcal e 600 kcal desenhavam a mesma tampa
// verde, e a coluna passava a informacao pela metade. Preenchimento diz as duas
// coisas de uma vez, quanto entrou e se ainda cabe, sem texto nenhum.

/** Abaixo disso ainda cabe comida sem susto. */
export const FOLGA = 0.85

/** Onde a barra enche, em multiplos da meta. Um quarto de folga depois dela. */
export const TETO = 1.25

/** Onde a meta cai dentro do trilho, em porcentagem. */
export const MARCA_DA_META = 100 / TETO

export type Faixa = 'vazio' | 'folga' | 'limite' | 'passou'

export function faixaDoConsumo(kcal: number, alvo: number): Faixa {
  if (!(kcal > 0)) return 'vazio'
  if (!(alvo > 0)) return 'folga'
  const parte = kcal / alvo
  if (parte > 1) return 'passou'
  if (parte > FOLGA) return 'limite'
  return 'folga'
}

const FUNDOS: Record<Faixa, string> = {
  vazio: 'bg-obliq-border',
  folga: 'bg-obliq-green',
  limite: 'bg-obliq-amber',
  passou: 'bg-obliq-red',
}

/** Classe de fundo da barra que representa o consumo. */
export function corDoConsumo(kcal: number, alvo: number): string {
  return FUNDOS[faixaDoConsumo(kcal, alvo)]
}

/**
 * Onde a barra enche. A meta NAO e o fim do trilho: e a marca em 80% dele.
 *
 * Encher no proprio alvo apagava a diferenca entre acertar a meta e estourar,
 * que e a diferenca que mais importa: 500 de 500 e 900 de 500 desenhavam a
 * mesma barra cheia. Sobrando um quarto de trilho depois da marca, barra cheia
 * volta a querer dizer teto, e o quanto passou aparece.
 *
 * Passar do teto trava em 100: dali pra frente o vermelho ja disse tudo, e
 * barra vazando pra fora da caixa so quebraria o alinhamento das colunas.
 *
 * O piso existe pra que registro pequeno apareca: 1% e visualmente identico a
 * coluna vazia, e as duas coisas sao opostas. Ele e parametro porque as duas
 * barras tem tamanhos fisicos diferentes: a da refeicao e uma faixa de 4px de
 * altura, a do dia tem 32px, e a mesma porcentagem some numa e nao na outra.
 */
export function preenchimento(kcal: number, alvo: number, piso = 4): number {
  if (!(kcal > 0)) return 0
  if (!(alvo > 0)) return 100
  return Math.max(piso, Math.min(100, (kcal / (alvo * TETO)) * 100))
}
