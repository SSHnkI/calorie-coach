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

  if (!items) return <div className="h-14 animate-pulse rounded-lg bg-obliq-surface" />

  if (diasComRegistro === 0) {
    return (
      <section>
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-obliq-faint">
          projeção
        </span>
        <p className="mt-2 text-sm text-obliq-dim">
          Registre alguns dias e o app projeta seu peso a partir do saldo calórico.
        </p>
      </section>
    )
  }

  const sinal = kgSemana > 0 ? '+' : ''

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-obliq-faint">
          projeção
        </span>
        <span className="num text-sm text-obliq-faint">
          {diasComRegistro} {diasComRegistro === 1 ? 'dia' : 'dias'}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-8 gap-y-2">
        <p>
          <span className="num text-2xl font-medium">
            {sinal}
            {kgSemana.toFixed(2)}
          </span>
          <span className="ml-1 text-sm text-obliq-faint">kg por semana</span>
        </p>
        {projetado != null && (
          <p className="num text-sm text-obliq-dim">
            ~{projetado.toFixed(1)} kg em 4 semanas
          </p>
        )}
      </div>

      <p className="mt-2 font-mono text-[11px] text-obliq-faint">
        saldo médio {saldo > 0 ? '+' : ''}
        {Math.round(saldo)} kcal/dia contra manutenção de {maintenance}
      </p>
    </section>
  )
}
