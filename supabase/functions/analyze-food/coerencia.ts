// Checagem de sanidade do que o modelo devolve.
//
// Antes daqui existia um refinamento pelo Open Food Facts, que foi removido: o
// OFF e um banco de PRODUTOS EMBALADOS pesquisado por texto livre, e a busca por
// "white rice" devolvia "Tortitas de arroz con chocolate blanco", 467 kcal/100g,
// contra 130 do arroz cozido de verdade. Pior: o codigo aceitava qualquer numero
// maior que zero, entao "rice" trazia 1900 kcal/100g, acima do limite fisico. E
// marcava o resultado como confianca alta, justamente quando era menos confiavel.
//
// O modelo sozinho erra menos do que casar texto contra comida embalada. O que
// falta nele e trava, e e isso que este arquivo faz.

export type Macros = {
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  grams_total?: number
  /** Gramas de etanol puro. Bebida alcoolica sem isto some da conta de energia. */
  alcohol_g?: number
}

/**
 * Atwater: 4 kcal por grama de proteina e carboidrato, 9 por grama de gordura,
 * 7 por grama de alcool.
 *
 * O alcool entrou porque ele nao e macro nenhum dos tres: uma dose de whisky tem
 * proteina, carboidrato e gordura zerados e ainda assim ~110 kcal. Sem esta
 * parcela a conciliacao via os tres macros dava zero, e a unica saida era nao
 * conciliar bebida destilada nenhuma.
 */
export function kcalDosMacros(m: Macros): number {
  return 4 * n(m.protein_g) + 4 * n(m.carbs_g) + 9 * n(m.fat_g) + 7 * n(m.alcohol_g)
}

// Gordura pura, o alimento mais denso que existe, da 9 kcal por grama. Nada
// comestivel passa disso, entao qualquer densidade acima e erro, nao alimento.
export const MAX_KCAL_POR_GRAMA = 9

// Abaixo disso a diferenca entre o kcal declarado e o que os macros somam cabe
// em arredondamento e em fibra, que nao entra na conta de Atwater.
export const TOLERANCIA = 0.25

/** Valores de cem gramas do alimento. E o que o modelo sabe de tabela. */
export type Por100g = {
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  alcohol_g?: number
}

/**
 * Total da porcao, calculado da densidade e do peso.
 *
 * O modelo passou a devolver kcal por 100 g em vez do total, e a multiplicacao
 * virou nossa. O motivo e simples: densidade e numero de tabela, que ele sabe de
 * cor (arroz cozido 130, feijao 76, peito de frango 165), enquanto "quanto tem
 * numa concha de 80 g" e uma conta, e conta e onde ele erra. Antes dava pra ver
 * o mesmo arroz sair com 155 kcal numa vez e 420 na outra.
 *
 * A trava de densidade vem antes da conta: nada comestivel passa de 900 kcal por
 * 100 g, que e gordura pura.
 */
export function totaisDaPorcao(gramas: number, por100: Por100g) {
  const fator = n(gramas) / 100
  const densidade = Math.min(n(por100.kcal), MAX_KCAL_POR_GRAMA * 100)
  const macro = (v: unknown) => Math.round(n(v) * fator * 10) / 10
  return {
    kcal: Math.round(densidade * fator),
    protein_g: macro(por100.protein_g),
    carbs_g: macro(por100.carbs_g),
    fat_g: macro(por100.fat_g),
    alcohol_g: macro(por100.alcohol_g),
    grams_total: Math.round(n(gramas)),
  }
}

export type Ajuste = 'nenhum' | 'macros' | 'densidade' | 'suspeito'

export type Resultado = { kcal: number; ajuste: Ajuste; confiavel: boolean }

