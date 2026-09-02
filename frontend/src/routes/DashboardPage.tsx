import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { useI18n } from '../i18n/I18nContext'
import { analyzeFood } from '../lib/analyzeFood'
import { deleteFood, fetchTodayFood, updateFoodKcal } from '../lib/foodLog'
import { calculateDailyKcal, calculateMacroTargets } from '../lib/tdee'
import type { FoodEntry } from '../types'
import { AppShell } from '../components/layout/AppShell'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import { Tabs } from '../components/ui/Tabs'
import { Habito } from '../components/nutrition/Habito'
import { useCountUp } from '../lib/useCountUp'
import { NutritionHistory } from '../components/nutrition/NutritionHistory'
import { NutritionStats } from '../components/nutrition/NutritionStats'

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

export function DashboardPage() {
  const { t } = useI18n()
  const { user } = useApp()
  const [entries, setEntries] = useState<FoodEntry[]>([])
  const [tab, setTab] = useState('today')
  const [foodInput, setFoodInput] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [novoId, setNovoId] = useState<string | null>(null)
  const [versao, setVersao] = useState(0)

  const loadToday = useCallback((marcarNovo = false) => {
    fetchTodayFood()
      .then((novos) => {
        setEntries((antigos) => {
          if (marcarNovo) {
            const vistos = new Set(antigos.map((e) => e.id))
            const recem = novos.find((e) => !vistos.has(e.id))
            if (recem) {
              setNovoId(recem.id)
              setTimeout(() => setNovoId(null), 1200)
            }
          }
          return novos
        })
        if (marcarNovo) setVersao((v) => v + 1)
      })
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
  const remaining = target - totals.kcal
  const pct = target > 0 ? Math.min(100, (totals.kcal / target) * 100) : 0
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
        setError(
          result.error === 'limit_reached'
            ? t.dashboard.limitReached
            : t.dashboard.analyzeError,
        )
        return
      }
      setFoodInput('')
      loadToday(true)
    } catch {
      setError(t.dashboard.analyzeError)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleDelete = async (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
    try {
      await deleteFood(id)
    } catch {
      loadToday()
    }
  }

  // Edicao no lugar, sem prompt() do navegador.
  const startEdit = (item: FoodEntry) => {
    setEditing(item.id)
    setEditValue(String(item.kcal))
  }

  const commitEdit = async (item: FoodEntry) => {
    const kcal = Number(editValue)
    setEditing(null)
    if (!Number.isFinite(kcal) || kcal < 0 || kcal === item.kcal) return
    setEntries((prev) => prev.map((e) => (e.id === item.id ? { ...e, kcal } : e)))
    try {
      await updateFoodKcal(item.id, kcal)
    } catch {
      loadToday()
    }
  }

  const hoje = DIAS[new Date().getDay()]
  const exibido = useCountUp(totals.kcal)
  const bateuMeta = target > 0 && totals.kcal >= target

  return (
    <AppShell titleKey="dashboard" showNav={false}>
      <Tabs
        tabs={[
          { id: 'today', label: t.dashboard.today },
          { id: 'history', label: t.ui.tabHistory },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'history' && (
        <div className="mt-8">
          <NutritionHistory />
        </div>
      )}

      {tab === 'today' && (
        <>
          {/* Numero do dia: o unico lugar onde o vermelho aparece grande. */}
          <section className="mt-8">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-obliq-faint">
                {hoje}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-obliq-faint">
                {t.common.kcal}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
              <p
                key={bateuMeta ? 'meta' : 'andando'}
                className={`num text-[clamp(3.5rem,16vw,5.5rem)] font-medium leading-none text-obliq-red ${
                  bateuMeta ? 'bater' : ''
                }`}
              >
                {exibido}
                <span className="num ml-2 align-baseline text-xl font-normal text-obliq-faint">
                  / {target}
                </span>
              </p>
              <p className="text-right">
                <span className="block text-xs text-obliq-faint">
                  {remaining >= 0 ? t.dashboard.remaining : 'acima da meta'}
                </span>
                <span
                  className={`num text-2xl font-medium ${
                    remaining >= 0 ? 'text-obliq-chalk' : 'text-obliq-red'
                  }`}
                >
                  {Math.abs(remaining)}
                </span>
              </p>
            </div>

            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-obliq-border">
              <div
                className={`h-full rounded-full transition-[width] duration-500 ease-out ${
                  totals.kcal > target ? 'bg-obliq-red' : 'bg-obliq-chalk'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </section>

          <div className="mt-10">
            <Habito meta={target} versao={versao} />
          </div>

          {/* Macros como linhas de tabela, nao tres cartoes iguais. */}
          <section className="mt-10">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-obliq-faint">
              {t.dashboard.macros}
            </h2>
            <dl className="mt-3 divide-y divide-obliq-border border-y border-obliq-border">
              {[
                { l: t.dashboard.protein, cur: totals.protein_g, tgt: macros.protein_g },
                { l: t.dashboard.carbs, cur: totals.carbs_g, tgt: macros.carbs_g },
                { l: t.dashboard.fat, cur: totals.fat_g, tgt: macros.fat_g },
              ].map((m) => (
                <div key={m.l} className="flex items-center gap-4 py-3">
                  <dt className="w-24 shrink-0 text-sm text-obliq-dim">{m.l}</dt>
                  <dd className="flex flex-1 items-center gap-4">
                    <div className="h-px flex-1 bg-obliq-border">
                      <div
                        className="h-px bg-obliq-chalk transition-[width] duration-500"
                        style={{
                          width: `${Math.min(100, (m.cur / (m.tgt || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="num shrink-0 text-sm">
                      {Math.round(m.cur)}
                      <span className="text-obliq-faint">/{m.tgt}g</span>
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <div className="mt-10">
            <NutritionStats
              target={target}
              maintenance={maintenance}
              currentWeight={user?.weight_kg ?? null}
            />
          </div>

          {/* Entrada: um campo, um botao. */}
          <section className="mt-10">
            <form onSubmit={handleAnalyze}>
              <label
                htmlFor="alimento"
                className="font-mono text-[11px] uppercase tracking-[0.14em] text-obliq-faint"
              >
                {t.dashboard.logFood}
              </label>
              <div className="mt-3 flex gap-2">
                <input
                  id="alimento"
                  placeholder={t.dashboard.foodPlaceholder}
                  value={foodInput}
                  onChange={(e) => setFoodInput(e.target.value)}
                  disabled={analyzing}
                  autoComplete="off"
                  className="min-h-11 flex-1 rounded-lg bg-obliq-surface px-3.5 py-3 text-obliq-chalk ring-1 ring-obliq-border outline-none transition-colors duration-200 placeholder:text-obliq-faint focus:ring-obliq-dim"
                />
                <Button type="submit" disabled={analyzing || !foodInput.trim()}>
                  {analyzing ? t.dashboard.analyzing : t.dashboard.analyze}
                </Button>
              </div>
              {error && (
                <p role="alert" className="mt-2 text-sm text-obliq-red">
                  {error}
                </p>
              )}
            </form>
          </section>

          {/* Registro do dia em forma de livro-caixa. */}
          <section className="mt-10 pb-16">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-obliq-faint">
              {t.dashboard.foodLog}
            </h2>

            {entries.length === 0 ? (
              <div className="mt-3 border-y border-obliq-border py-12 text-center">
                <p className="text-obliq-dim">{t.dashboard.foodLogEmpty}</p>
                <p className="mt-1 text-sm text-obliq-faint">
                  Comece por algo simples, como {t.dashboard.foodPlaceholder}.
                </p>
              </div>
            ) : (
              <ul className="mt-3 divide-y divide-obliq-border border-y border-obliq-border">
                {entries.map((item, i) => (
                  <li
                    key={item.id}
                    className={`rise py-3.5 ${item.id === novoId ? 'fisgada' : ''}`}
                    style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
                  >
                    <div className="flex items-baseline">
                      <span className="text-obliq-chalk">{item.name}</span>
                      <span className="leader" aria-hidden="true" />

                      {editing === item.id ? (
                        <input
                          autoFocus
                          type="number"
                          inputMode="numeric"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => commitEdit(item)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitEdit(item)
                            if (e.key === 'Escape') setEditing(null)
                          }}
                          aria-label={`Calorias de ${item.name}`}
                          className="num w-20 shrink-0 rounded bg-obliq-raised px-2 py-0.5 text-right text-obliq-chalk ring-1 ring-obliq-dim outline-none"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          title="Editar calorias"
                          className="num shrink-0 rounded px-1 text-obliq-chalk transition-colors hover:text-obliq-red"
                        >
                          {item.kcal}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        aria-label={`Excluir ${item.name}`}
                        className="ml-2 shrink-0 p-1 text-obliq-faint transition-colors hover:text-obliq-red"
                      >
                        <Icon name="trash" className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="mt-1 flex gap-3 font-mono text-[11px] text-obliq-faint">
                      <span>
                        {item.quantity} {item.unit}
                      </span>
                      <span>P {item.protein_g}</span>
                      <span>C {item.carbs_g}</span>
                      <span>G {item.fat_g}</span>
                      {item.confidence === 'low' && <span>{t.common.estimated}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </AppShell>
  )
}
