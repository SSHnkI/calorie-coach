import { useEffect, useMemo, useState } from 'react'
import {
  fetchMealPlanFull,
  saveMealPlan,
  type DietDayInput,
  type DietItemInput,
  type MealPlanSummary,
} from '../../lib/nutrition'
import { estimateFood } from '../../lib/analyzeFood'
import type { Goal, MealType } from '../../types'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Input } from '../ui/Input'

const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const COMMON_FOODS = [
  'Arroz', 'Feijão', 'Frango grelhado', 'Ovo', 'Pão integral', 'Batata-doce',
  'Aveia', 'Whey', 'Leite', 'Iogurte natural', 'Banana', 'Maçã', 'Salada',
  'Brócolis', 'Tilápia', 'Salmão', 'Patinho moído', 'Macarrão integral',
  'Tapioca', 'Queijo', 'Castanhas', 'Pasta de amendoim', 'Abacate',
]
const MEAL_LABEL: Record<MealType, string> = {
  cafe: 'Café',
  almoco: 'Almoço',
  lanche: 'Lanche',
  jantar: 'Jantar',
  ceia: 'Ceia',
}
const MEAL_TYPES: MealType[] = ['cafe', 'almoco', 'lanche', 'jantar', 'ceia']
const GOALS: { key: Goal; label: string }[] = [
  { key: 'lose', label: 'Emagrecer' },
  { key: 'maintain', label: 'Manter' },
  { key: 'gain', label: 'Ganhar' },
]

function emptyWeek(): DietDayInput[] {
  return Array.from({ length: 7 }, (_, d) => ({ day_of_week: d, meals: [] }))
}