/**
 * Concilia o kcal declarado com os macros e com o peso da porcao.
 *
 * A regra corrige em UMA direcao so, e a auditoria dos itens ja gravados foi o
 * que ensinou isso. Sobrescrever sempre pelo valor dos macros dava 1 acerto, 1
 * erro e 1 empate:
 *
 *   cafe            declarado 50, macros  1, referencia  10  -> macros acertam
 *   creme de ricota declarado 34, macros 16, referencia  35  -> o declarado acertava
 *
 * O que separa os dois casos e a direcao. Macro e PISO de energia: 30 g de
 * gordura nao cabem em 100 kcal, e isso e fisica, nao estimativa. Entao:
 *
 * 1. macros somando MAIS que o declarado: o declarado e impossivel, sobe pro
 *    piso. Indiscutivel.
 * 2. macros somando MENOS: pode ser macro faltando, como a gordura que sumiu do
 *    creme de ricota. Nao sobrescreve, so marca como suspeito, e a tela mostra
 *    "estimado" no item.
 * 3. densidade acima do limite fisico: corta no limite, em qualquer direcao.
 */
export function coerir(m: Macros): Resultado {
  const declarado = Math.max(0, n(m.kcal))
  const porMacros = kcalDosMacros(m)

  let kcal = declarado
  let ajuste: Ajuste = 'nenhum'

  // So conciliar quando ha macro para conciliar: item com macros zerados (agua,
  // cafe puro) nao pode ser reescrito para zero kcal por causa disso.
  if (porMacros > 0) {
    const base = Math.max(declarado, porMacros)
    if (Math.abs(declarado - porMacros) / base > TOLERANCIA) {
      if (porMacros > declarado) {
        // Piso de energia violado: o declarado nao cabe nos proprios macros.
        kcal = porMacros
        ajuste = 'macros'
      } else {
        // Provavel macro faltando. Nao mexe no numero, mas nao finge confianca.
        ajuste = 'suspeito'
      }
    }
  }

  const gramas = n(m.grams_total)
  if (gramas > 0) {
    const teto = gramas * MAX_KCAL_POR_GRAMA
    if (kcal > teto) {
      kcal = teto
      ajuste = 'densidade'
    }
  }

  return { kcal: Math.round(kcal), ajuste, confiavel: ajuste === 'nenhum' }
}

function n(v: unknown): number {
  const x = Number(v)
  return Number.isFinite(x) && x > 0 ? x : 0
}

/** O que o modelo devolve por item. */
export type ItemDoModelo = {
  name?: string
  quantity?: number
  unit?: string
  grams_total?: number
  /** Caminho normal: densidade, e a conta e nossa. */
  por_100g?: Por100g
  /** Caminho velho, de modelo que ignora o formato e manda o total direto. */
  kcal?: number
  protein_g?: number
  carbs_g?: number
  fat_g?: number
  alcohol_g?: number
  confidence?: 'high' | 'medium' | 'low'
}

/** O que vai pro diario, depois da conta e das travas. */
export type Registro = {
  name: string
  quantity: number
  unit: string
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  confidence: 'high' | 'medium' | 'low'
  ajuste: Ajuste
}

/**
 * Monta o registro final a partir do que o modelo devolveu.
 *
 * Mora aqui, e nao no index.ts, porque isto e a conta do app inteiro e precisa
 * de teste: os casos do arquivo de teste sao saidas REAIS do modelo, copiadas
 * da API, e nao exemplos inventados.
 *
 * Campo faltando nao derruba nada: resposta cortada no meio por teto de tokens
 * chega sem `confidence`, e item sem nome ainda e comida que a pessoa comeu.
 */
export function montarRegistro(item: ItemDoModelo): Registro {
  const bruto = item.por_100g
    ? totaisDaPorcao(n(item.grams_total), item.por_100g)
    : {
        kcal: n(item.kcal),
        protein_g: n(item.protein_g),
        carbs_g: n(item.carbs_g),
        fat_g: n(item.fat_g),
        alcohol_g: n(item.alcohol_g),
        grams_total: n(item.grams_total),
      }

  const { kcal, ajuste, confiavel } = coerir(bruto)
  const declarada = item.confidence ?? 'medium'

  return {
    name: String(item.name ?? '').trim().slice(0, 120) || 'refeição',
    quantity: n(item.quantity) || 1,
    unit: String(item.unit ?? '').trim().slice(0, 40) || 'porção',
    kcal,
    protein_g: bruto.protein_g,
    carbs_g: bruto.carbs_g,
    fat_g: bruto.fat_g,
    // Contradicao interna derruba a confianca declarada pelo modelo: ele errou
    // uma conta que ele mesmo forneceu os numeros para fazer.
    confidence: confiavel ? declarada : 'low',
    ajuste,
  }
}
