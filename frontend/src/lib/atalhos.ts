import type { FoodEntry } from '../types'

/**
 * O que a pessoa registra sempre, pronto pra entrar num toque.
 *
 * Registrar cafe todo dia custava o mesmo que registrar um prato novo: abrir o
 * teclado, escrever, esperar a IA. Mas cafe ja foi analisado ontem, e anteontem:
 * o numero esta no historico. Repetir e copia, nao analise, e por isso o atalho
 * entra direto no banco, sem passar pelo modelo e sem espera nenhuma.
 *
 * Os numeros vem da ocorrencia MAIS RECENTE, entao se voce corrigiu a caloria na
 * mao, e a sua correcao que repete, nao o chute original.
 */
export type Atalho = {
  chave: string
  nome: string
  kcal: number
  vezes: number
  modelo: Omit<FoodEntry, 'id' | 'logged_at'>
}

const normalizar = (s: string) =>
  s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Minimo de repeticoes pra virar atalho: uma vez e acaso, duas e habito. */
export const MINIMO_DE_VEZES = 2

export function atalhosDoHistorico(itens: readonly FoodEntry[], limite = 6): Atalho[] {
  const porNome = new Map<string, Atalho>()

  // A lista chega do mais novo pro mais antigo, entao o primeiro que aparece de
  // cada nome ja e o mais recente: e dele que saem os numeros.
  for (const i of itens) {
    const chave = normalizar(i.name)
    if (!chave) continue

    const ja = porNome.get(chave)
    if (ja) {
      ja.vezes++
      continue
    }

    porNome.set(chave, {
      chave,
      nome: i.name,
      kcal: i.kcal,
      vezes: 1,
      modelo: {
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
        kcal: i.kcal,
        protein_g: i.protein_g,
        carbs_g: i.carbs_g,
        fat_g: i.fat_g,
        confidence: i.confidence,
      },
    })
  }

  return [...porNome.values()]
    .filter((a) => a.vezes >= MINIMO_DE_VEZES)
    .sort((a, b) => b.vezes - a.vezes || a.nome.localeCompare(b.nome))
    .slice(0, limite)
}