export function DietBuilder({
  plan,
  targetUserId,
  onClose,
  onSaved,
}: {
  plan: MealPlanSummary | null
  targetUserId?: string
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(plan?.name ?? '')
  const [goal, setGoal] = useState<Goal | null>(plan?.goal ?? null)
  const [week, setWeek] = useState<DietDayInput[]>(emptyWeek())
  const [day, setDay] = useState(0)
  const [loading, setLoading] = useState(!!plan)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!plan) return
    let active = true
    fetchMealPlanFull(plan.id)
      .then((d) => active && setWeek(d.days))
      .catch(() => active && setError('Falha ao carregar a dieta.'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [plan])

  const meals = week[day].meals
  const setMeals = (next: typeof meals) =>
    setWeek((w) => w.map((d, i) => (i === day ? { ...d, meals: next } : d)))

  const totals = useMemo(() => {
    let k = 0, p = 0, c = 0, f = 0
    for (const m of meals)
      for (const it of m.items) {
        k += it.kcal || 0; p += it.protein_g || 0; c += it.carbs_g || 0; f += it.fat_g || 0
      }
    return { k, p, c, f }
  }, [meals])

  const addMeal = (t: MealType) => setMeals([...meals, { meal_type: t, items: [] }])
  const removeMeal = (mi: number) => setMeals(meals.filter((_, i) => i !== mi))
  const addItem = (mi: number) =>
    setMeals(
      meals.map((m, i) =>
        i === mi
          ? { ...m, items: [...m.items, { food_name: '', quantity: null, unit: '', kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }] }
          : m,
      ),
    )
  const patchItem = (mi: number, ii: number, patch: Partial<DietItemInput>) =>
    setMeals(
      meals.map((m, i) =>
        i === mi ? { ...m, items: m.items.map((it, j) => (j === ii ? { ...it, ...patch } : it)) } : m,
      ),
    )
  const removeItem = (mi: number, ii: number) =>
    setMeals(meals.map((m, i) => (i === mi ? { ...m, items: m.items.filter((_, j) => j !== ii) } : m)))

  const num = (v: string) => (v === '' ? 0 : Number(v))

  const [calcKey, setCalcKey] = useState<string | null>(null)
  const calcItem = async (mi: number, ii: number) => {
    const it = meals[mi].items[ii]
    if (!it.food_name.trim()) return
    const key = `${mi}-${ii}`
    setCalcKey(key)
    const r = await estimateFood(`${it.quantity ?? ''} ${it.unit ?? ''} ${it.food_name}`.trim())
    if (r)
      patchItem(mi, ii, {
        kcal: Math.round(r.kcal),
        protein_g: Math.round(r.protein_g),
        carbs_g: Math.round(r.carbs_g),
        fat_g: Math.round(r.fat_g),
        quantity: it.quantity ?? r.quantity,
        unit: it.unit || r.unit,
      })
    setCalcKey(null)
  }

  const save = async () => {
    if (!name.trim()) return setError('Dê um nome à dieta.')
    setSaving(true)
    setError('')
    try {
      await saveMealPlan(
        {
          id: plan?.id,
          name: name.trim(),
          goal,
          days: week.map((d) => ({
            day_of_week: d.day_of_week,
            meals: d.meals
              .filter((m) => m.items.length > 0)
              .map((m) => ({
                meal_type: m.meal_type,
                items: m.items.map((it) => ({ ...it, food_name: it.food_name.trim() || 'Item' })),
              })),
          })),
        },
        targetUserId,
      )
      onSaved()
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
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-obliq-border/50" />
        ))}
      </div>
    )
  }

  return (
    <div>
      <datalist id="foods">
        {COMMON_FOODS.map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>
      <div className="mb-4 flex items-center justify-between">
        <button type="button" onClick={onClose} className="text-sm font-bold uppercase text-white/50 hover:text-white">
          ← Voltar
        </button>
        <Button onClick={save} disabled={saving} className="px-4 py-2 text-xs">
          {saving ? 'Salvando…' : 'Salvar dieta'}
        </Button>
      </div>

      <Card className="mb-4">
        <Input label="Nome" placeholder="Minha dieta" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="mt-3 flex flex-wrap gap-2">
          {GOALS.map((g) => (
            <button key={g.key} type="button" onClick={() => setGoal(goal === g.key ? null : g.key)}
              className={`rounded-full border px-3 py-1 text-xs font-bold uppercase transition-all ${
                goal === g.key ? 'border-obliq-red bg-obliq-red/10 text-white' : 'border-obliq-border text-white/50'
              }`}>
              {g.label}
            </button>
          ))}
        </div>
      </Card>

      <div className="mb-3 flex flex-wrap gap-2">
        {DAYS.map((d, i) => (
          <button key={d} type="button" onClick={() => setDay(i)}
            className={`rounded-full border px-3 py-1 text-xs font-bold transition-all ${
              day === i ? 'border-obliq-red bg-obliq-red/10 text-white' : 'border-obliq-border text-white/50'
            }`}>
            {d}
          </button>
        ))}
      </div>

      <p className="mb-3 text-xs text-white/40">
        {DAYS[day]} · {Math.round(totals.k)} kcal · P {Math.round(totals.p)} C {Math.round(totals.c)} G {Math.round(totals.f)}
      </p>

      <div className="space-y-3">
        {meals.map((m, mi) => (
          <Card key={mi}>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-bold">{MEAL_LABEL[m.meal_type]}</h3>
              <button type="button" onClick={() => removeMeal(mi)} className="text-xs text-white/40 hover:text-obliq-red">
                Remover
              </button>
            </div>
            <div className="space-y-2">
              {m.items.map((it, ii) => (
                <div key={ii} className="rounded-lg border border-obliq-border p-2">
                  <div className="flex items-center gap-2">
                    <input value={it.food_name} placeholder="Alimento" list="foods"
                      onChange={(e) => patchItem(mi, ii, { food_name: e.target.value })}
                      className="flex-1 rounded bg-obliq-black px-2 py-1 text-sm text-white outline-none" />
                    <button type="button" onClick={() => calcItem(mi, ii)} disabled={calcKey === `${mi}-${ii}`}
                      title="Calcular kcal com IA"
                      className="shrink-0 rounded-md border border-obliq-border px-2 py-1 text-sm hover:border-obliq-red/50 disabled:opacity-50">
                      {calcKey === `${mi}-${ii}` ? '⏳' : '✨'}
                    </button>
                    <button type="button" onClick={() => removeItem(mi, ii)} className="text-xs text-white/40 hover:text-obliq-red">✕</button>
                  </div>
                  <div className="mt-2 grid grid-cols-6 gap-1 text-center text-[10px] text-white/40">
                    <input value={it.quantity ?? ''} placeholder="qtd" inputMode="decimal"
                      onChange={(e) => patchItem(mi, ii, { quantity: e.target.value === '' ? null : Number(e.target.value) })}
                      className="rounded bg-obliq-black px-1 py-1 text-white" />
                    <input value={it.unit ?? ''} placeholder="un"
                      onChange={(e) => patchItem(mi, ii, { unit: e.target.value })}
                      className="rounded bg-obliq-black px-1 py-1 text-white" />
                    <input value={it.kcal || ''} placeholder="kcal" inputMode="numeric"
                      onChange={(e) => patchItem(mi, ii, { kcal: num(e.target.value) })}
                      className="rounded bg-obliq-black px-1 py-1 text-white" />
                    <input value={it.protein_g || ''} placeholder="P" inputMode="numeric"
                      onChange={(e) => patchItem(mi, ii, { protein_g: num(e.target.value) })}
                      className="rounded bg-obliq-black px-1 py-1 text-white" />
                    <input value={it.carbs_g || ''} placeholder="C" inputMode="numeric"
                      onChange={(e) => patchItem(mi, ii, { carbs_g: num(e.target.value) })}
                      className="rounded bg-obliq-black px-1 py-1 text-white" />
                    <input value={it.fat_g || ''} placeholder="G" inputMode="numeric"
                      onChange={(e) => patchItem(mi, ii, { fat_g: num(e.target.value) })}
                      className="rounded bg-obliq-black px-1 py-1 text-white" />
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => addItem(mi)} className="mt-2 text-xs font-bold uppercase text-obliq-red">
              + item
            </button>
          </Card>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {MEAL_TYPES.map((t) => (
          <button key={t} type="button" onClick={() => addMeal(t)}
            className="rounded-full border border-obliq-border px-3 py-1 text-xs font-bold text-white/60 hover:border-obliq-red/50">
            + {MEAL_LABEL[t]}
          </button>
        ))}
      </div>

      {error && <p className="mt-3 text-center text-sm text-obliq-red">{error}</p>}
    </div>
  )
}
