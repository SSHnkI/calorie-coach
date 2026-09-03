import { useEffect, useMemo, useState } from 'react'
import { fetchUserWeek, type AppUser } from '../../lib/users'
import type { FoodEntry } from '../../types'
import { Icon } from '../ui/Icon'

// Sete dias corridos, incluindo os vazios: a semana so se le como semana se o
// dia sem registro aparecer. Sumir com ele esconde justamente o que interessa.
const DIAS = 7

type Dia = {
  chave: string
  rotulo: string
  kcal: number
  itens: FoodEntry[]
}

function chaveDoDia(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']

// Rotulo curto de proposito: cabe em uma linha na coluna, que e o que faz as
// sete linhas se lerem como uma semana em vez de uma lista qualquer.
function rotuloDoDia(d: Date, hoje: string) {
  if (chaveDoDia(d) === hoje) return 'hoje'
  const dia = String(d.getDate()).padStart(2, '0')
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  return `${SEMANA[d.getDay()]} ${dia}/${mes}`
}

function hora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function HistoricoSemanal({ usuario }: { usuario: AppUser }) {
  const [itens, setItens] = useState<FoodEntry[] | null>(null)
  const [erro, setErro] = useState(false)
  const [aberto, setAberto] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    setItens(null)
    setErro(false)
    fetchUserWeek(usuario.id, DIAS)
      .then((d) => vivo && setItens(d))
      .catch(() => vivo && setErro(true))
    return () => {
      vivo = false
    }
  }, [usuario.id])

  const dias = useMemo<Dia[]>(() => {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const chaveHoje = chaveDoDia(hoje)

    const vazios: Dia[] = []
    for (let i = 0; i < DIAS; i++) {
      const d = new Date(hoje)
      d.setDate(d.getDate() - i)
      vazios.push({ chave: chaveDoDia(d), rotulo: rotuloDoDia(d, chaveHoje), kcal: 0, itens: [] })
    }

    const porChave = new Map(vazios.map((d) => [d.chave, d]))
    for (const it of itens ?? []) {
      const d = porChave.get(chaveDoDia(new Date(it.logged_at)))
      if (!d) continue
      d.kcal += it.kcal
      d.itens.push(it)
    }
    return vazios
  }, [itens])

  const meta = usuario.daily_kcal ?? 0
  const comRegistro = dias.filter((d) => d.itens.length > 0)
  const media = comRegistro.length
    ? Math.round(comRegistro.reduce((s, d) => s + d.kcal, 0) / comRegistro.length)
    : 0

  if (erro) {
    return (
      <p className="font-mono text-[12px] text-obliq-red">
        Não foi possível carregar o histórico deste usuário.
      </p>
    )
  }

  if (!itens) {
    return (
      <div className="flex flex-col gap-px" aria-label="carregando histórico">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-7 animate-pulse bg-obliq-surface" />
        ))}
      </div>
    )
  }

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[12px] uppercase tracking-[0.14em] text-obliq-faint">
          últimos {DIAS} dias
        </span>
        <span className="num text-[12px] text-obliq-faint">
          {comRegistro.length
            ? `média ${media}${meta ? ` / ${meta}` : ''}`
            : 'sem registro na semana'}
        </span>
      </div>

      <ul className="mt-2 divide-y divide-obliq-border border-y border-obliq-border">
        {dias.map((d) => {
          const on = aberto === d.chave
          const vazio = d.itens.length === 0
          const acima = meta > 0 && d.kcal > meta
          const pct = meta > 0 ? Math.min(100, (d.kcal / meta) * 100) : 0

          return (
            <li key={d.chave}>
              <button
                type="button"
                disabled={vazio}
                onClick={() => setAberto(on ? null : d.chave)}
                aria-expanded={vazio ? undefined : on}
                className="grid w-full grid-cols-[4.75rem_1fr_auto_1rem] items-center gap-3 py-2 text-left transition-colors duration-200 enabled:hover:bg-white/[0.02] disabled:cursor-default"
              >
                <span className="font-mono text-[12px] text-obliq-faint">{d.rotulo}</span>

                <span className="h-1 overflow-hidden rounded-full bg-obliq-border">
                  <span
                    className={`block h-full rounded-full transition-[width] duration-500 ${
                      acima ? 'bg-obliq-red' : 'bg-obliq-dim'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </span>

                <span className={`num text-[12px] ${vazio ? 'text-obliq-line' : acima ? 'text-obliq-red' : 'text-obliq-chalk'}`}>
                  {vazio ? '—' : d.kcal}
                </span>

                <span
                  className={`text-obliq-faint transition-transform duration-200 ${
                    on ? 'rotate-180' : ''
                  }`}
                >
                  {!vazio && <Icon name="chevron" className="h-3.5 w-3.5" />}
                </span>
              </button>

              {on && (
                <ul className="rise pb-3 pl-[4.75rem] font-mono text-[12px]">
                  {d.itens.map((it) => (
                    <li key={it.id} className="flex items-baseline gap-3 py-0.5">
                      <span className="text-obliq-line">{hora(it.logged_at)}</span>
                      <span className="min-w-0 flex-1 truncate text-obliq-dim">
                        {it.name}
                        {it.quantity ? (
                          <span className="text-obliq-faint">
                            {' '}
                            {it.quantity}
                            {it.unit}
                          </span>
                        ) : null}
                      </span>
                      <span className="num text-obliq-chalk">{it.kcal}</span>
                    </li>
                  ))}
                  <li className="mt-1 flex items-baseline gap-3 border-t border-obliq-border pt-1 text-obliq-faint">
                    <span className="flex-1">
                      P {Math.round(d.itens.reduce((s, i) => s + i.protein_g, 0))}g · C{' '}
                      {Math.round(d.itens.reduce((s, i) => s + i.carbs_g, 0))}g · G{' '}
                      {Math.round(d.itens.reduce((s, i) => s + i.fat_g, 0))}g
                    </span>
                    <span className="num">{d.kcal}</span>
                  </li>
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
