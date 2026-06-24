import { useEffect, useState } from 'react'
import {
  fetchLastPerformance,
  fetchPlanExercises,
  finishWorkout,
  type ExercisePerf,
  type LoggedSet,
} from '../../lib/workouts'
import type { WorkoutPlan } from '../../types'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { evaluateAchievements } from '../../lib/achievements'
import { muscleLabel } from './ExerciseCatalog'

type SetRow = { weight: string; reps: string; done: boolean }
type Block = {
  exercise_id: string
  name: string
  muscle_group: string
  rest: number
  target: number | null
  sets: SetRow[]
}

export function WorkoutSession({
  plan,
  onFinish,
  onCancel,
}: {
  plan: WorkoutPlan
  onFinish: () => void
  onCancel: () => void
}) {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [perf, setPerf] = useState<Record<string, ExercisePerf>>({})
  const [loading, setLoading] = useState(true)
  const [rest, setRest] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    fetchPlanExercises(plan.id)
      .then((data) => {
        if (!active) return
        fetchLastPerformance(data.map((e) => e.exercise_id))
          .then((p) => active && setPerf(p))
          .catch(() => {})
        setBlocks(
          data.map((e) => {
            const reps = /^\d+$/.test(e.reps) ? e.reps : ''
            const weight = e.target_weight_kg != null ? String(e.target_weight_kg) : ''
            return {
              exercise_id: e.exercise_id,
              name: e.exercise?.name ?? 'Exercício',
              muscle_group: e.exercise?.muscle_group ?? '',
              rest: e.rest_seconds,
              target: e.target_weight_kg,
              sets: Array.from({ length: Math.max(1, e.sets) }, () => ({
                weight,
                reps,
                done: false,
              })),
            }
          }),
        )
      })
      .catch(() => active && setError('Falha ao carregar o treino.'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [plan.id])

  useEffect(() => {
    if (rest <= 0) return
    const id = setTimeout(() => setRest((r) => r - 1), 1000)
    return () => clearTimeout(id)
  }, [rest])

  const patchSet = (bi: number, si: number, patch: Partial<SetRow>) =>
    setBlocks((prev) =>
      prev.map((b, i) =>
        i !== bi
          ? b
          : { ...b, sets: b.sets.map((s, j) => (j !== si ? s : { ...s, ...patch })) },
      ),
    )

  const toggleDone = (bi: number, si: number) => {
    const wasDone = blocks[bi].sets[si].done
    patchSet(bi, si, { done: !wasDone })
    if (!wasDone) setRest(blocks[bi].rest)
  }

  const doneCount = blocks.reduce((n, b) => n + b.sets.filter((s) => s.done).length, 0)

  const finish = async () => {
    const logged: LoggedSet[] = blocks.flatMap((b) =>
      b.sets
        .map((s, idx) => ({ s, idx }))
        .filter(({ s }) => s.done)
        .map(({ s, idx }) => ({
          exercise_id: b.exercise_id,
          set_number: idx + 1,
          weight_kg: s.weight === '' ? null : Number(s.weight),
          reps: s.reps === '' ? null : Number(s.reps),
        })),
    )
    if (logged.length === 0) return setError('Marque ao menos uma série como concluída.')
    setSaving(true)
    setError('')
    try {
      await finishWorkout(plan.id, logged, null)
      const unlocked = await evaluateAchievements().catch(() => [])
      alert(
        unlocked.length > 0
          ? `Treino concluído! 💪\nNova conquista: ${unlocked.map((u) => u.name).join(', ')}`
          : 'Treino concluído! 💪',
      )
      onFinish()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-obliq-border/50" />
        ))}
      </div>
    )
  }

  return (
    <div className="pb-24">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-bold uppercase tracking-wide text-white/50 hover:text-white"
        >
          ← Sair
        </button>
        <p className="text-sm font-black uppercase tracking-wide">{plan.name}</p>
      </div>

      <div className="space-y-3">
        {blocks.map((b, bi) => (
          <Card key={bi}>
            <div className="mb-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/30">
                {muscleLabel(b.muscle_group)}
              </p>
              <h3 className="font-bold">{b.name}</h3>
              {(() => {
                const p = perf[b.exercise_id]
                if (!p || p.lastSets.length === 0) return null
                const lastTop = Math.max(0, ...p.lastSets.map((s) => s.weight_kg ?? 0))
                if (lastTop <= 0) return null
                const suggestion = Math.round((lastTop + 2.5) * 2) / 2
                return (
                  <p className="mt-1 text-xs text-white/50">
                    Último: <span className="font-bold text-white/70">{lastTop}kg</span> · tente{' '}
                    <span className="font-bold text-obliq-red">{suggestion}kg</span>
                    {p.bestWeight ? ` · recorde ${p.bestWeight}kg` : ''}
                  </p>
                )
              })()}
            </div>

            <div className="space-y-2">
              {b.sets.map((s, si) => (
                <div key={si} className="flex items-center gap-2">
                  <span className="w-6 text-center text-xs font-black text-white/40">
                    {si + 1}
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="kg"
                    value={s.weight}
                    onChange={(e) => patchSet(bi, si, { weight: e.target.value })}
                    className="w-full rounded-lg border border-obliq-border bg-obliq-black px-3 py-2 text-center text-white outline-none focus:border-obliq-red"
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="reps"
                    value={s.reps}
                    onChange={(e) => patchSet(bi, si, { reps: e.target.value })}
                    className="w-full rounded-lg border border-obliq-border bg-obliq-black px-3 py-2 text-center text-white outline-none focus:border-obliq-red"
                  />
                  <button
                    type="button"
                    onClick={() => toggleDone(bi, si)}
                    className={`flex h-9 w-10 shrink-0 items-center justify-center rounded-lg border text-lg transition-all ${
                      s.done
                        ? 'border-obliq-red bg-obliq-red text-white shadow-red-glow'
                        : 'border-obliq-border text-white/40'
                    }`}
                  >
                    ✓
                  </button>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {error && (
        <p className="mt-3 text-center text-sm font-medium text-obliq-red">{error}</p>
      )}

      {/* barra fixa: timer de descanso + concluir */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-obliq-border bg-obliq-black/95 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-md items-center gap-3">
          {rest > 0 ? (
            <button
              type="button"
              onClick={() => setRest(0)}
              className="flex-1 rounded-xl border border-obliq-red bg-obliq-red/10 py-3 text-sm font-bold uppercase tracking-wide text-white"
            >
              Descanso: {rest}s · pular
            </button>
          ) : (
            <span className="flex-1 text-xs text-white/40">
              {doneCount} série{doneCount === 1 ? '' : 's'} concluída
              {doneCount === 1 ? '' : 's'}
            </span>
          )}
          <Button onClick={finish} disabled={saving} className="shrink-0 px-5 py-3">
            {saving ? '…' : 'Concluir'}
          </Button>
        </div>
      </div>
    </div>
  )
}
