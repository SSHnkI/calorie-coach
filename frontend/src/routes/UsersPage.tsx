import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import {
  ADMIN_EMAIL,
  AI_CAP,
  fetchTodayIntake,
  fetchUsers,
  sendPasswordReset,
  type AppUser,
} from '../lib/users'
import { AppShell } from '../components/layout/AppShell'
import { Badge } from '../components/ui/Badge'

const OBJETIVO: Record<string, string> = {
  lose: 'perder',
  maintain: 'manter',
  gain: 'ganhar',
}

function dataCurta(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  })
}

type EstadoEnvio = 'idle' | 'confirmar' | 'enviando' | 'enviado' | 'erro'

export function UsersPage() {
  const { user, loading } = useApp()
  const [users, setUsers] = useState<AppUser[] | null>(null)
  const [intake, setIntake] = useState<Record<string, number>>({})
  const [semDiario, setSemDiario] = useState(false)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [envio, setEnvio] = useState<Record<string, EstadoEnvio>>({})

  const ehAdmin = user?.email === ADMIN_EMAIL

  useEffect(() => {
    if (!ehAdmin) return
    fetchUsers()
      .then(setUsers)
      .catch(() => setErro('Não foi possível carregar a lista. Recarregue a página.'))
    fetchTodayIntake()
      .then(setIntake)
      .catch(() => setSemDiario(true))
  }, [ehAdmin])

  const filtrados = useMemo(() => {
    if (!users) return null
    const q = busca.trim().toLowerCase()
    return q ? users.filter((u) => u.email?.toLowerCase().includes(q)) : users
  }, [users, busca])

  const hoje = new Date().toISOString().split('T')[0]

  const analisesDe = (u: AppUser) =>
    u.analyses_date === hoje ? (u.analyses_today ?? 0) : 0

  const enviarReset = async (u: AppUser) => {
    if (envio[u.id] !== 'confirmar') {
      setEnvio((e) => ({ ...e, [u.id]: 'confirmar' }))
      return
    }
    setEnvio((e) => ({ ...e, [u.id]: 'enviando' }))
    try {
      await sendPasswordReset(u.email)
      setEnvio((e) => ({ ...e, [u.id]: 'enviado' }))
    } catch {
      setEnvio((e) => ({ ...e, [u.id]: 'erro' }))
    }
  }

  if (loading) return null
  // A tela some pra quem nao e admin. O banco recusa mesmo assim.
  if (!ehAdmin) return <Navigate to="/dashboard" replace />

  const total = users?.length ?? 0
  const completos = users?.filter((u) => u.onboarding_complete).length ?? 0
  const analisesHoje = users?.reduce((s, u) => s + analisesDe(u), 0) ?? 0
  const tetoTotal = total * AI_CAP
  const usoPct = tetoTotal > 0 ? Math.min(100, (analisesHoje / tetoTotal) * 100) : 0

  return (
    <AppShell showNav={false}>
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-2xl font-bold">Usuários</h1>
        <Badge>admin</Badge>
      </div>

      <dl className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-obliq-border ring-1 ring-obliq-border">
        {[
          ['contas', total],
          ['cadastro completo', completos],
          ['análises hoje', analisesHoje],
        ].map(([rotulo, valor]) => (
          <div key={rotulo as string} className="bg-obliq-surface p-4">
            <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-obliq-faint">
              {rotulo}
            </dt>
            <dd className="num mt-1 text-2xl font-medium">{valor}</dd>
          </div>
        ))}
      </dl>

      {/* Consumo de IA contra o teto do dia. */}
      <section className="mt-4 rounded-xl bg-obliq-surface p-4 ring-1 ring-obliq-border">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-obliq-faint">
            consumo de IA hoje
          </span>
          <span className="num text-sm">
            {analisesHoje}
            <span className="text-obliq-faint"> / {tetoTotal}</span>
          </span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-obliq-border">
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${
              usoPct > 80 ? 'bg-obliq-red' : 'bg-obliq-chalk'
            }`}
            style={{ width: `${usoPct}%` }}
          />
        </div>
        <p className="mt-3 font-mono text-[11px] leading-relaxed text-obliq-faint">
          teto de {AI_CAP} análises por conta ao dia, definido na função analyze-food.
          o teto total sobe junto com o número de contas.
        </p>
      </section>

      <label htmlFor="busca" className="sr-only">
        Buscar por e-mail
      </label>
      <input
        id="busca"
        type="search"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="filtrar por e-mail"
        className="mt-6 min-h-11 w-full rounded-lg bg-obliq-surface px-3.5 py-3 text-obliq-chalk ring-1 ring-obliq-border outline-none transition-colors duration-200 placeholder:text-obliq-faint focus:ring-obliq-dim"
      />

      {erro && (
        <p role="alert" className="mt-4 text-sm text-obliq-red">
          {erro}
        </p>
      )}

      {semDiario && (
        <p className="mt-4 font-mono text-[11px] leading-relaxed text-obliq-faint">
          diário alimentar indisponível: falta a política de leitura de food_log para o
          admin.
        </p>
      )}

      {!users && !erro && (
        <div className="mt-6 space-y-px">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded bg-obliq-surface" />
          ))}
        </div>
      )}

      {filtrados && (
        <>
          <ul className="mt-6 divide-y divide-obliq-border border-y border-obliq-border">
            {filtrados.map((u, i) => {
              const usadas = analisesDe(u)
              const kcal = intake[u.id]
              const estado = envio[u.id] ?? 'idle'

              return (
                <li
                  key={u.id}
                  className="rise py-4"
                  style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
                >
                  <div className="flex items-baseline gap-3">
                    <span className="truncate text-obliq-chalk">{u.email}</span>
                    <span className="leader" aria-hidden="true" />
                    <span className="num shrink-0 text-sm text-obliq-chalk">
                      {u.daily_kcal ?? '—'}
                      <span className="text-obliq-faint"> meta</span>
                    </span>
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-obliq-faint">
                    <span>entrou {dataCurta(u.created_at)}</span>
                    {u.onboarding_complete ? (
                      <span>
                        {u.age ?? '?'}a · {u.weight_kg ?? '?'}kg · {u.height_cm ?? '?'}cm
                        {u.goal ? ` · ${OBJETIVO[u.goal] ?? u.goal}` : ''}
                      </span>
                    ) : (
                      <span className="text-obliq-red">cadastro incompleto</span>
                    )}
                    {kcal != null && <span>comeu {kcal} kcal hoje</span>}
                    <span className={usadas >= AI_CAP ? 'text-obliq-red' : undefined}>
                      IA {usadas}/{AI_CAP}
                    </span>
                  </div>

                  <div className="mt-2.5">
                    {estado === 'enviado' ? (
                      <span className="font-mono text-[11px] text-obliq-dim">
                        link de senha enviado para {u.email}
                      </span>
                    ) : estado === 'erro' ? (
                      <span className="font-mono text-[11px] text-obliq-red">
                        falhou, o Supabase limita e-mails por hora
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => enviarReset(u)}
                        disabled={estado === 'enviando'}
                        className={`rounded px-2 py-1 font-mono text-[11px] ring-1 transition-colors duration-200 disabled:opacity-40 ${
                          estado === 'confirmar'
                            ? 'text-obliq-chalk ring-obliq-red'
                            : 'text-obliq-faint ring-obliq-border hover:text-obliq-chalk hover:ring-obliq-dim'
                        }`}
                      >
                        {estado === 'enviando'
                          ? 'enviando…'
                          : estado === 'confirmar'
                            ? 'confirmar envio'
                            : 'enviar link de senha'}
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>

          {filtrados.length === 0 && (
            <p className="mt-6 text-center text-sm text-obliq-dim">
              Nenhum e-mail corresponde a “{busca}”.
            </p>
          )}
        </>
      )}
    </AppShell>
  )
}
