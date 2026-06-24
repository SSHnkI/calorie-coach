import { supabase } from './supabase'
import { fetchExercises } from './exercises'
import { savePlan } from './workouts'
import type { CatalogExercise, MuscleGroup } from '../types'

type PresetPlan = { name: string; groups: MuscleGroup[] }
export type Preset = {
  id: string
  label: string
  perGroup: number
  plans: PresetPlan[]
}

export const PRESETS: Preset[] = [
  {
    id: 'abc',
    label: '🏋️ ABC',
    perGroup: 3,
    plans: [
      { name: 'A — Peito e Tríceps', groups: ['peito', 'triceps'] },
      { name: 'B — Costas e Bíceps', groups: ['costas', 'biceps'] },
      { name: 'C — Pernas e Ombro', groups: ['pernas', 'ombro', 'abdomen'] },
    ],
  },
  {
    id: 'abcd',
    label: '🏋️ ABCD',
    perGroup: 3,
    plans: [
      { name: 'A — Peito', groups: ['peito', 'triceps'] },
      { name: 'B — Costas', groups: ['costas', 'biceps'] },
      { name: 'C — Pernas', groups: ['pernas', 'abdomen'] },
      { name: 'D — Ombro e Braço', groups: ['ombro', 'biceps', 'triceps'] },
    ],
  },
  {
    id: 'abcde',
    label: '🏋️ ABCDE',
    perGroup: 4,
    plans: [
      { name: 'A — Peito', groups: ['peito'] },
      { name: 'B — Costas', groups: ['costas'] },
      { name: 'C — Pernas', groups: ['pernas'] },
      { name: 'D — Ombro', groups: ['ombro'] },
      { name: 'E — Braço e Abdômen', groups: ['biceps', 'triceps', 'abdomen'] },
    ],
  },
  {
    id: 'fullbody',
    label: '🏋️ Full Body',
    perGroup: 1,
    plans: [
      {
        name: 'Full Body',
        groups: ['peito', 'costas', 'pernas', 'ombro', 'biceps', 'triceps', 'abdomen'],
      },
    ],
  },
  {
    id: 'upperlower',
    label: '🏋️ Upper/Lower',
    perGroup: 2,
    plans: [
      { name: 'Upper — Superiores', groups: ['peito', 'costas', 'ombro', 'biceps', 'triceps'] },
      { name: 'Lower — Inferiores', groups: ['pernas', 'abdomen'] },
    ],
  },
  {
    id: 'ppl',
    label: '🏋️ Push Pull Legs',
    perGroup: 3,
    plans: [
      { name: 'Push — Empurrar', groups: ['peito', 'ombro', 'triceps'] },
      { name: 'Pull — Puxar', groups: ['costas', 'biceps'] },
      { name: 'Legs — Pernas', groups: ['pernas', 'abdomen'] },
    ],
  },
]

// Cria os treinos de um modelo, escolhendo exercícios do catálogo por grupo.
export async function createPreset(preset: Preset): Promise<number> {
  const catalog = await fetchExercises()
  const byGroup = new Map<string, CatalogExercise[]>()
  for (const e of catalog) {
    const arr = byGroup.get(e.muscle_group) ?? []
    arr.push(e)
    byGroup.set(e.muscle_group, arr)
  }

  let created = 0
  for (const plan of preset.plans) {
    const exercises = plan.groups.flatMap((g) =>
      (byGroup.get(g) ?? []).slice(0, preset.perGroup).map((ex) => ({
        exercise_id: ex.id,
        sets: 3,
        reps: '10',
        rest_seconds: 60,
        target_weight_kg: null,
        notes: null,
      })),
    )
    if (exercises.length === 0) continue
    await savePlan({ name: plan.name, goal: null, exercises })
    created++
  }
  return created
}

// Igual ao createPreset, mas cria os treinos para outro usuário (admin → cliente).
export async function createPresetForUser(preset: Preset, userId: string): Promise<number> {
  const catalog = await fetchExercises()
  const byGroup = new Map<string, CatalogExercise[]>()
  for (const e of catalog) {
    const arr = byGroup.get(e.muscle_group) ?? []
    arr.push(e)
    byGroup.set(e.muscle_group, arr)
  }

  let created = 0
  for (const plan of preset.plans) {
    const exs = plan.groups.flatMap((g) => (byGroup.get(g) ?? []).slice(0, preset.perGroup))
    if (exs.length === 0) continue

    const { data: np, error } = await supabase
      .from('workout_plans')
      .insert({ user_id: userId, name: plan.name, goal: null })
      .select('id')
      .single()
    if (error) throw error

    const rows = exs.map((ex, i) => ({
      plan_id: np.id,
      exercise_id: ex.id,
      sets: 3,
      reps: '10',
      rest_seconds: 60,
      target_weight_kg: null,
      notes: null,
      order_index: i,
    }))
    const { error: e2 } = await supabase.from('workout_exercises').insert(rows)
    if (e2) throw e2
    created++
  }
  return created
}
