import { useEffect, useMemo, useState } from 'react'
import { fetchFoodHistory } from '../../lib/foodLog'
import type { FoodEntry } from '../../types'

const LETRA = ['d', 's', 't', 'q', 'q', 's', 's']

function chave(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

/**
 * Corrente de habito: sete blocos, um por dia, preenchidos conforme a meta.
 * E o unico lugar do app que mostra constancia, que e o que faz alguem voltar.
 */
export function Habito({ meta, versao }: { meta: number; versao: number }) {
  const [itens, setItens] = useState<FoodEntry[] | null>(null)

  useEffect(() => {
    fetchFoodHistory(8)
      .then(setItens)
      .catch(() => setItens([]))
  }, [versao])

  const { dias, sequencia } = useMemo(() => {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    const soma: Record<string, number> = {}
    for (const i of itens ?? []) {
      const d = new Date(i.logged_at)
      d.setHours(0, 0, 0, 0)
      soma[chave(d)] = (soma[chave(d)] ?? 0) + i.kcal
    }

    const dias = Array.from({ length: 7 }, (_, n) => {
      const d = new Date(hoje)
      d.setDate(d.getDate() - (6 - n))
      const kcal = soma[chave(d)] ?? 0
      return {
        letra: LETRA[d.getDay()],
        kcal,
        pct: meta > 0 ? Math.min(100, (kcal / meta) * 100) : 0,
        registrou: kcal > 0,
        hoje: chave(d) === chave(hoje),
      }
    })

    // Conta pra tras. O dia de hoje ainda vazio nao quebra a sequencia.
    let sequencia = 0
    for (let n = 6; n >= 0; n--) {
      if (dias[n].registrou) sequencia++
      else if (!dias[n].hoje) break
    }

    return { dias, sequencia }
  }, [itens, meta])

  if (!itens) return <div className="h-16 animate-pulse rounded-lg bg-obliq-surface" />

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-obliq-faint">
          constância
        </span>
        <span className="num text-sm">
          {sequencia > 0 ? (
            <>
              {sequencia}
              <span className="text-obliq-faint">
                {' '}
                {sequencia === 1 ? 'dia' : 'dias seguidos'}
              </span>
            </>
          ) : (
            <span className="text-obliq-faint">comece hoje</span>
          )}
        </span>
      </div>

      <ol className="mt-3 flex gap-1.5">
        {dias.map((d, n) => (
          <li key={n} className="flex-1">
            <div
              title={d.kcal ? `${d.kcal} kcal` : 'sem registro'}
              className={`flex h-10 items-end overflow-hidden rounded ${
                d.hoje ? 'ring-1 ring-obliq-red/40' : ''
              } ${d.registrou ? 'bg-obliq-raised' : 'bg-obliq-surface'}`}
            >
              <div
                className={`w-full rounded transition-[height] duration-700 ease-out ${
                  d.kcal > meta && meta > 0 ? 'bg-obliq-red' : 'bg-obliq-dim'
                }`}
                style={{ height: `${Math.max(d.registrou ? 12 : 0, d.pct)}%` }}
              />
            </div>
            <span
              className={`mt-1 block text-center font-mono text-[10px] ${
                d.hoje ? 'text-obliq-chalk' : 'text-obliq-faint'
              }`}
            >
              {d.letra}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
