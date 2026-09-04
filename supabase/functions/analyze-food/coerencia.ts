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
