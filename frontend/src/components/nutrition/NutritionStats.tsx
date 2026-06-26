import { useEffect, useMemo, useState } from 'react'
import { fetchFoodHistory } from '../../lib/foodLog'
import type { FoodEntry } from '../../types'
import { Card } from '../ui/Card'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function keyOf(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export function NutritionStats({
  target,
  maintenance,
  currentWeight,
}: {
  target: number
  maintenance: number
  currentWeight: number | null
}) {
  const [items, setItems] = useState<FoodEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let active = true
    fetchFoodHistory(7)
      .then((d) => active && setItems(d))
      .catch(() => {})
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  const days = useMemo(() => {
    const today0 = new Date()
    today0.setHours(0, 0, 0, 0)
    const base = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today0)
      d.setDate(d.getDate() - (6 - i))
      return d
    })
    const byDay: Record<string, number> = {}
    for (const it of items) {
      const k = keyOf(new Date(it.logged_at))
      byDay[k] = (byDay[k] ?? 0) + it.kcal
    }
    return base.map((d) => ({ kcal: byDay[keyOf(d)] ?? 0, wd: WEEKDAYS[d.getDay()] }))
  }, [items])

  const logged = days.filter((d) => d.kcal > 0)
  const maxScale = Math.max(target, ...days.map((d) => d.kcal), 1)
  const avgBalance = logged.length
    ? logged.reduce((s, d) => s + (d.kcal - maintenance), 0) / logged.length
    : 0
  const weeklyKg = (avgBalance * 7) / 7700
  const projected = currentWeight != null ? currentWeight + weeklyKg * 4 : null

  if (loading) {
    return <div className="mb-4 h-44 animate-pulse rounded-2xl bg-obliq-border/50" />
  }

  return (
    <Card className="mb-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <h2 className="text-sm font-bold uppercase tracking-widest text-white/50">
          Últimos 7 dias
        </h2>
        <div className="flex items-center gap-3">
          {!open && logged.length > 0 && (
            <span
              className={`text-xs font-bold tabular-nums ${weeklyKg > 0 ? 'text-amber-400' : 'text-emerald-400'}`}
            >
              {weeklyKg > 0 ? '+' : ''}
              {weeklyKg.toFixed(2)} kg/sem
            </span>
          )}
          <span className={`text-white/50 transition-transform ${open ? 'rotate-180' : ''}`}>
            ▾
          </span>
        </div>
      </button>

      <div className={`${open ? 'mt-3' : 'hidden'} flex h-28 items-end gap-1.5`}>
        {days.map((d, i) => {
          const h = Math.round((d.kcal / maxScale) * 100)
          const over = d.kcal > target
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex w-full flex-1 items-end">
                <div
                  className={`w-full rounded-t ${over ? 'bg-obliq-red' : 'bg-red-gradient'}`}
                  style={{ height: `${h}%` }}
                />
              </div>
              <span className="text-[9px] text-white/40">{d.wd}</span>
            </div>
          )
        })}
      </div>

      {open && (logged.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-obliq-border pt-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/50">
              Saldo médio/dia
            </p>
            <p
              className={`text-lg font-black tabular-nums ${avgBalance > 0 ? 'text-amber-400' : 'text-emerald-400'}`}
            >
              {avgBalance > 0 ? '+' : ''}
              {Math.round(avgBalance)} kcal
            </p>
            <p className="text-[10px] text-white/50">vs manutenção ({maintenance} kcal)</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/50">Projeção</p>
            <p
              className={`text-lg font-black tabular-nums ${weeklyKg > 0 ? 'text-amber-400' : 'text-emerald-400'}`}
            >
              {weeklyKg > 0 ? '+' : ''}
              {weeklyKg.toFixed(2)} kg/sem
            </p>
            {projected != null && (
              <p className="text-[10px] text-white/50">~{projected.toFixed(1)} kg em 4 sem</p>
            )}
          </div>
        </div>
      ) : (
        <p className="mt-4 border-t border-obliq-border pt-3 text-center text-xs text-white/40">
          Registre comida para ver a projeção.
        </p>
      ))}
    </Card>
  )
}
