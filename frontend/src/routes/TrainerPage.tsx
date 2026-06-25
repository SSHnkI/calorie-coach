import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { WorkoutBuilder } from '../components/workout/WorkoutBuilder'
import { Sidebar } from '../components/layout/Sidebar'
import { BottomNav } from '../components/layout/BottomNav'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import type { WorkoutPlan } from '../types'

// ─── Types ────────────────────────────────────────────────────────────────────

type Client = {
  id: string
  email: string
  full_name: string | null
  subscription_status: string
  daily_kcal: number | null
  onboarding_complete: boolean
}

type PlanRow = WorkoutPlan & { exercise_count: number }

type LogEntry = {
  id: string
  completed_at: string
  plan_name: string | null
  sets: number
  volume: number
}

type Tab = 'clientes' | 'relatorio'

// ─── Main ─────────────────────────────────────────────────────────────────────

export function TrainerPage() {
  const { isTrainer, trainerData, loading } = useApp()
  const navigate = useNavigate()

  if (loading) return null

  if (!isTrainer || !trainerData) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-obliq-black px-4">
        <Card className="text-center max-w-sm w-full">
          <p className="text-obliq-red font-bold text-lg">Acesso restrito</p>
          <p className="mt-2 text-sm text-white/50">Área exclusiva para treinadores.</p>
          <Button className="mt-4 w-full" onClick={() => navigate('/')}>Voltar</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-obliq-black md:pl-56">
      <Sidebar />
      <BottomNav />
      <div className="sticky top-0 z-40 border-b border-obliq-border bg-obliq-black/95 backdrop-blur-md px-4 py-3">
        <div className="mx-auto max-w-lg flex items-center justify-between pr-16 md:pr-0">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-obliq-red">Trainer</p>
            <p className="text-sm font-black">{trainerData.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-obliq-surface border border-obliq-border px-2 py-1 text-[10px] font-black font-mono tracking-widest text-white/50">
              {trainerData.code}
            </span>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-lg px-4 py-4 pb-24 md:pb-4">
        <TrainerDashboard trainerId={trainerData.id} />
      </div>
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function TrainerDashboard({ trainerId }: { trainerId: string }) {
  const [clients, setClients] = useState<Client[]>([])
  const [loadingClients, setLoadingClients] = useState(true)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [tab, setTab] = useState<Tab>('clientes')

  const loadClients = () => {
    setLoadingClients(true)
    supabase
      .from('profiles')
      .select('id, email, subscription_status, daily_kcal, onboarding_complete')
      .eq('trainer_id', trainerId)
      .order('email', { ascending: true })
      .then(({ data }) => {
        setClients((data ?? []) as Client[])
        setLoadingClients(false)
      })
  }

  useEffect(loadClients, [trainerId])

  if (selectedClient) {
    return (
      <ClientDetail
        client={selectedClient}
        onBack={() => { setSelectedClient(null); loadClients() }}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1">
        {(['clientes', 'relatorio'] as Tab[]).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-1.5 text-xs font-bold uppercase tracking-wide transition-all ${
              tab === t ? 'bg-obliq-red text-white' : 'text-white/40 hover:text-white/70'
            }`}>
            {t === 'clientes' ? 'Clientes' : 'Relatório Geral'}
          </button>
        ))}
      </div>

      {tab === 'clientes' && (
        <>
          {loadingClients ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-16 animate-pulse rounded-2xl bg-obliq-border/50" />)}
            </div>
          ) : clients.length === 0 ? (
            <Card className="text-center py-8">
              <p className="text-white/30 text-sm">Nenhum cliente vinculado ainda.</p>
              <p className="text-white/20 text-xs mt-1">Compartilhe seu código para que se cadastrem.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {clients.map(c => (
                <button key={c.id} type="button" onClick={() => setSelectedClient(c)}
                  className="w-full text-left rounded-2xl border border-obliq-border bg-obliq-surface px-4 py-3 hover:border-obliq-red/50 transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm">{c.full_name ?? c.email}</p>
                      {c.full_name && <p className="text-xs text-white/40">{c.email}</p>}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {c.daily_kcal && (
                        <span className="text-white/40">{c.daily_kcal} kcal</span>
                      )}
                      <span className="text-white/30">›</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'relatorio' && <GeneralReport trainerId={trainerId} clients={clients} />}
    </div>
  )
}

// ─── Detalhe do cliente ───────────────────────────────────────────────────────

function ClientDetail({ client, onBack }: { client: Client; onBack: () => void }) {
  const [plans, setPlans] = useState<PlanRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPlan, setEditingPlan] = useState<WorkoutPlan | null | 'new'>('new' as any)
  const [showBuilder, setShowBuilder] = useState(false)
  const [kcal, setKcal] = useState(String(client.daily_kcal ?? ''))
  const [savingKcal, setSavingKcal] = useState(false)
  const [kcalMsg, setKcalMsg] = useState('')
  const [subTab, setSubTab] = useState<'treinos' | 'historico'>('treinos')

  const loadPlans = () => {
    setLoading(true)
    supabase
      .from('workout_plans')
      .select('id, user_id, name, goal, created_at, workout_exercises(count)')
      .eq('user_id', client.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setPlans(
          (data ?? []).map((p: any) => ({
            ...p,
            exercise_count: p.workout_exercises?.[0]?.count ?? 0,
          }))
        )
        setLoading(false)
      })
  }

  useEffect(loadPlans, [client.id])

  const deletePlan = async (planId: string) => {
    if (!confirm('Excluir este treino?')) return
    await supabase.from('workout_exercises').delete().eq('plan_id', planId)
    await supabase.from('workout_plans').delete().eq('id', planId)
    loadPlans()
  }

  const saveKcal = async () => {
    setSavingKcal(true)
    setKcalMsg('')
    const val = Number(kcal)
    if (!val || val < 500 || val > 10000) {
      setKcalMsg('Valor inválido (500–10000)')
      setSavingKcal(false)
      return
    }
    const { error } = await supabase.from('profiles').update({ daily_kcal: val }).eq('id', client.id)
    setSavingKcal(false)
    setKcalMsg(error ? 'Erro ao salvar.' : 'Meta salva!')
    setTimeout(() => setKcalMsg(''), 2000)
  }

  if (showBuilder) {
    return (
      <WorkoutBuilder
        plan={editingPlan === 'new' ? null : editingPlan as WorkoutPlan}
        onClose={() => setShowBuilder(false)}
        onSaved={() => { setShowBuilder(false); loadPlans() }}
        targetUserId={client.id}
      />
    )
  }

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack}
        className="text-sm font-bold uppercase text-white/50 hover:text-white">
        ← Voltar
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black">{client.full_name ?? client.email}</h2>
          {client.full_name && <p className="text-xs text-white/40">{client.email}</p>}
        </div>
      </div>

      {/* Meta kcal */}
      <Card>
        <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">Meta de Kcal/dia</p>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="2000"
            value={kcal}
            onChange={(e) => setKcal(e.target.value)}
            className="flex-1"
          />
          <Button onClick={saveKcal} disabled={savingKcal} className="shrink-0 px-4 text-xs">
            {savingKcal ? '...' : 'Salvar'}
          </Button>
        </div>
        {kcalMsg && (
          <p className={`mt-1 text-xs ${kcalMsg.includes('Erro') ? 'text-obliq-red' : 'text-green-400'}`}>
            {kcalMsg}
          </p>
        )}
      </Card>

      {/* Sub-tabs */}
      <div className="flex gap-1">
        {(['treinos', 'historico'] as const).map((t) => (
          <button key={t} type="button" onClick={() => setSubTab(t)}
            className={`flex-1 rounded-lg py-1.5 text-xs font-bold uppercase tracking-wide transition-all ${
              subTab === t ? 'bg-obliq-red text-white' : 'text-white/40 hover:text-white/70'
            }`}>
            {t === 'treinos' ? 'Treinos' : 'Histórico'}
          </button>
        ))}
      </div>

      {subTab === 'treinos' && (
        <div className="space-y-3">
          {loading ? (
            <div className="space-y-2">
              {[1,2].map(i => <div key={i} className="h-16 animate-pulse rounded-2xl bg-obliq-border/50" />)}
            </div>
          ) : plans.length === 0 ? (
            <Card className="text-center py-6">
              <p className="text-white/30 text-sm">Nenhum treino criado.</p>
            </Card>
          ) : (
            plans.map(p => (
              <Card key={p.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold">{p.name}</p>
                    <p className="text-xs text-white/40">{p.exercise_count} exercícios · {p.goal ?? 'sem objetivo'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setEditingPlan(p as WorkoutPlan); setShowBuilder(true) }}
                      className="text-xs text-white/40 hover:text-white">Editar</button>
                    <button type="button" onClick={() => deletePlan(p.id)}
                      className="text-xs text-white/40 hover:text-obliq-red">Excluir</button>
                  </div>
                </div>
              </Card>
            ))
          )}
          <Button variant="secondary" className="w-full"
            onClick={() => { setEditingPlan('new' as any); setShowBuilder(true) }}>
            + Novo treino
          </Button>
        </div>
      )}

      {subTab === 'historico' && <ClientHistory clientId={client.id} />}
    </div>
  )
}

// ─── Histórico do cliente ─────────────────────────────────────────────────────

function ClientHistory({ clientId }: { clientId: string }) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('workout_logs')
      .select('id, completed_at, plan:workout_plans(name)')
      .eq('user_id', clientId)
      .order('completed_at', { ascending: false })
      .limit(30)
      .then(async ({ data: rawLogs }) => {
        if (!rawLogs || rawLogs.length === 0) { setLogs([]); setLoading(false); return }
        const ids = rawLogs.map((l: any) => l.id)
        const { data: sets } = await supabase
          .from('exercise_sets')
          .select('workout_log_id, weight_kg, reps')
          .in('workout_log_id', ids)

        const agg: Record<string, { volume: number; sets: number }> = {}
        for (const s of (sets ?? []) as any[]) {
          const a = (agg[s.workout_log_id] ??= { volume: 0, sets: 0 })
          a.sets += 1
          a.volume += (s.weight_kg ?? 0) * (s.reps ?? 0)
        }

        setLogs(rawLogs.map((l: any) => ({
          id: l.id,
          completed_at: l.completed_at,
          plan_name: l.plan?.name ?? null,
          sets: agg[l.id]?.sets ?? 0,
          volume: Math.round(agg[l.id]?.volume ?? 0),
        })))
        setLoading(false)
      })
  }, [clientId])

  if (loading) return <div className="h-20 animate-pulse rounded-2xl bg-obliq-border/50" />

  if (logs.length === 0) {
    return (
      <Card className="text-center py-6">
        <p className="text-white/30 text-sm">Sem histórico de treinos.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {logs.map(l => (
        <Card key={l.id}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-sm">{l.plan_name ?? 'Treino livre'}</p>
              <p className="text-xs text-white/40">
                {new Date(l.completed_at).toLocaleDateString('pt-BR')} · {l.sets} séries
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-black">{l.volume.toLocaleString('pt-BR')}</p>
              <p className="text-[10px] text-white/30">kg volume</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

// ─── Relatório Geral ──────────────────────────────────────────────────────────

function GeneralReport({ clients }: { trainerId: string; clients: Client[] }) {
  const [stats, setStats] = useState<{ clientId: string; lastWorkout: string | null; totalSessions: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (clients.length === 0) { setLoading(false); return }
    const ids = clients.map(c => c.id)
    supabase
      .from('workout_logs')
      .select('user_id, completed_at')
      .in('user_id', ids)
      .order('completed_at', { ascending: false })
      .then(({ data }) => {
        const map: Record<string, { last: string | null; count: number }> = {}
        for (const log of (data ?? []) as any[]) {
          if (!map[log.user_id]) map[log.user_id] = { last: log.completed_at, count: 0 }
          map[log.user_id].count += 1
        }
        setStats(clients.map(c => ({
          clientId: c.id,
          lastWorkout: map[c.id]?.last ?? null,
          totalSessions: map[c.id]?.count ?? 0,
        })))
        setLoading(false)
      })
  }, [clients])

  if (loading) return <div className="h-32 animate-pulse rounded-2xl bg-obliq-border/50" />

  if (clients.length === 0) {
    return (
      <Card className="text-center py-8">
        <p className="text-white/30 text-sm">Sem clientes ainda.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {clients.map(c => {
        const s = stats.find(x => x.clientId === c.id)
        return (
          <Card key={c.id}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-sm">{c.full_name ?? c.email}</p>
                <p className="text-xs text-white/40">
                  {s?.lastWorkout
                    ? `Último treino: ${new Date(s.lastWorkout).toLocaleDateString('pt-BR')}`
                    : 'Sem treinos registrados'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-black">{s?.totalSessions ?? 0}</p>
                <p className="text-[10px] text-white/30">sessões</p>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
