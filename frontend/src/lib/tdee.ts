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

// Janela de vigilia: fora dela o corpo so gasta o de repouso.
// ponytail: 4h as 22h e a media; se o app um dia perguntar o horario de sono,
// e daqui que os dois numeros saem.
const ACORDADO_DE = 4
const ACORDADO_ATE = 22

function horasEm(de: number, ate: number, janelaDe: number, janelaAte: number) {
  return Math.max(0, Math.min(ate, janelaAte) - Math.max(de, janelaDe))
}

// Meta de cada janela do dia, tirada do proprio gasto do usuario, nao de
// porcentagem fixa: peso, altura, idade e sexo dao o gasto em repouso (BMR),
// que corre nas 24h; o que a atividade acrescenta em cima dele cai apenas nas
// horas acordado. Cada janela recebe a fatia do gasto que acontece nela, e a
// soma e reescalada pra fechar exatamente na meta diaria (que ja carrega o
// deficit ou o superavit do objetivo).
export function metasPorRefeicao<T extends { id: string; de: number; ate: number }>(
  janelas: readonly T[],
  daily_kcal: number,
  perfil?: Pick<OnboardingData, 'age' | 'weight_kg' | 'height_cm' | 'sex' | 'activity'> | null,
): Record<T['id'], number> {
  const bmr = perfil
    ? calculateBmr(perfil.weight_kg, perfil.height_cm, perfil.age, perfil.sex)
    : 0
  const tdee = perfil ? bmr * activityMultipliers[perfil.activity] : 0
  const extraAtividade = Math.max(0, tdee - bmr)

  const acordadoTotal = janelas.reduce(
    (s, j) => s + horasEm(j.de, j.ate, ACORDADO_DE, ACORDADO_ATE),
    0,
  )

  // Sem perfil ainda, o peso e so a duracao da janela: gasto de repouso parelho.
  const pesos = janelas.map((j) => {
    const horas = j.ate - j.de
    if (!perfil) return horas
    const acordado = horasEm(j.de, j.ate, ACORDADO_DE, ACORDADO_ATE)
    return (bmr / 24) * horas + extraAtividade * (acordado / (acordadoTotal || 1))
  })

  const soma = pesos.reduce((a, b) => a + b, 0) || 1
  const metas = {} as Record<T['id'], number>
  janelas.forEach((j, i) => {
    // Arredonda de 5 em 5: meta de refeicao com precisao de 1 kcal e falsa.
    metas[j.id as T['id']] = Math.round((daily_kcal * pesos[i]) / soma / 5) * 5
  })
  return metas
}
