import { supabase } from './supabase'

// Quem pode ler a lista e decidido pelo RLS (policy admin_select_profiles),
// nao por esta constante. Ela so controla o que a interface mostra.
export const ADMIN_EMAIL = 'victorguilhermevg3@gmail.com'

export type AppUser = {
  id: string
  email: string
  created_at: string
  onboarding_complete: boolean
  daily_kcal: number | null
  age: number | null
  weight_kg: number | null
  height_cm: number | null
  sex: string | null
  activity: string | null
  goal: string | null
  analyses_today: number | null
  analyses_date: string | null
}

export async function fetchUsers(): Promise<AppUser[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, email, created_at, onboarding_complete, daily_kcal, age, weight_kg, height_cm, sex, activity, goal, analyses_today, analyses_date',
    )
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as AppUser[]
}
