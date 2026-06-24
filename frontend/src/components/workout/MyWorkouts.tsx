import { useCallback, useEffect, useState } from 'react'
import { deletePlan, fetchPlans, type PlanSummary } from '../../lib/workouts'
import { PRESETS, createPreset, type Preset } from '../../lib/presets'
import type { WorkoutPlan } from '../../types'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { WorkoutBuilder } from './WorkoutBuilder'
import { WorkoutSession } from './WorkoutSession'

const GOAL_LABEL: Record<string, string> = {
  hipertrofia: 'Hipertrofia',
  emagrecimento: 'Emagrecimento',
  condicionamento: 'Condicionamento',
}

type Editing = WorkoutPlan | 'new' | null

export function MyWorkouts() {
  const [plans, setPlans] = useState<PlanSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [editing, setEditing] = useState<Editing>(null)
  const [running, setRunning] = useState<WorkoutPlan | null>(null)
  const [presetBusy, setPresetBusy] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(false)
    fetchPlans()
      .then(setPlans)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const applyPreset = async (p: Preset) => {
    if (!confirm(`Criar os treinos do modelo "${p.label}"?`)) return
    setPresetBusy(true)
    try {
      const n = await createPreset(p)
      load()
      alert(`${n} treino${n === 1 ? '' : 's'} criado${n === 1 ? '' : 's'}! 💪`)
    } catch {
      alert('Falha ao criar os treinos do modelo.')
    } finally {
      setPresetBusy(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este treino?')) return
    try {
      await deletePlan(id)
      load()
    } catch {
      alert('Falha ao excluir o treino.')
    }
  }

  if (running) {
    return (
      <WorkoutSession
        plan={running}
        onCancel={() => setRunning(null)}
        onFinish={() => setRunning(null)}
      />
    )
  }

  if (editing) {
    return (
      <WorkoutBuilder
        plan={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null)
          load()
        }}
      />
    )
  }

  return (
    <div>
      <Button onClick={() => setEditing('new')} className="mb-4 w-full">
        + Novo treino
      </Button>

      <div className="mb-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-white/40">
          Modelos rápidos
        </p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={presetBusy}
              onClick={() => applyPreset(p)}
              className="rounded-full border border-obliq-border px-3 py-1.5 text-xs font-bold text-white/70 transition-all hover:border-obliq-red/50 disabled:opacity-50"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-obliq-border/50" />
          ))}
        </div>
      )}

      {error && !loading && (
        <Card>
          <p className="text-center text-sm text-obliq-red">
            Falha ao carregar seus treinos. Tente novamente.
          </p>
        </Card>
      )}

      {!loading && !error && plans.length === 0 && (
        <Card>
          <p className="text-center text-sm text-white/40">
            Você ainda não criou nenhum treino. Toque em “Novo treino”.
          </p>
        </Card>
      )}

      {!loading && !error && plans.length > 0 && (
        <div className="space-y-3">
          {plans.map((plan) => (
            <Card key={plan.id}>
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setEditing(plan)}
                  className="flex-1 text-left"
                >
                  <h3 className="font-bold">{plan.name}</h3>
                  <p className="text-xs text-white/40">
                    {plan.exercise_count}{' '}
                    {plan.exercise_count === 1 ? 'exercício' : 'exercícios'}
                    {plan.goal ? ` · ${GOAL_LABEL[plan.goal] ?? plan.goal}` : ''}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(plan.id)}
                  className="text-xs font-bold uppercase text-white/40 hover:text-obliq-red"
                >
                  Excluir
                </button>
              </div>
              <Button
                onClick={() => setRunning(plan)}
                disabled={plan.exercise_count === 0}
                className="mt-3 w-full py-2 text-xs"
              >
                ▶ Iniciar treino
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
