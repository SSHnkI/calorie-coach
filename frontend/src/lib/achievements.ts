import { supabase } from './supabase'

export type AchievementView = {
  id: string
  code: string
  name: string
  description: string | null
  icon: string | null
  unlocked: boolean
  unlocked_at: string | null
}

export type Unlocked = { code: string; name: string }

function dayStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

// Sequência atual de dias consecutivos com treino (termina hoje ou ontem).
function currentStreak(dates: string[]): number {
  const days = new Set(dates.map((d) => dayStr(new Date(d))))
  const cursor = new Date()
  if (!days.has(dayStr(cursor))) {
    cursor.setDate(cursor.getDate() - 1)
    if (!days.has(dayStr(cursor))) return 0
  }
  let streak = 0
  while (days.has(dayStr(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

// Catálogo de conquistas + quais o usuário já desbloqueou.
export async function fetchAchievements(): Promise<AchievementView[]> {
  const { data: cat, error } = await supabase
    .from('achievements')
    .select('id, code, name, description, icon, created_at')
    .order('created_at', { ascending: true })
  if (error) throw error

  const { data: owned } = await supabase
    .from('user_achievements')
    .select('achievement_id, unlocked_at')

  const map = new Map(
    (owned ?? []).map((u) => {
      const r = u as { achievement_id: string; unlocked_at: string }
      return [r.achievement_id, r.unlocked_at]
    }),
  )

  return (cat ?? []).map((a) => {
    const r = a as Omit<AchievementView, 'unlocked' | 'unlocked_at'>
    return {
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
      icon: r.icon,
      unlocked: map.has(r.id),
      unlocked_at: map.get(r.id) ?? null,
    }
  })
}

// Avalia regras e desbloqueia conquistas novas. Retorna as recém-desbloqueadas.
export async function evaluateAchievements(): Promise<Unlocked[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return []
  const userId = session.user.id

  const { data: logs } = await supabase.from('workout_logs').select('completed_at')
  const dates = (logs ?? []).map((l) => (l as { completed_at: string }).completed_at)
  const total = dates.length
  const streak = currentStreak(dates)

  const satisfied = new Set<string>()
  if (total >= 1) satisfied.add('first_workout')
  if (total >= 100) satisfied.add('workouts_100')
  if (streak >= 7) satisfied.add('streak_7')
  if (streak >= 30) satisfied.add('streak_30')
  if (satisfied.size === 0) return []

  const { data: cat } = await supabase.from('achievements').select('id, code, name')
  const { data: owned } = await supabase
    .from('user_achievements')
    .select('achievement_id')
  const ownedIds = new Set(
    (owned ?? []).map((u) => (u as { achievement_id: string }).achievement_id),
  )

  const toInsert = (cat ?? [])
    .map((a) => a as { id: string; code: string; name: string })
    .filter((a) => satisfied.has(a.code) && !ownedIds.has(a.id))

  if (toInsert.length === 0) return []

  const { error } = await supabase
    .from('user_achievements')
    .insert(toInsert.map((a) => ({ user_id: userId, achievement_id: a.id })))
  if (error) return []

  return toInsert.map((a) => ({ code: a.code, name: a.name }))
}
