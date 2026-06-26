import { useEffect, useMemo, useState } from 'react'
import { fetchExercises } from '../../lib/exercises'
import type { CatalogExercise, Difficulty, MuscleGroup } from '../../types'
import { Card } from '../ui/Card'

export const MUSCLE_GROUPS: { key: MuscleGroup; label: string }[] = [
  { key: 'peito', label: 'Peito' },
  { key: 'costas', label: 'Costas' },
  { key: 'ombro', label: 'Ombro' },
  { key: 'biceps', label: 'Bíceps' },
  { key: 'triceps', label: 'Tríceps' },
  { key: 'pernas', label: 'Pernas' },
  { key: 'abdomen', label: 'Abdômen' },
]

export function muscleLabel(group: string): string {
  return MUSCLE_GROUPS.find((g) => g.key === group)?.label ?? group
}

const DIFFICULTY: Record<Difficulty, { label: string; color: string }> = {
  iniciante: { label: 'Iniciante', color: 'text-emerald-400' },
  intermediario: { label: 'Intermediário', color: 'text-amber-400' },
  avancado: { label: 'Avançado', color: 'text-obliq-red' },
}

export function ExerciseCatalog() {
  const [exercises, setExercises] = useState<CatalogExercise[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [filter, setFilter] = useState<MuscleGroup | 'all'>('all')
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetchExercises()
      .then((data) => active && setExercises(data))
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  const filtered = useMemo(
    () =>
      filter === 'all'
        ? exercises
        : exercises.filter((e) => e.muscle_group === filter),
    [exercises, filter],
  )

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {[{ key: 'all' as const, label: 'Todos' }, ...MUSCLE_GROUPS].map((g) => (
          <button
            key={g.key}
            type="button"
            onClick={() => setFilter(g.key)}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-all ${
              filter === g.key
                ? 'border-obliq-red bg-obliq-red/10 text-white shadow-red-glow'
                : 'border-obliq-border text-white/50 hover:border-white/20'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-obliq-border/50" />
          ))}
        </div>
      )}

      {error && !loading && (
        <Card>
          <p className="text-center text-sm text-obliq-red">
            Não foi possível carregar os exercícios. Tente novamente.
          </p>
        </Card>
      )}

      {!loading && !error && filtered.length === 0 && (
        <Card>
          <p className="text-center text-sm text-white/40">
            Nenhum exercício neste grupo ainda.
          </p>
        </Card>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((exercise) => {
            const open = openId === exercise.id
            const diff = exercise.difficulty ? DIFFICULTY[exercise.difficulty] : null
            return (
              <Card key={exercise.id} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : exercise.id)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <div>
                    <h3 className="font-bold">{exercise.name}</h3>
                    <p className="text-xs text-white/40">
                      {muscleLabel(exercise.muscle_group)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {diff && (
                      <span className={`text-[10px] font-black uppercase tracking-widest ${diff.color}`}>
                        {diff.label}
                      </span>
                    )}
                    <span className={`text-white/50 transition-transform ${open ? 'rotate-180' : ''}`}>
                      ▾
                    </span>
                  </div>
                </button>

                {open && (
                  <div className="mt-3 border-t border-obliq-border pt-3">
                    {exercise.description && (
                      <p className="text-sm text-white/70">{exercise.description}</p>
                    )}
                    {exercise.muscles_worked && (
                      <p className="mt-2 text-xs text-white/40">
                        <span className="font-bold uppercase tracking-widest text-white/50">
                          Músculos:{' '}
                        </span>
                        {exercise.muscles_worked}
                      </p>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
