import { useEffect, useMemo, useState } from 'react'
import { fetchFoodHistory } from '../../lib/foodLog'
import type { FoodEntry } from '../../types'

const ROTULOS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']

function chave(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

// Segunda desta semana. getDay() devolve 0 para domingo, que aqui e o ultimo dia.
function segundaDaSemana(hoje: Date) {
  const d = new Date(hoje)
  const desloca = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - desloca)
  d.setHours(0, 0, 0, 0)
  return d
}

type HabitoProps = {
  meta: number
  versao: number
  // Dia em edicao. Tocar numa barra passada e como o usuario volta pra anotar
  // o que esqueceu: a semana ja esta na tela, nao precisa de outro seletor.
  selecionado: Date
  onSelecionar: (dia: Date) => void
}

/**
 * Semana corrente, de segunda a domingo, com a altura de cada dia
 * proporcional a meta. E o unico lugar do app que mostra constancia.
 */
export function Habito({ meta, versao, selecionado, onSelecionar }: HabitoProps) {
  const [itens, setItens] = useState<FoodEntry[] | null>(null)

  useEffect(() => {
    fetchFoodHistory(30)
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

    const segunda = segundaDaSemana(hoje)
    const dias = ROTULOS.map((rotulo, n) => {
      const d = new Date(segunda)
      d.setDate(d.getDate() + n)
      const kcal = soma[chave(d)] ?? 0
      return {
        rotulo,
        data: d,
        kcal,
        pct: meta > 0 ? Math.min(100, (kcal / meta) * 100) : 0,
        registrou: kcal > 0,
        hoje: chave(d) === chave(hoje),
        futuro: d > hoje,
        aberto: chave(d) === chave(selecionado),
      }
    })

    // A sequencia olha o historico inteiro, nao so a semana na tela.
    // O dia de hoje ainda vazio nao quebra nada: o dia nao acabou.
    let sequencia = 0
    const cursor = new Date(hoje)
    if (!soma[chave(cursor)]) cursor.setDate(cursor.getDate() - 1)
    while (soma[chave(cursor)]) {
      sequencia++
      cursor.setDate(cursor.getDate() - 1)
    }

    return { dias, sequencia }
  }, [itens, meta, selecionado])

  if (!itens) return <div className="h-14 animate-pulse rounded-lg bg-obliq-surface" />

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-obliq-faint">
          semana
        </span>
        <span className="num text-xs">
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

      <ol className="mt-2 flex gap-1">
        {dias.map((d) => (
          <li key={d.rotulo} className="flex-1">
            <button
              type="button"
              disabled={d.futuro}
              aria-pressed={d.aberto}
              aria-label={`${d.rotulo}, ${d.kcal ? `${d.kcal} kcal` : 'sem registro'}`}
              onClick={() => onSelecionar(d.data)}
              title={d.kcal ? `${d.kcal} kcal` : d.futuro ? 'ainda vem' : 'sem registro'}
              className={`block w-full rounded transition-colors duration-200 disabled:cursor-default ${
                d.aberto ? 'ring-1 ring-obliq-chalk' : d.hoje ? 'ring-1 ring-obliq-red/50' : ''
              } enabled:hover:ring-1 enabled:hover:ring-obliq-dim`}
            >
              <span
                className={`flex h-8 items-end overflow-hidden rounded ${
                  d.registrou
                    ? 'bg-obliq-raised'
                    : d.futuro
                      ? 'bg-obliq-surface/50'
                      : 'bg-obliq-surface'
                }`}
              >
                <span
                  className={`w-full rounded transition-[height] duration-700 ease-out ${
                    d.kcal > meta && meta > 0 ? 'bg-obliq-red' : 'bg-obliq-dim'
                  }`}
                  style={{ height: `${Math.max(d.registrou ? 12 : 0, d.pct)}%` }}
                />
              </span>
              <span
                className={`mt-0.5 block text-center font-mono text-[10px] ${
                  d.aberto || d.hoje ? 'text-obliq-chalk' : 'text-obliq-faint'
                }`}
              >
                {d.rotulo}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}
