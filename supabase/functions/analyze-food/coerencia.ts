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
}

/** Atwater: 4 kcal por grama de proteina e carboidrato, 9 por grama de gordura. */
export function kcalDosMacros(m: Macros): number {
  return 4 * n(m.protein_g) + 4 * n(m.carbs_g) + 9 * n(m.fat_g)
}

// Gordura pura, o alimento mais denso que existe, da 9 kcal por grama. Nada
// comestivel passa disso, entao qualquer densidade acima e erro, nao alimento.
export const MAX_KCAL_POR_GRAMA = 9

// Abaixo disso a diferenca entre o kcal declarado e o que os macros somam cabe
// em arredondamento e em fibra, que nao entra na conta de Atwater.
export const TOLERANCIA = 0.25

export type Ajuste = 'nenhum' | 'macros' | 'densidade'

export type Resultado = { kcal: number; ajuste: Ajuste; confiavel: boolean }

/**
 * Concilia o kcal declarado com os macros e com o peso da porcao.
 *
 * Duas travas, nesta ordem:
 * 1. os macros mandam. Se 4P + 4C + 9G discorda do kcal declarado alem da
 *    tolerancia, o modelo se contradisse e a soma dos macros e a versao mais
 *    defensavel: ela sustenta as tres barras de macro da tela.
 * 2. densidade. Depois de conciliar, kcal por grama nao pode passar do limite
 *    fisico. Passou, corta no limite.
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
      kcal = porMacros
      ajuste = 'macros'
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
