import { useEffect, useMemo, useState } from 'react'
import { fetchMealPlanFull, type DietDayInput, type MealPlanSummary } from '../../lib/nutrition'
import type { MealType } from '../../types'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const MEAL_LABEL: Record<MealType, string> = {
  cafe: 'Café da manhã',
  almoco: 'Almoço',
  lanche: 'Lanche',
  jantar: 'Jantar',
  ceia: 'Ceia',
}

export function DietViewer({
  plan,
  onBack,
  onEdit,
}: {
  plan: MealPlanSummary
  onBack: () => void
  onEdit: () => void
}) {
  const [days, setDays] = useState<DietDayInput[]>([])
  const [loading, setLoading] = useState(true)
  const [day, setDay] = useState(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1)

  useEffect(() => {
    let active = true
    fetchMealPlanFull(plan.id)
      .then((d) => active && setDays(d.days))
      .catch(() => {})
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [plan.id])

  const meals = days[day]?.meals ?? []
  const total = useMemo(() => {
    let k = 0
    for (const m of meals) for (const it of m.items) k += it.kcal || 0
    return Math.round(k)
  }, [meals])

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-sm font-bold uppercase text-white/50 hover:text-white">
          ← Voltar
        </button>
        <Button variant="secondary" onClick={onEdit} className="px-4 py-2 text-xs">
          Editar
        </Button>
      </div>

      <h1 className="mb-1 text-2xl font-black uppercase tracking-wide">{plan.name}</h1>

      <div className="mb-4 mt-3 flex flex-wrap gap-2">
        {DAYS.map((d, i) => (
          <button key={d} type="button" onClick={() => setDay(i)}
            className={`rounded-full border px-3 py-1 text-xs font-bold transition-all ${
              day === i ? 'border-obliq-red bg-obliq-red/10 text-white' : 'border-obliq-border text-white/50'
            }`}>
            {d}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-obliq-border/50" />
          ))}
        </div>
      ) : meals.length === 0 ? (
        <Card><p className="text-center text-sm text-white/40">Sem refeições neste dia.</p></Card>
      ) : (
        <>
          <p className="mb-3 text-sm font-bold text-obliq-red">{total} kcal no dia</p>
          <div className="space-y-3">
            {meals.map((m, mi) => {
              const k = m.items.reduce((s, it) => s + (it.kcal || 0), 0)
              return (
                <Card key={mi}>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-bold">{MEAL_LABEL[m.meal_type] ?? m.meal_type}</h3>
                    <span className="text-xs font-black tabular-nums text-white/40">{Math.round(k)} kcal</span>
                  </div>
                  <div className="space-y-1">
                    {m.items.map((it, ii) => (
                      <div key={ii} className="flex justify-between text-sm">
                        <span className="text-white/80">
                          {it.food_name}
                          {it.quantity ? <span className="text-white/40"> · {it.quantity}{it.unit ? ` ${it.unit}` : ''}</span> : null}
                        </span>
                        <span className="tabular-nums text-white/40">{it.kcal} kcal</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
