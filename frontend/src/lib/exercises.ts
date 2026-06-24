import { supabase } from './supabase'
import type { CatalogExercise } from '../types'

// Busca o catálogo de exercícios no Supabase (tabela `exercises`).
export async function fetchExercises(): Promise<CatalogExercise[]> {
  const { data, error } = await supabase
    .from('exercises')
    .select('id, name, muscle_group, difficulty, description, muscles_worked, image_url, video_url')
    .order('muscle_group', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    console.error('Erro ao buscar exercícios:', error.message)
    throw error
  }

  return (data ?? []) as CatalogExercise[]
}
