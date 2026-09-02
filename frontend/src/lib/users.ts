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

// Teto diario de chamadas a IA por conta, espelha AI_CAP da edge function analyze-food.
export const AI_CAP = 100

// Calorias registradas hoje por usuario.
// Depende da policy de leitura de food_log pelo admin; sem ela volta so o proprio diario.
export async function fetchTodayIntake(): Promise<Record<string, number>> {
  const inicio = new Date()
  inicio.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('food_log')
    .select('user_id, kcal')
    .gte('logged_at', inicio.toISOString())

  if (error) throw error

  const soma: Record<string, number> = {}
  for (const linha of data ?? []) {
    const r = linha as { user_id: string; kcal: number }
    soma[r.user_id] = (soma[r.user_id] ?? 0) + (r.kcal ?? 0)
  }
  return soma
}

// Dispara o e-mail de troca de senha. Nao definimos senha por aqui: o usuario escolhe a dele.
export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  if (error) throw error
}

// Gera o link de troca de senha sem passar por e-mail.
// A funcao roda com chave de servico e so responde ao admin master.
export async function generatePasswordLink(email: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('admin-reset-link', {
    body: { email, redirect_to: `${window.location.origin}/reset-password` },
  })
  if (error || !data?.link) throw new Error('nao_gerou')
  return data.link as string
}

// Define a senha de um usuario direto, sem e-mail.
// A validacao de quem pode fazer isso mora na edge function, nao aqui.
export async function setUserPassword(userId: string, password: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('admin-set-password', {
    body: { user_id: userId, password },
  })
  if (error) {
    const corpo = await (error as { context?: Response }).context?.json?.().catch(() => null)
    throw new Error(corpo?.error ?? 'falhou')
  }
  if (!data?.ok) throw new Error('falhou')
}

// Quantos registros o usuario tem no total. Serve pra confirmar antes de apagar.
export async function countUserEntries(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('food_log')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  if (error) throw error
  return count ?? 0
}

// Apaga o diario inteiro de um usuario. Irreversivel, sem lixeira.
// Depende da policy admin_delete_food_log; sem ela o banco recusa em silencio.
export async function deleteUserHistory(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('food_log')
    .delete()
    .eq('user_id', userId)
    .select('id')
  if (error) throw error
  return data?.length ?? 0
}
