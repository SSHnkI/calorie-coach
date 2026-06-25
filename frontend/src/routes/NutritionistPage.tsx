import { useCallback, useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import {
  deleteMealPlan,
  fetchMealPlansForUser,
  type MealPlanSummary,
} from '../lib/nutrition'
import { AppShell } from '../components/layout/AppShell'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { DietBuilder } from '../components/nutrition/DietBuilder'

type Client = { id: string; email: string; daily_kcal: number | null }

export function NutritionistPage() {
  const { isNutri, trainerData, loading } = useApp()
  const [clients, setClients] = useState<Client[]>([])
  const [loadingClients, setLoadingClients] = useState(true)
  const [selected, setSelected] = useState<Client | null>(null)

  const proId = trainerData?.id

  useEffect(() => {
    if (!proId) return
    supabase
      .from('profiles')
      .select('id, email, daily_kcal')
      .eq('professional_id', proId)
      .order('email')
      .then(({ data }) => {
        setClients((data ?? []) as Client[])
        setLoadingClients(false)
      })
  }, [proId])

  if (loading) return null
  if (!isNutri || !trainerData) {
    return (
      <AppShell>
        <Card className="text-center">
          <p className="text-sm text-white/50">Acesso restrito a nutricionistas.</p>
        </Card>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="mb-4 flex items-center justify-between pr-24 md:pr-0">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-obliq-red">Nutricionista</p>
          <p className="text-sm font-black">{trainerData.name}</p>
        </div>
        <span className="rounded-md border border-obliq-border bg-obliq-surface px-2 py-1 font-mono text-[10px] font-black tracking-widest text-white/50">
          {trainerData.code}
        </span>
      </div>

      {selected ? (
        <ClientDiets client={selected} onBack={() => setSelected(null)} />
      ) : loadingClients ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-obliq-border/50" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <Card>
          <p className="text-center text-sm text-white/40">
            Nenhum cliente vinculado. Passe seu código para os alunos.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {clients.map((c) => (
            <Card key={c.id}>
              <button type="button" onClick={() => setSelected(c)} className="w-full text-left">
                <p className="font-bold text-sm">{c.email}</p>
                <p className="text-xs text-white/40">Meta: {c.daily_kcal ?? '—'} kcal/dia</p>
              </button>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  )
}

function ClientDiets({ client, onBack }: { client: Client; onBack: () => void }) {
  const [plans, setPlans] = useState<MealPlanSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<MealPlanSummary | 'new' | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetchMealPlansForUser(client.id)
      .then(setPlans)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [client.id])

  useEffect(() => {
    load()
  }, [load])

  if (editing) {
    return (
      <DietBuilder
        plan={editing === 'new' ? null : editing}
        targetUserId={client.id}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null)
          load()
        }}
      />
    )
  }

  return (
    <div>
      <button type="button" onClick={onBack} className="mb-4 text-sm font-bold uppercase text-white/50 hover:text-white">
        ← Clientes
      </button>
      <Card className="mb-4">
        <p className="font-bold">{client.email}</p>
        <p className="text-xs text-white/40">Meta: {client.daily_kcal ?? '—'} kcal/dia</p>
      </Card>

      <Button onClick={() => setEditing('new')} className="mb-4 w-full">
        + Nova dieta
      </Button>

      {loading ? (
        <div className="h-16 animate-pulse rounded-2xl bg-obliq-border/50" />
      ) : plans.length === 0 ? (
        <Card><p className="text-center text-sm text-white/40">Nenhuma dieta criada.</p></Card>
      ) : (
        <div className="space-y-2">
          {plans.map((p) => (
            <Card key={p.id}>
              <div className="flex items-center justify-between gap-3">
                <button type="button" onClick={() => setEditing(p)} className="flex-1 text-left font-bold">
                  {p.name}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (confirm('Excluir dieta?')) {
                      await deleteMealPlan(p.id)
                      load()
                    }
                  }}
                  className="text-xs font-bold uppercase text-white/40 hover:text-obliq-red"
                >
                  Excluir
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
