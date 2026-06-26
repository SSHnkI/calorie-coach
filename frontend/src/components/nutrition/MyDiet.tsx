import { useCallback, useEffect, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { deleteMealPlan, fetchMealPlans, type MealPlanSummary } from '../../lib/nutrition'
import { createDietPreset } from '../../lib/dietPresets'
import type { Goal } from '../../types'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { DietBuilder } from './DietBuilder'
import { DietViewer } from './DietViewer'
import { toast } from '../../lib/toast'

const GOAL_LABEL: Record<string, string> = {
  lose: 'Emagrecer',
  maintain: 'Manter',
  gain: 'Ganhar massa',
}
const PRESETS: { goal: Goal; label: string }[] = [
  { goal: 'lose', label: '🔥 Emagrecer' },
  { goal: 'maintain', label: '⚖️ Manter' },
  { goal: 'gain', label: '💪 Ganhar massa' },
]

type Editing = MealPlanSummary | 'new' | null

export function MyDiet() {
  const { user } = useApp()
  const [plans, setPlans] = useState<MealPlanSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [editing, setEditing] = useState<Editing>(null)
  const [viewing, setViewing] = useState<MealPlanSummary | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(false)
    fetchMealPlans().then(setPlans).catch(() => setError(true)).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const applyPreset = async (goal: Goal) => {
    setBusy(true)
    try {
      await createDietPreset(goal, user?.daily_kcal ?? 2000)
      load()
      toast('Dieta criada! Edite como quiser. 🥗')
    } catch {
      toast('Falha ao criar a dieta.')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta dieta?')) return
    try {
      await deleteMealPlan(id)
      load()
    } catch {
      toast('Falha ao excluir.')
    }
  }

  if (editing) {
    return (
      <DietBuilder
        plan={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null)
          load()
        }}
      />
    )
  }

  if (viewing) {
    return (
      <DietViewer
        plan={viewing}
        onBack={() => setViewing(null)}
        onEdit={() => {
          setEditing(viewing)
          setViewing(null)
        }}
      />
    )
  }

  return (
    <div>
      <Button onClick={() => setEditing('new')} className="mb-4 w-full">
        + Nova dieta
      </Button>

      <div className="mb-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-white/40">Modelos prontos</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button key={p.goal} type="button" disabled={busy} onClick={() => applyPreset(p.goal)}
              className="rounded-full border border-obliq-border px-3 py-1.5 text-xs font-bold text-white/70 hover:border-obliq-red/50 disabled:opacity-50">
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-obliq-border/50" />
          ))}
        </div>
      )}

      {error && !loading && (
        <Card><p className="text-center text-sm text-obliq-red">Falha ao carregar.</p></Card>
      )}

      {!loading && !error && plans.length === 0 && (
        <Card className="text-center">
          <div className="text-4xl">🥗</div>
          <p className="mt-2 text-sm text-white/40">Nenhuma dieta ainda. Use um modelo ou crie a sua.</p>
        </Card>
      )}

      {!loading && !error && plans.length > 0 && (
        <div className="space-y-3">
          {plans.map((p) => (
            <Card key={p.id}>
              <div className="flex items-center justify-between gap-3">
                <button type="button" onClick={() => setViewing(p)} className="flex-1 text-left">
                  <h3 className="font-bold">{p.name}</h3>
                  <p className="text-xs text-white/40">
                    {p.kcalDay ? `~${p.kcalDay} kcal/dia` : ''}
                    {p.goal ? `${p.kcalDay ? ' · ' : ''}${GOAL_LABEL[p.goal] ?? p.goal}` : ''}
                  </p>
                </button>
                <button type="button" onClick={() => handleDelete(p.id)} className="text-xs font-bold uppercase text-white/40 hover:text-obliq-red">
                  Excluir
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
