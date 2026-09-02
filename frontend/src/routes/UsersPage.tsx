import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import {
  ADMIN_EMAIL,
  AI_CAP,
  fetchTodayIntake,
  fetchUsers,
  setUserPassword,
  type AppUser,
} from '../lib/users'
import { AppShell } from '../components/layout/AppShell'
import { Icon } from '../components/ui/Icon'
import { ApagarHistorico } from '../components/admin/ApagarHistorico'

const OBJETIVO: Record<string, string> = {
  lose: 'perder peso',
  maintain: 'manter peso',
  gain: 'ganhar peso',
}

const ATIVIDADE: Record<string, string> = {
  sedentary: 'sedentário',
  light: 'leve',
  moderate: 'moderado',
  active: 'ativo',
  very_active: 'muito ativo',
}

const SEXO: Record<string, string> = { male: 'masculino', female: 'feminino' }

function dataCurta(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  })
}

function diasDesde(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

type Filtro = 'todos' | 'ativos' | 'incompletos'
type Ordem = 'recentes' | 'ativos' | 'email'

// Medidor fino: mostra proporcao sem virar mais um cartao na tela.
function Medidor({
  valor,
  teto,
  alerta = false,
}: {
  valor: number
  teto: number
  alerta?: boolean
}) {
  const pct = teto > 0 ? Math.min(100, (valor / teto) * 100) : 0
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-obliq-border">
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${
          alerta ? 'bg-obliq-red' : 'bg-obliq-dim'
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function UsersPage() {
  const { user, loading } = useApp()
  const [users, setUsers] = useState<AppUser[] | null>(null)
  const [intake, setIntake] = useState<Record<string, number>>({})
  const [semDiario, setSemDiario] = useState(false)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [ordem, setOrdem] = useState<Ordem>('recentes')
  const [aberto, setAberto] = useState<string | null>(null)

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

  const hoje = new Date().toISOString().split('T')[0]
  const analisesDe = (u: AppUser) =>
    u.analyses_date === hoje ? (u.analyses_today ?? 0) : 0

  const lista = useMemo(() => {
    if (!users) return null
    const q = busca.trim().toLowerCase()

    let r = users.filter((u) => (q ? u.email?.toLowerCase().includes(q) : true))
    if (filtro === 'ativos') r = r.filter((u) => analisesDe(u) > 0 || intake[u.id] > 0)
    if (filtro === 'incompletos') r = r.filter((u) => !u.onboarding_complete)

    const ordenado = [...r]
    if (ordem === 'recentes')
      ordenado.sort((a, b) => b.created_at.localeCompare(a.created_at))
    if (ordem === 'email') ordenado.sort((a, b) => a.email.localeCompare(b.email))
    if (ordem === 'ativos') ordenado.sort((a, b) => analisesDe(b) - analisesDe(a))
    return ordenado
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, busca, filtro, ordem, intake])

  if (loading) return null
  // A tela some pra quem nao e admin. O banco recusa mesmo assim.
  if (!ehAdmin) return <Navigate to="/dashboard" replace />

  const total = users?.length ?? 0
  const analisesHoje = users?.reduce((s, u) => s + analisesDe(u), 0) ?? 0
  const comendoHoje = users?.filter((u) => (intake[u.id] ?? 0) > 0).length ?? 0
  const tetoTotal = total * AI_CAP
  const usoPct = tetoTotal > 0 ? Math.min(100, (analisesHoje / tetoTotal) * 100) : 0

  return (
    <AppShell>
      <header className="flex items-baseline justify-between border-b border-obliq-border pb-5">
        <h1 className="font-display text-2xl font-bold">Usuários</h1>
        <span className="num text-sm text-obliq-faint">{total}</span>
      </header>

      {/* Leitura do dia em uma linha, sem virar tres cartoes iguais. */}
      <section className="mt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="font-mono text-[12px] uppercase tracking-[0.14em] text-obliq-faint">
            consumo de IA hoje
          </span>
          <span className="num text-sm">
            {analisesHoje}
            <span className="text-obliq-faint"> / {tetoTotal}</span>
          </span>
        </div>
        <div className="mt-3">
          <Medidor valor={analisesHoje} teto={tetoTotal} alerta={usoPct > 80} />
        </div>
        <p className="mt-3 font-mono text-[12px] leading-relaxed text-obliq-faint">
          {AI_CAP} análises por conta ao dia · {comendoHoje} de {total} registraram
          refeição hoje
        </p>
      </section>

      {/* Filtros: recortes de verdade, nao decoracao. */}
      <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="flex gap-4" role="group" aria-label="Filtrar">
          {(['todos', 'ativos', 'incompletos'] as Filtro[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFiltro(f)}
              aria-pressed={filtro === f}
              className={`border-b pb-0.5 text-sm transition-colors duration-200 ${
                filtro === f
                  ? 'border-obliq-red text-obliq-chalk'
                  : 'border-transparent text-obliq-faint hover:text-obliq-dim'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <label className="ml-auto flex items-center gap-2 font-mono text-[12px] text-obliq-faint">
          ordenar
          <select
            value={ordem}
            onChange={(e) => setOrdem(e.target.value as Ordem)}
            className="rounded bg-obliq-surface px-2 py-1 font-mono text-[12px] text-obliq-chalk ring-1 ring-obliq-border outline-none focus:ring-obliq-dim"
          >
            <option value="recentes">mais recentes</option>
            <option value="ativos">mais ativos</option>
            <option value="email">e-mail</option>
          </select>
        </label>
      </div>

      <label htmlFor="busca" className="sr-only">
        Buscar por e-mail
      </label>
      <input
        id="busca"
        type="search"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="filtrar por e-mail"
        className="mt-4 min-h-11 w-full rounded-lg bg-obliq-surface px-3.5 py-3 text-obliq-chalk ring-1 ring-obliq-border outline-none transition-colors duration-200 placeholder:text-obliq-faint focus:ring-obliq-dim"
      />

      {erro && (
        <p role="alert" className="mt-4 text-sm text-obliq-red">
          {erro}
        </p>
      )}
      {semDiario && (
        <p className="mt-4 font-mono text-[12px] text-obliq-faint">
          diário indisponível: falta a política de leitura de food_log para o admin.
        </p>
      )}

      {!users && !erro && (
        <div className="mt-6 flex flex-col gap-px">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 animate-pulse bg-obliq-surface" />
          ))}
        </div>
      )}

      {lista && (
        <ul className="mt-6 divide-y divide-obliq-border border-y border-obliq-border">
          {lista.map((u) => {
            const usadas = analisesDe(u)
            const kcal = intake[u.id] ?? 0
            const meta = u.daily_kcal ?? 0
            const on = aberto === u.id
            const ativoHoje = usadas > 0 || kcal > 0

            return (
              <li key={u.id}>
                {/* A linha inteira abre o detalhe. Sem modal, sem botao extra. */}
                <button
                  type="button"
                  onClick={() => setAberto(on ? null : u.id)}
                  aria-expanded={on}
                  className="grid w-full grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 py-3.5 text-left transition-colors duration-200 hover:bg-white/[0.02] md:grid-cols-[auto_1fr_9rem_7rem_auto] md:gap-x-5"
                >
                  <span
                    aria-hidden="true"
                    className={`h-1.5 w-1.5 rounded-full ${
                      ativoHoje ? 'bg-obliq-red' : 'bg-obliq-line'
                    }`}
                  />

                  <span className="truncate text-obliq-chalk">
                    {u.email}
                    {!u.onboarding_complete && (
                      <span className="ml-2 font-mono text-[11px] text-obliq-faint">
                        incompleto
                      </span>
                    )}
                  </span>

                  <span className="col-start-2 md:col-start-auto">
                    <span className="num flex items-baseline justify-between text-[12px] text-obliq-faint">
                      <span>dieta</span>
                      <span className={kcal > meta && meta > 0 ? 'text-obliq-red' : ''}>
                        {kcal}
                        {meta > 0 ? `/${meta}` : ''}
                      </span>
                    </span>
                    <span className="mt-1 block">
                      <Medidor valor={kcal} teto={meta || 1} alerta={meta > 0 && kcal > meta} />
                    </span>
                  </span>

                  <span className="col-start-2 md:col-start-auto">
                    <span className="num flex items-baseline justify-between text-[12px] text-obliq-faint">
                      <span>IA</span>
                      <span className={usadas >= AI_CAP ? 'text-obliq-red' : ''}>
                        {usadas}/{AI_CAP}
                      </span>
                    </span>
                    <span className="mt-1 block">
                      <Medidor valor={usadas} teto={AI_CAP} alerta={usadas >= AI_CAP} />
                    </span>
                  </span>

                  <span
                    className={`hidden text-obliq-faint transition-transform duration-200 md:block ${
                      on ? 'rotate-180' : ''
                    }`}
                  >
                    <Icon name="chevron" className="h-4 w-4" />
                  </span>
                </button>

                {on && (
                  <div className="rise grid gap-6 pb-6 md:grid-cols-[1fr_auto]">
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 font-mono text-[12px] sm:grid-cols-3">
                      {[
                        ['entrou', `${dataCurta(u.created_at)} · ${diasDesde(u.created_at)}d`],
                        ['meta', meta ? `${meta} kcal` : '—'],
                        ['idade', u.age ? `${u.age} anos` : '—'],
                        ['peso', u.weight_kg ? `${u.weight_kg} kg` : '—'],
                        ['altura', u.height_cm ? `${u.height_cm} cm` : '—'],
                        ['sexo', u.sex ? (SEXO[u.sex] ?? u.sex) : '—'],
                        ['rotina', u.activity ? (ATIVIDADE[u.activity] ?? u.activity) : '—'],
                        ['objetivo', u.goal ? (OBJETIVO[u.goal] ?? u.goal) : '—'],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <dt className="text-obliq-faint">{k}</dt>
                          <dd className="mt-0.5 text-obliq-chalk">{v}</dd>
                        </div>
                      ))}
                    </dl>

                    <div className="flex flex-col gap-4 md:items-end">
                      <SenhaAdmin usuario={u} />
                      {/* Acao destrutiva separada do resto, com sua propria linha. */}
                      <div className="flex flex-col gap-2 border-t border-obliq-border pt-4 md:items-end">
                        <ApagarHistorico usuario={u} />
                        <ApagarHistorico
                          usuario={u}
                          alvo="conta"
                          ehVoce={u.email === user?.email}
                          aoApagarConta={() =>
                            setUsers((lista) => lista?.filter((x) => x.id !== u.id) ?? null)
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {lista?.length === 0 && (
        <div className="border-y border-obliq-border py-12 text-center">
          <p className="text-obliq-dim">Nenhuma conta neste recorte.</p>
          <button
            type="button"
            onClick={() => {
              setBusca('')
              setFiltro('todos')
            }}
            className="mt-2 text-sm text-obliq-faint underline decoration-obliq-line underline-offset-4 hover:text-obliq-chalk"
          >
            limpar filtros
          </button>
        </div>
      )}
    </AppShell>
  )
}

// Troca de senha pelo admin. O valor vai direto pra edge function e nao fica em lugar nenhum.
function SenhaAdmin({ usuario }: { usuario: AppUser }) {
  const [aberto, setAberto] = useState(false)
  const [senha, setSenha] = useState('')
  const [estado, setEstado] = useState<'idle' | 'salvando' | 'ok' | 'erro'>('idle')
  const [msg, setMsg] = useState('')

  const salvar = async (e: FormEvent) => {
    e.preventDefault()
    if (senha.length < 8) {
      setEstado('erro')
      setMsg('Use pelo menos 8 caracteres.')
      return
    }
    setEstado('salvando')
    try {
      await setUserPassword(usuario.id, senha)
      setSenha('')
      setEstado('ok')
      setMsg(`Senha de ${usuario.email} alterada.`)
    } catch (err) {
      setEstado('erro')
      setMsg(
        (err as Error).message === 'senha_curta'
          ? 'Use pelo menos 8 caracteres.'
          : 'Não foi possível alterar. Tente de novo.',
      )
    }
  }

  if (!aberto) {
    return (
      <div className="md:text-right">
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="min-h-9 rounded px-2.5 py-1.5 font-mono text-[12px] text-obliq-faint ring-1 ring-obliq-border transition-colors duration-200 hover:text-obliq-chalk hover:ring-obliq-dim"
        >
          definir senha
        </button>
        {estado === 'ok' && (
          <p className="mt-2 font-mono text-[12px] text-obliq-dim">{msg}</p>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={salvar} className="w-full md:max-w-xs">
      <label
        htmlFor={`senha-${usuario.id}`}
        className="font-mono text-[12px] text-obliq-faint"
      >
        nova senha de {usuario.email}
      </label>
      <div className="mt-1.5 flex gap-2">
        <input
          id={`senha-${usuario.id}`}
          type="text"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          value={senha}
          onChange={(e) => {
            setSenha(e.target.value)
            setEstado('idle')
          }}
          placeholder="mínimo 8 caracteres"
          className="num min-w-0 flex-1 rounded bg-obliq-black px-2 py-1.5 text-[12px] text-obliq-chalk ring-1 ring-obliq-border outline-none placeholder:text-obliq-faint focus:ring-obliq-dim"
        />
        <button
          type="submit"
          disabled={estado === 'salvando' || senha.length < 8}
          className="shrink-0 rounded bg-obliq-red px-2.5 py-1.5 font-mono text-[12px] text-white transition-colors duration-200 hover:bg-[#ff1420] disabled:opacity-40"
        >
          {estado === 'salvando' ? 'salvando…' : 'salvar'}
        </button>
      </div>

      {msg && (
        <p
          role={estado === 'erro' ? 'alert' : undefined}
          className={`mt-2 font-mono text-[12px] ${
            estado === 'erro' ? 'text-obliq-red' : 'text-obliq-dim'
          }`}
        >
          {msg}
        </p>
      )}

      <button
        type="button"
        onClick={() => {
          setAberto(false)
          setSenha('')
          setEstado('idle')
          setMsg('')
        }}
        className="mt-2 font-mono text-[12px] text-obliq-faint underline decoration-obliq-line underline-offset-4 hover:text-obliq-chalk"
      >
        cancelar
      </button>
    </form>
  )
}
