import { supabase } from './supabase'
import type { FoodEntry } from '../types'

const COLS = 'id, name, quantity, unit, kcal, protein_g, carbs_g, fat_g, confidence, logged_at'

function startOfTodayISO(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

// Itens de comida de hoje (do usuário logado).
export async function fetchTodayFood(): Promise<FoodEntry[]> {
  const { data, error } = await supabase
    .from('food_log')
    .select(COLS)
    .gte('logged_at', startOfTodayISO())
    .order('logged_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as FoodEntry[]
}

// Itens dos últimos `days` dias (para histórico e gráfico).
export async function fetchFoodHistory(days = 30): Promise<FoodEntry[]> {
  const since = new Date()
  since.setHours(0, 0, 0, 0)
  since.setDate(since.getDate() - days)
  const { data, error } = await supabase
    .from('food_log')
    .select(COLS)
    .gte('logged_at', since.toISOString())
    .order('logged_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as FoodEntry[]
}

export async function deleteFood(id: string): Promise<void> {
  const { error } = await supabase.from('food_log').delete().eq('id', id)
  if (error) throw error
}

export async function updateFoodKcal(id: string, kcal: number): Promise<void> {
  const { error } = await supabase.from('food_log').update({ kcal }).eq('id', id)
  if (error) throw error
}
