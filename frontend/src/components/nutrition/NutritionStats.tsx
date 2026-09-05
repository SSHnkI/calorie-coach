import { useEffect, useMemo, useState } from 'react'
import { fetchFoodHistory } from '../../lib/foodLog'
import { kgPorSemana, objetivoDaMeta, rumoDoSaldo, type Rumo } from '../../lib/projecao'
import type { Objetivo } from '../../lib/recompensa'
import type { FoodEntry } from '../../types'

function keyOf(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

// Onde a barra do saldo satura. Passou disso, o problema nao e a escala.
const TETO_DA_BARRA = 1000

const CORES: Record<Rumo, { texto: string; barra: string }> = {
  certo: { texto: 'text-obliq-green', barra: 'bg-obliq-green' },
  parado: { texto: 'text-obliq-amber', barra: 'bg-obliq-amber' },
  contra: { texto: 'text-obliq-red', barra: 'bg-obliq-red' },
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

  const largura = Math.min(Math.abs(saldo) / TETO_DA_BARRA, 1) * 50
  const esquerda = saldo < 0 ? 50 - largura : 50

  return (
    <section>
      <div className="flex items-baseline justify-between gap-3">
        {titulo}
        <span className="num text-[11px] text-obliq-faint">
          {diasComRegistro} de 7 dias{fraco ? ', estimativa fraca' : ''}
        </span>
      </div>

      <div className="mt-2 flex items-end justify-between gap-4">
        <p className="min-w-0">
          <span className={`num text-[2rem] font-medium leading-none ${cor.texto}`}>
            {kgSemana > 0 ? '+' : kgSemana < 0 ? '−' : ''}
            {br(Math.abs(kgSemana), 2)}
          </span>
          <span className="num ml-1.5 text-[11px] text-obliq-faint">kg/semana</span>
          <span className={`mt-1 block text-[12px] ${cor.texto}`}>{FRASES[objetivo][rumo]}</span>
        </p>

        {projetado != null && (
          <p className="shrink-0 text-right">
            <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-obliq-faint">
              em 4 semanas
            </span>
            <span className="num text-lg font-medium text-obliq-chalk">
              {br(projetado, 1)} kg
            </span>
          </p>
        )}
      </div>

      {/* Saldo medio contra a manutencao. Zero no meio: e o unico ponto em que
          o peso nao se mexe, e ver de que lado dele voce esta explica o numero
          grande la em cima melhor do que qualquer frase. */}
      <div className="mt-3">
        <div className="relative h-2 overflow-hidden rounded-full bg-obliq-surface ring-1 ring-obliq-border">
          <span
            aria-hidden="true"
            className="absolute inset-y-0 left-1/2 z-10 w-0.5 -translate-x-1/2 bg-obliq-chalk/70"
          />
          <span
            aria-hidden="true"
            className={`absolute inset-y-0 transition-all duration-500 ease-out ${cor.barra}`}
            style={{ left: `${esquerda}%`, width: `${Math.max(largura, 1)}%` }}
          />
        </div>

        <div className="mt-1 flex items-baseline justify-between gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-obliq-faint">
            déficit
          </span>
          <span className="num text-[11px] text-obliq-dim">
            {saldo > 0 ? '+' : saldo < 0 ? '−' : ''}
            {Math.abs(Math.round(saldo))} kcal/dia
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-obliq-faint">
            superávit
          </span>
        </div>
      </div>
    </section>
  )
}
