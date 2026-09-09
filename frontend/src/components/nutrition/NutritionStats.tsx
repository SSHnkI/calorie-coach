import { useEffect, useMemo, useState } from 'react'
import { fetchFoodHistory } from '../../lib/foodLog'
import { kgPorSemana, objetivoDaMeta, rumoDoSaldo, type Rumo } from '../../lib/projecao'
import type { Objetivo } from '../../lib/recompensa'
import type { FoodEntry } from '../../types'

function keyOf(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

const CORES: Record<Rumo, string> = {
  certo: 'text-obliq-green',
  parado: 'text-obliq-amber',
  contra: 'text-obliq-red',
}

const FRASES: Record<Objetivo, Record<Rumo, string>> = {
  lose: {
    certo: 'no ritmo de emagrecer',
    parado: 'peso praticamente parado',
    contra: 'ganhando, não perdendo',
  },
  maintain: {
    certo: 'peso se mantendo',
    parado: 'peso se mantendo',
    contra: 'saindo da manutenção',
  },
  gain: {
    certo: 'no ritmo de ganhar',
    parado: 'peso praticamente parado',
    contra: 'perdendo, não ganhando',
  },
}

const br = (n: number, casas: number) => n.toFixed(casas).replace('.', ',')

/**
 * Para onde o peso vai, no ritmo dos ultimos 7 dias.
 *
 * Era uma linha de texto corrido com tres numeros separados por ponto, do tipo
 * que a pessoa le uma vez e nunca mais. O numero que importa agora e grande e
 * colorido pelo RUMO, nao pelo sinal: perder 0,3 kg por semana e verde pra quem
 * quer emagrecer e vermelho pra quem quer ganhar, e so o app sabe qual e o caso.
 *
 * A barra embaixo mostra o mecanismo: zero no meio e a manutencao, a barra corre
 * pra esquerda no deficit e pra direita no superavit. E de onde a projecao sai.
 */
export function NutritionStats({
  target,
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

  const objetivo = objetivoDaMeta(target, maintenance)

  const { saldo, kgSemana, projetado, diasComRegistro } = useMemo(() => {
    const porDia: Record<string, number> = {}
    for (const it of items ?? []) {
      const k = keyOf(new Date(it.logged_at))
      porDia[k] = (porDia[k] ?? 0) + it.kcal
    }

    const dias = Object.values(porDia).filter((k) => k > 0)
    const saldo = dias.length
      ? dias.reduce((s, k) => s + (k - maintenance), 0) / dias.length
      : 0
    const kgSemana = kgPorSemana(saldo)
    return {
      saldo,
      kgSemana,
      projetado: currentWeight != null ? currentWeight + kgSemana * 4 : null,
      diasComRegistro: dias.length,
    }
  }, [items, maintenance, currentWeight])

  if (!items) return <div className="h-5 animate-pulse rounded bg-obliq-surface" />

  const titulo = (
    <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-obliq-faint">
      projeção
    </span>
  )

  if (diasComRegistro === 0) {
    return (
      <section className="flex flex-wrap items-baseline justify-between gap-x-4">
        {titulo}
        <span className="text-xs text-obliq-faint">registre alguns dias para ver</span>
      </section>
    )
  }

  const rumo = rumoDoSaldo(saldo, objetivo)
  const cor = CORES[rumo]
  // Poucos dias na conta e chute com cara de numero. Diz isso em vez de esconder.
  const fraco = diasComRegistro < 3
  // Projetar quatro semanas em cima de dois dias e adivinhacao com virgula. E
  // peso fora da faixa humana e conta errada em algum lugar, nao previsao.
  const mostraDestino =
    projetado != null && currentWeight != null && !fraco && projetado > 25 && projetado < 400

  return (
    <section>
      <div className="flex items-baseline justify-between gap-3">
        {titulo}
        <span className="num text-[11px] text-obliq-faint">
          {diasComRegistro} de 7 dias{fraco ? ', estimativa fraca' : ''}
        </span>
      </div>

      {/* O numero e a frase, e depois duas linhas de livro-caixa, que e a
          lingua do resto da tela. Saiu a barra com o zero no meio: ela era um
          desenho de outro app no meio deste, e o saldo cabe numa linha. */}
      <p className="mt-2 flex items-baseline gap-2">
        <span className={`num text-[2rem] font-medium leading-none ${cor}`}>
          {kgSemana > 0 ? '+' : kgSemana < 0 ? '−' : ''}
          {br(Math.abs(kgSemana), 2)}
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-obliq-faint">
          kg por semana
        </span>
      </p>
      <p className={`mt-1 text-[13px] ${cor}`}>{FRASES[objetivo][rumo]}</p>

      <dl className="mt-3 divide-y divide-obliq-border border-y border-obliq-border">
        <div className="flex items-baseline py-2">
          <dt className="text-[13px] text-obliq-dim">
            {saldo > 0 ? 'superávit por dia' : 'déficit por dia'}
          </dt>
          <span className="leader" aria-hidden="true" />
          <dd className="num shrink-0 text-obliq-chalk">
            {saldo > 0 ? '+' : saldo < 0 ? '−' : ''}
            {Math.abs(Math.round(saldo))}
            <span className="ml-1 font-mono text-[12px] text-obliq-faint">kcal</span>
          </dd>
        </div>

        {mostraDestino && (
          <div className="flex items-baseline py-2">
            <dt className="text-[13px] text-obliq-dim">em 4 semanas</dt>
            <span className="leader" aria-hidden="true" />
            <dd className="num shrink-0">
              <span className="text-obliq-faint">{br(currentWeight as number, 1)}</span>
              <span className="mx-1.5 text-obliq-faint">&rarr;</span>
              <span className="text-obliq-chalk">{br(projetado as number, 1)} kg</span>
            </dd>
          </div>
        )}
      </dl>
    </section>
  )
}
