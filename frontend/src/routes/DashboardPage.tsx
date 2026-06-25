import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { useI18n } from '../i18n/I18nContext'
import { analyzeFood } from '../lib/analyzeFood'
import { deleteFood, fetchTodayFood, updateFoodKcal } from '../lib/foodLog'
import { calculateDailyKcal, calculateMacroTargets } from '../lib/tdee'
import { formatKcal } from '../lib/format'
import type { FoodEntry } from '../types'
import { AppShell } from '../components/layout/AppShell'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { MacroRing } from '../components/ui/MacroRing'
import { ProgressBar } from '../components/ui/ProgressBar'
import { Tabs } from '../components/ui/Tabs'
import { NutritionHistory } from '../components/nutrition/NutritionHistory'
import { NutritionStats } from '../components/nutrition/NutritionStats'

function ProGate() {
  return (
    <Card glow className="text-center">
      <div className="text-4xl">🔒</div>
      <h2 className="mt-2 text-lg font-black uppercase">Recurso Pro</h2>
      <p className="mt-1 text-sm text-white/50">
        Histórico, edição e projeção de peso fazem parte do plano Pro.
      </p>
      <Button to="/pricing" className="mt-4">
        Virar Pro
      </Button>
    </Card>
  )
}

export function DashboardPage() {
  const { t, locale } = useI18n()
  const { user, isPro } = useApp()
  const [entries, setEntries] = useState<FoodEntry[]>([])
  const [tab, setTab] = useState('today')
  const [macrosOpen, setMacrosOpen] = useState(false)
  const [foodInput, setFoodInput] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')

  const loadToday = useCallback(() => {
    fetchTodayFood()
      .then(setEntries)
      .catch(() => {})
  }, [])

  useEffect(() => {
    loadToday()
  }, [loadToday])

  const totals = useMemo(
    () =>
      entries.reduce(
        (acc, e) => ({
          kcal: acc.kcal + e.kcal,
          protein_g: acc.protein_g + e.protein_g,
          carbs_g: acc.carbs_g + e.carbs_g,
          fat_g: acc.fat_g + e.fat_g,
        }),
        { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
      ),
    [entries],
  )

  const target = user?.daily_kcal ?? 2000
  const remaining = Math.max(0, target - totals.kcal)
  const macros = calculateMacroTargets(target)
  const maintenance = user
    ? calculateDailyKcal({
        age: user.age,
        weight_kg: user.weight_kg,
        height_cm: user.height_cm,
        sex: user.sex,
        activity: user.activity,
        goal: 'maintain',
      })
    : target

  const handleAnalyze = async (e: FormEvent) => {
    e.preventDefault()
    if (!foodInput.trim()) return
    setAnalyzing(true)
    setError('')
    try {
      const result = await analyzeFood(foodInput)
      if (!result.ok) {
        setError(result.error === 'limit_reached' ? t.dashboard.limitReached : t.dashboard.analyzeError)
        return
      }
      setFoodInput('')
      loadToday() // a Edge Function já gravou; recarrega do banco
    } catch {
      setError(t.dashboard.analyzeError)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleDelete = async (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id)) // otimista
    try {
      await deleteFood(id)
    } catch {
      loadToday()
    }
  }

  const handleEditKcal = async (item: FoodEntry) => {
    const input = prompt(`Kcal de "${item.name}":`, String(item.kcal))
    if (input == null) return
    const kcal = Number(input)
    if (!Number.isFinite(kcal) || kcal < 0) return
    setEntries((prev) => prev.map((e) => (e.id === item.id ? { ...e, kcal } : e)))
    try {
      await updateFoodKcal(item.id, kcal)
    } catch {
      loadToday()
    }
  }

  return (
    <AppShell titleKey="dashboard">
      <div className="mb-4">
        <Tabs
          tabs={[
            { id: 'today', label: 'Hoje' },
            { id: 'history', label: 'Histórico' },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {tab === 'history' && (isPro ? <NutritionHistory /> : <ProGate />)}

      {tab === 'today' && (
        <>
      <Card glow className="mb-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/50">
              {t.dashboard.today}
            </p>
            <p className="mt-1 text-4xl font-black tabular-nums">
              {formatKcal(totals.kcal, locale)}
              <span className="text-lg font-medium text-white/40">
                {' '}
                / {formatKcal(target, locale)}
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/40">{t.dashboard.remaining}</p>
            <p className="text-2xl font-black tabular-nums text-obliq-red">
              {formatKcal(remaining, locale)}
            </p>
          </div>
        </div>
        <ProgressBar value={totals.kcal} max={target} showLabel className="mt-4" />
      </Card>

      <Card className="mb-4">
        <button
          type="button"
          onClick={() => setMacrosOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <h2 className="text-sm font-bold uppercase tracking-widest text-white/50">
            {t.dashboard.macros}
          </h2>
          <span className={`text-white/30 transition-transform ${macrosOpen ? 'rotate-180' : ''}`}>
            ▾
          </span>
        </button>

        {!macrosOpen && (
          <div className="mt-3 grid grid-cols-3 gap-3">
            {[
              { l: 'Proteína', cur: totals.protein_g, tgt: macros.protein_g, c: 'bg-obliq-red' },
              { l: 'Carbo', cur: totals.carbs_g, tgt: macros.carbs_g, c: 'bg-white' },
              { l: 'Gordura', cur: totals.fat_g, tgt: macros.fat_g, c: 'bg-white/50' },
            ].map((m) => (
              <div key={m.l}>
                <span className="text-[10px] uppercase tracking-wide text-white/40">{m.l}</span>
                <p className="text-sm font-black tabular-nums">
                  {Math.round(m.cur)}
                  <span className="text-[10px] font-medium text-white/30">/{m.tgt}g</span>
                </p>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-obliq-border">
                  <div
                    className={`h-full ${m.c}`}
                    style={{ width: `${Math.min(100, (m.cur / (m.tgt || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {macrosOpen && (
          <div className="mt-4 flex justify-around">
            <MacroRing label={t.dashboard.protein} current={totals.protein_g} target={macros.protein_g} />
            <MacroRing label={t.dashboard.carbs} current={totals.carbs_g} target={macros.carbs_g} color="#FFFFFF" />
            <MacroRing label={t.dashboard.fat} current={totals.fat_g} target={macros.fat_g} color="#888888" />
          </div>
        )}
      </Card>

      {isPro && (
        <NutritionStats
          target={target}
          maintenance={maintenance}
          currentWeight={user?.weight_kg ?? null}
        />
      )}

      <Card className="mb-4">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-white/50">
          {t.dashboard.logFood}
        </h2>
        <form onSubmit={handleAnalyze} className="flex flex-col gap-3 sm:flex-row">
          <Input
            placeholder={t.dashboard.foodPlaceholder}
            value={foodInput}
            onChange={(e) => setFoodInput(e.target.value)}
            className="flex-1"
            disabled={analyzing}
          />
          <Button type="submit" disabled={analyzing || !foodInput.trim()} className="shrink-0">
            {analyzing ? t.dashboard.analyzing : t.dashboard.analyze}
          </Button>
        </form>
        {!isPro && <p className="mt-2 text-xs text-white/30">{t.dashboard.freePlanNote}</p>}
        {error && <p className="mt-2 text-sm text-obliq-red">{error}</p>}
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-white/50">
          {t.dashboard.foodLog}
        </h2>
        {entries.length === 0 ? (
          <Card>
            <p className="text-center text-sm text-white/40">{t.dashboard.foodLogEmpty}</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {entries.map((item) => (
              <Card key={item.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold">{item.name}</p>
                    <p className="text-xs text-white/40">
                      {item.quantity} {item.unit}
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="text-right">
                      <p className="font-black tabular-nums text-obliq-red">
                        {item.kcal} {t.common.kcal}
                      </p>
                      <div className="mt-1 flex gap-2 text-[10px] text-white/40">
                        <span>P {item.protein_g}g</span>
                        <span>C {item.carbs_g}g</span>
                        <span>F {item.fat_g}g</span>
                      </div>
                    </div>
                    {isPro && (
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => handleEditKcal(item)}
                          className="text-xs text-white/40 hover:text-white"
                          title="Editar kcal"
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="text-xs text-white/40 hover:text-obliq-red"
                          title="Excluir"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {item.confidence === 'low' && (
                  <div className="mt-2">
                    <Badge>{t.common.estimated}</Badge>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
        </>
      )}
    </AppShell>
  )
}
