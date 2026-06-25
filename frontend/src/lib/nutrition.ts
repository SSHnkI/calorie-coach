import { supabase } from './supabase'
import type { Goal, MealType } from '../types'

export type MealPlanSummary = {
  id: string
  name: string
  goal: Goal | null
  created_at: string
}

export type DietItemInput = {
  food_name: string
  quantity: number | null
  unit: string | null
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
}
export type DietMealInput = { meal_type: MealType; items: DietItemInput[] }
export type DietDayInput = { day_of_week: number; meals: DietMealInput[] }
export type SaveDietInput = {
  id?: string
  name: string
  goal: Goal | null
  days: DietDayInput[]
}

// Plano completo (para builder/visualização)
export type FullDiet = {
  id: string
  name: string
  goal: Goal | null
  days: DietDayInput[]
}

export async function fetchMealPlans(): Promise<MealPlanSummary[]> {
  const { data, error } = await supabase
    .from('meal_plans')
    .select('id, name, goal, created_at')
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as MealPlanSummary[]
}

export async function fetchMealPlansForUser(userId: string): Promise<MealPlanSummary[]> {
  const { data, error } = await supabase
    .from('meal_plans')
    .select('id, name, goal, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as MealPlanSummary[]
}

export async function fetchMealPlanFull(id: string): Promise<FullDiet> {
  const { data, error } = await supabase
    .from('meal_plans')
    .select(
      'id, name, goal, meals(id, day_of_week, meal_type, order_index, meal_items(food_name, quantity, unit, kcal, protein_g, carbs_g, fat_g))',
    )
    .eq('id', id)
    .single()
  if (error) throw error

  const row = data as unknown as {
    id: string
    name: string
    goal: Goal | null
    meals: {
      day_of_week: number
      meal_type: MealType
      order_index: number
      meal_items: DietItemInput[]
    }[]
  }

  const byDay = new Map<number, DietMealInput[]>()
  for (const m of (row.meals ?? []).sort((a, b) => a.order_index - b.order_index)) {
    const arr = byDay.get(m.day_of_week) ?? []
    arr.push({ meal_type: m.meal_type, items: m.meal_items ?? [] })
    byDay.set(m.day_of_week, arr)
  }

  const days: DietDayInput[] = Array.from({ length: 7 }, (_, d) => ({
    day_of_week: d,
    meals: byDay.get(d) ?? [],
  }))

  return { id: row.id, name: row.name, goal: row.goal, days }
}

export async function saveMealPlan(input: SaveDietInput, targetUserId?: string): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('Sessão expirada.')
  const userId = targetUserId ?? session.user.id

  let planId = input.id
  if (planId) {
    const { error } = await supabase
      .from('meal_plans')
      .update({ name: input.name, goal: input.goal })
      .eq('id', planId)
    if (error) throw error
    const { error: delErr } = await supabase.from('meals').delete().eq('meal_plan_id', planId)
    if (delErr) throw delErr
  } else {
    const { data, error } = await supabase
      .from('meal_plans')
      .insert({ user_id: userId, name: input.name, goal: input.goal })
      .select('id')
      .single()
    if (error) throw error
    planId = data.id
  }

  for (const day of input.days) {
    let order = 0
    for (const meal of day.meals) {
      const { data: m, error } = await supabase
        .from('meals')
        .insert({
          meal_plan_id: planId,
          day_of_week: day.day_of_week,
          meal_type: meal.meal_type,
          order_index: order++,
        })
        .select('id')
        .single()
      if (error) throw error
      if (meal.items.length > 0) {
        const rows = meal.items.map((it) => ({ ...it, meal_id: m.id }))
        const { error: e2 } = await supabase.from('meal_items').insert(rows)
        if (e2) throw e2
      }
    }
  }
  return planId as string
}

export async function deleteMealPlan(id: string): Promise<void> {
  const { error } = await supabase.from('meal_plans').delete().eq('id', id)
  if (error) throw error
}
