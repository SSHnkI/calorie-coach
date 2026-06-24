import { useEffect, useMemo, useState } from 'react'
import { fetchFoodHistory } from '../../lib/foodLog'
import type { FoodEntry } from '../../types'
import { Card } from '../ui/Card'

type DayGroup = {
  key: string
  label: string
  kcal: number
  items: FoodEntry[]
}

function dayKey(iso: string) {
  const d = new Date(iso)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  })
}

export function NutritionHistory() {
  const [items, setItems] = useState<FoodEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [openDay, setOpenDay] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetchFoodHistory(30)
      .then((d) => active && setItems(d))
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  const days = useMemo<DayGroup[]>(() => {
    const map = new Map<string, DayGroup>()
    for (const it of items) {
      const k = dayKey(it.logged_at)
      const g = map.get(k) ?? { key: k, label: dayLabel(it.logged_at), kcal: 0, items: [] }
      g.kcal += it.kcal
      g.items.push(it)
      map.set(k, g)
    }
    return Array.from(map.values()) // já vem ordenado desc pela query
  }, [items])

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-obliq-border/50" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <p className="text-center text-sm text-obliq-red">Falha ao carregar o histórico.</p>
      </Card>
    )
  }

  if (days.length === 0) {
    return (
      <Card>
        <p className="text-center text-sm text-white/40">Sem registros ainda.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {days.map((d) => {
        const open = openDay === d.key
        return (
          <Card key={d.key}>
            <button
              type="button"
              onClick={() => setOpenDay(open ? null : d.key)}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <div>
                <h3 className="font-bold capitalize">{d.label}</h3>
                <p className="text-xs text-white/40">
                  {d.items.length} {d.items.length === 1 ? 'item' : 'itens'}
                </p>
              </div>
              <span className="font-black tabular-nums text-obliq-red">
                {Math.round(d.kcal).toLocaleString('pt-BR')} kcal
              </span>
            </button>
            {open && (
              <div className="mt-3 space-y-1 border-t border-obliq-border pt-3">
                {d.items.map((it) => (
                  <div key={it.id} className="flex justify-between text-sm">
                    <span className="text-white/70">{it.name}</span>
                    <span className="tabular-nums text-white/50">{it.kcal} kcal</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
