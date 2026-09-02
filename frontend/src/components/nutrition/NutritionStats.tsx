import { useEffect, useMemo, useState } from 'react'
import { fetchFoodHistory } from '../../lib/foodLog'
import type { FoodEntry } from '../../types'

function keyOf(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

/**
 * Projecao de peso a partir do saldo calorico dos ultimos 7 dias.
 * O grafico de barras saiu daqui: a corrente de constancia ja mostra os 7 dias,
 * e duas leituras do mesmo dado competiam entre si.
 */
export function NutritionStats({
  target: _target,
  maintenance,
  currentWeight,
}: {
  target: number
  maintenance: number
  currentWeight: number | null
}) {
  const [items, setItems] = useState<FoodEntry[] | null>(null)

  useEffect(() => {
    fetchFoodHistory(7)
      .then(setItems)
      .catch(() => setItems([]))
  }, [])

  const { saldo, kgSemana, projetado, diasComRegistro } = useMemo(() => {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    const porDia: Record<string, number> = {}
    for (const it of items ?? []) {
      const k = keyOf(new Date(it.logged_at))
      porDia[k] = (porDia[k] ?? 0) + it.kcal
    }

    const dias = Object.values(porDia).filter((k) => k > 0)
    const saldo = dias.length
      ? dias.reduce((s, k) => s + (k - maintenance), 0) / dias.length
      : 0
    // 7700 kcal ~ 1 kg de tecido adiposo.
    const kgSemana = (saldo * 7) / 7700
    return {
      saldo,
      kgSemana,
      projetado: currentWeight != null ? currentWeight + kgSemana * 4 : null,
      diasComRegistro: dias.length,
    }
  }, [items, maintenance, currentWeight])

  if (!items) return <div className="h-5 animate-pulse rounded bg-obliq-surface" />

  if (diasComRegistro === 0) {
    return (
      <section className="flex flex-wrap items-baseline justify-between gap-x-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-obliq-faint">
          projeção
        </span>
        <span className="text-xs text-obliq-faint">
          registre alguns dias para ver
        </span>
      </section>
    )
  }

  const sinal = kgSemana > 0 ? '+' : ''

  return (
    <section className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-obliq-faint">
        projeção
      </span>
      <span className="num text-xs">
        <span className="text-obliq-chalk">
          {sinal}
          {kgSemana.toFixed(2)} kg/sem
        </span>
        {projetado != null && (
          <span className="text-obliq-faint"> · ~{projetado.toFixed(1)} kg em 4 sem</span>
        )}
        <span className="text-obliq-faint">
          {' '}
          · saldo {saldo > 0 ? '+' : ''}
          {Math.round(saldo)}/dia
        </span>
      </span>
    </section>
  )
}
