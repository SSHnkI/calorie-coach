import { supabase } from './supabase'
import type { WorkoutGoal, WorkoutPlan } from '../types'

// Plano com a contagem de exercícios (para a lista "Meus Treinos")
export type PlanSummary = WorkoutPlan & { exercise_count: number }

// Linha de exercício do plano, já com o nome do exercício do catálogo
export type PlanExerciseRow = {
  id: string
  exercise_id: string
  sets: number
  reps: string
  rest_seconds: number
  target_weight_kg: number | null
  notes: string | null
  order_index: number
  exercise: { name: string; muscle_group: string } | null
}

export type SavePlanInput = {
  id?: string
  name: string
  goal: WorkoutGoal | null
  exercises: {
    exercise_id: string
    sets: number
    reps: string
    rest_seconds: number
    target_weight_kg: number | null
    notes: string | null
  }[]
}

export async function fetchPlans(): Promise<PlanSummary[]> {
  const { data, error } = await supabase
    .from('workout_plans')
    .select('id, user_id, name, goal, created_at, workout_exercises(count)')
    .order('created_at', { ascending: true })

  if (error) throw error

  return (data ?? []).map((p) => {
    const { workout_exercises, ...plan } = p as PlanSummary & {
      workout_exercises: { count: number }[]
    }
    return { ...plan, exercise_count: workout_exercises?.[0]?.count ?? 0 }
  })
}

export async function fetchPlanExercises(planId: string): Promise<PlanExerciseRow[]> {
  const { data, error } = await supabase
    .from('workout_exercises')
    .select(
      'id, exercise_id, sets, reps, rest_seconds, target_weight_kg, notes, order_index, exercise:exercises(name, muscle_group)',
    )
    .eq('plan_id', planId)
    .order('order_index', { ascending: true })

  if (error) throw error
  return (data ?? []) as unknown as PlanExerciseRow[]
}

// Cria ou edita um plano. Na edição, substitui todos os exercícios.
export async function savePlan(input: SavePlanInput): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('Sessão expirada. Faça login novamente.')

  let planId = input.id

  if (planId) {
    const { error } = await supabase
      .from('workout_plans')
      .update({ name: input.name, goal: input.goal })
      .eq('id', planId)
    if (error) throw error

    const { error: delErr } = await supabase
      .from('workout_exercises')
      .delete()
      .eq('plan_id', planId)
    if (delErr) throw delErr
  } else {
    const { data, error } = await supabase
      .from('workout_plans')
      .insert({ user_id: session.user.id, name: input.name, goal: input.goal })
      .select('id')
      .single()
    if (error) throw error
    planId = data.id
  }

  if (input.exercises.length > 0) {
    const rows = input.exercises.map((e, i) => ({
      plan_id: planId,
      exercise_id: e.exercise_id,
      sets: e.sets,
      reps: e.reps,
      rest_seconds: e.rest_seconds,
      target_weight_kg: e.target_weight_kg,
      notes: e.notes,
      order_index: i,
    }))
    const { error } = await supabase.from('workout_exercises').insert(rows)
    if (error) throw error
  }

  return planId as string
}

export async function deletePlan(planId: string): Promise<void> {
  const { error } = await supabase.from('workout_plans').delete().eq('id', planId)
  if (error) throw error
}

export type ExercisePerf = {
  lastDate: string
  lastSets: { weight_kg: number | null; reps: number | null }[]
  bestWeight: number | null
}

// Última sessão + recorde de carga por exercício (para progressão).
export async function fetchLastPerformance(
  exerciseIds: string[],
): Promise<Record<string, ExercisePerf>> {
  if (exerciseIds.length === 0) return {}

  const { data, error } = await supabase
    .from('exercise_sets')
    .select('exercise_id, workout_log_id, weight_kg, reps, created_at')
    .in('exercise_id', exerciseIds)
    .order('created_at', { ascending: false })
  if (error) throw error

  const result: Record<string, ExercisePerf> = {}
  const lastLog: Record<string, string> = {}

  for (const row of (data ?? []) as {
    exercise_id: string
    workout_log_id: string
    weight_kg: number | null
    reps: number | null
    created_at: string
  }[]) {
    const ex = row.exercise_id
    if (!result[ex]) {
      result[ex] = { lastDate: row.created_at, lastSets: [], bestWeight: null }
      lastLog[ex] = row.workout_log_id
    }
    if (
      row.weight_kg != null &&
      (result[ex].bestWeight == null || row.weight_kg > (result[ex].bestWeight as number))
    ) {
      result[ex].bestWeight = row.weight_kg
    }
    if (row.workout_log_id === lastLog[ex]) {
      result[ex].lastSets.push({ weight_kg: row.weight_kg, reps: row.reps })
    }
  }
  return result
}

export type SessionSummary = {
  id: string
  date: string
  planName: string | null
  volume: number
  sets: number
}

// Histórico de treinos realizados, com volume (carga × reps) por sessão.
export async function fetchHistory(): Promise<SessionSummary[]> {
  const { data: logs, error } = await supabase
    .from('workout_logs')
    .select('id, completed_at, plan:workout_plans(name)')
    .order('completed_at', { ascending: false })
  if (error) throw error

  const ids = (logs ?? []).map((l) => (l as { id: string }).id)
  const agg: Record<string, { volume: number; sets: number }> = {}

  if (ids.length > 0) {
    const { data: sets, error: e2 } = await supabase
      .from('exercise_sets')
      .select('workout_log_id, weight_kg, reps')
      .in('workout_log_id', ids)
    if (e2) throw e2
    for (const s of (sets ?? []) as {
      workout_log_id: string
      weight_kg: number | null
      reps: number | null
    }[]) {
      const a = (agg[s.workout_log_id] ??= { volume: 0, sets: 0 })
      a.sets += 1
      a.volume += (s.weight_kg ?? 0) * (s.reps ?? 0)
    }
  }

  return (logs ?? []).map((l) => {
    const row = l as unknown as {
      id: string
      completed_at: string
      plan: { name: string } | null
    }
    return {
      id: row.id,
      date: row.completed_at,
      planName: row.plan?.name ?? null,
      volume: Math.round(agg[row.id]?.volume ?? 0),
      sets: agg[row.id]?.sets ?? 0,
    }
  })
}

export type LoggedSet = {
  exercise_id: string
  set_number: number
  weight_kg: number | null
  reps: number | null
}

// Registra uma sessão concluída: cria workout_logs + as exercise_sets feitas.
export async function finishWorkout(
  planId: string,
  sets: LoggedSet[],
  notes: string | null,
): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('Sessão expirada.')
  const userId = session.user.id

  const { data, error } = await supabase
    .from('workout_logs')
    .insert({ user_id: userId, plan_id: planId, notes })
    .select('id')
    .single()
  if (error) throw error

  if (sets.length > 0) {
    const rows = sets.map((s) => ({
      workout_log_id: data.id,
      user_id: userId,
      exercise_id: s.exercise_id,
      set_number: s.set_number,
      weight_kg: s.weight_kg,
      reps: s.reps,
      completed: true,
    }))
    const { error: setErr } = await supabase.from('exercise_sets').insert(rows)
    if (setErr) throw setErr
  }
}
