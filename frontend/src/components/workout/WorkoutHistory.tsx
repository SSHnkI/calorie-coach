import { useEffect, useMemo, useState } from 'react'
import { fetchHistory, type SessionSummary } from '../../lib/workouts'
import { Card } from '../ui/Card'

const DAY = 86400000

function inLastDays(date: string, days: number) {
  return Date.now() - new Date(date).getTime() <= days * DAY
}

function fmt(date: string) {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  })
}

type Period = 'all' | 'week' | 'month'

export function WorkoutHistory() {
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [period, setPeriod] = useState<Period>('all')

  useEffect(() => {
    let active = true
    fetchHistory()
      .then((d) => active && setSessions(d))
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  const week = useMemo(() => sessions.filter((s) => inLastDays(s.date, 7)), [sessions])
  const month = useMemo(() => sessions.filter((s) => inLastDays(s.date, 30)), [sessions])

  const sum = (arr: SessionSummary[]) => arr.reduce((n, s) => n + s.volume, 0)

  const filtered = useMemo(() => {
    if (period === 'week') return week
    if (period === 'month') return month
    return sessions
  }, [period, sessions, week, month])

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

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3">
        <Card>
          <p className="text-[10px] font-black uppercase tracking-widest text-white/30">
            Esta semana
          </p>
          <p className="mt-1 text-2xl font-black tabular-nums">{week.length}</p>
          <p className="text-xs text-white/40">
            treinos · {sum(week).toLocaleString('pt-BR')} kg vol
          </p>
        </Card>
        <Card>
          <p className="text-[10px] font-black uppercase tracking-widest text-white/30">
            Este mês
          </p>
          <p className="mt-1 text-2xl font-black tabular-nums">{month.length}</p>
          <p className="text-xs text-white/40">
            treinos · {sum(month).toLocaleString('pt-BR')} kg vol
          </p>
        </Card>
      </div>

      <div className="mb-4 flex gap-2">
        {(
          [
            { key: 'all', label: 'Tudo' },
            { key: 'week', label: '7 dias' },
            { key: 'month', label: '30 dias' },
          ] as { key: Period; label: string }[]
        ).map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPeriod(p.key)}
            className={`rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-all ${
              period === p.key
                ? 'border-obliq-red bg-obliq-red/10 text-white shadow-red-glow'
                : 'border-obliq-border text-white/50'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <p className="text-center text-sm text-white/40">Nenhum treino neste período.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <Card key={s.id}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold">{s.planName ?? 'Treino'}</h3>
                  <p className="text-xs text-white/40">{fmt(s.date)}</p>
                </div>
                <div className="text-right">
                  <p className="font-black tabular-nums text-obliq-red">
                    {s.volume.toLocaleString('pt-BR')} kg
                  </p>
                  <p className="text-[10px] uppercase tracking-widest text-white/30">
                    {s.sets} série{s.sets === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
