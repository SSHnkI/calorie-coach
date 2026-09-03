import { supabase } from './supabase'
import type { FoodEntry } from '../types'

const COLS = 'id, name, quantity, unit, kcal, protein_g, carbs_g, fat_g, confidence, logged_at'

// O painel filtra pelo proprio id em vez de confiar so na RLS: a conta de
// admin tem policy de leitura sobre o food_log inteiro (o painel /usuarios
// depende dela), e sem este filtro o dia dela somava o diario de todo mundo.
async function meuId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

function startOfTodayISO(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

// Limites locais de um dia. O diario e lido no fuso de quem registrou, nao em UTC:
// quem come as 21h em Sao Paulo lancaria no dia seguinte se a conta fosse em UTC.
export function limitesDoDia(dia: Date): { inicio: string; fim: string } {
  const inicio = new Date(dia)
  inicio.setHours(0, 0, 0, 0)
  const fim = new Date(inicio)
  fim.setDate(fim.getDate() + 1)
  return { inicio: inicio.toISOString(), fim: fim.toISOString() }
}

// Itens de um dia qualquer do usuario logado. Serve pra hoje e pro retroativo.
export async function fetchFoodByDay(dia: Date): Promise<FoodEntry[]> {
  const uid = await meuId()
  if (!uid) return []

  const { inicio, fim } = limitesDoDia(dia)
  const { data, error } = await supabase
    .from('food_log')
    .select(COLS)
    .eq('user_id', uid)
    .gte('logged_at', inicio)
    .lt('logged_at', fim)
    .order('logged_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as FoodEntry[]
}

// Itens de comida de hoje (do usuário logado).
export async function fetchTodayFood(): Promise<FoodEntry[]> {
  const uid = await meuId()
  if (!uid) return []

  const { data, error } = await supabase
    .from('food_log')
    .select(COLS)
    .eq('user_id', uid)
    .gte('logged_at', startOfTodayISO())
    .order('logged_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as FoodEntry[]
}

// Itens dos últimos `days` dias (para histórico e gráfico).
export async function fetchFoodHistory(days = 30): Promise<FoodEntry[]> {
  const uid = await meuId()
  if (!uid) return []

  const since = new Date()
  since.setHours(0, 0, 0, 0)
  since.setDate(since.getDate() - days)
  const { data, error } = await supabase
    .from('food_log')
    .select(COLS)
    .eq('user_id', uid)
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
