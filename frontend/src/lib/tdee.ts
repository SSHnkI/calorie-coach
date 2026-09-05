import type { ActivityLevel, Goal, OnboardingData, Sex } from '../types'

const activityMultipliers: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

const goalAdjustments: Record<Goal, number> = {
  lose: -500,
  maintain: 0,
  gain: 300,
}

export function calculateBmr(
  weight_kg: number,
  height_cm: number,
  age: number,
  sex: Sex,
): number {
  return sex === 'male'
    ? 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    : 10 * weight_kg + 6.25 * height_cm - 5 * age - 161
}

export function calculateDailyKcal(data: OnboardingData): number {
  const bmr = calculateBmr(data.weight_kg, data.height_cm, data.age, data.sex)
  const tdee = bmr * activityMultipliers[data.activity]
  return Math.round(tdee + goalAdjustments[data.goal])
}

export function calculateMacroTargets(daily_kcal: number) {
  return {
    protein_g: Math.round((daily_kcal * 0.3) / 4),
    carbs_g: Math.round((daily_kcal * 0.4) / 4),
    fat_g: Math.round((daily_kcal * 0.3) / 9),
  }
}

/**
 * Meta de kcal de cada refeicao: a meta do dia repartida pela fatia declarada
 * em `lib/periodos.ts`.
 *
 * A versao anterior repartia pelo GASTO que acontecia dentro de cada janela,
 * com BMR por hora mais a atividade nas horas acordado. Era defensavel no papel
 * e errado na tela: com o almoco durando duas horas, ele saia com 220 kcal de
 * meta, e a noite, de onze horas, levava quase metade do dia. Ninguem come na
 * proporcao do que gasta naquela hora; o corpo repoe depois, nao durante.
 *
 * O perfil ja entrou uma vez, no calculo do daily_kcal (TDEE mais o deficit ou
 * o superavit do objetivo). Reparti-lo de novo por metabolismo era usar a mesma
 * informacao duas vezes.
 *
 * O arredondamento de 5 em 5 sobra ou falta alguns kcal; a diferenca vai pra
 * maior refeicao, entao as quatro sempre somam exatamente a meta do dia.
 */
export function metasPorRefeicao<T extends { id: string; fatia: number }>(
  janelas: readonly T[],
  daily_kcal: number,
): Record<T['id'], number> {
  const soma = janelas.reduce((s, j) => s + j.fatia, 0) || 1
  const metas = {} as Record<T['id'], number>

  let distribuido = 0
  for (const j of janelas) {
    // Meta de refeicao com precisao de 1 kcal e falsa.
    const meta = Math.round((daily_kcal * j.fatia) / soma / 5) * 5
    metas[j.id as T['id']] = meta
    distribuido += meta
  }

  const maior = janelas.reduce((a, b) => (b.fatia > a.fatia ? b : a))
  metas[maior.id as T['id']] += daily_kcal - distribuido

  return metas
}
