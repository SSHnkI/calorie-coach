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
