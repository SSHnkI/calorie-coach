import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { fetchExercises } from '../lib/exercises'
import { MUSCLE_GROUPS, muscleLabel } from '../components/workout/ExerciseCatalog'
import { WorkoutBuilder } from '../components/workout/WorkoutBuilder'
import { PRESETS, createPresetForUser, type Preset } from '../lib/presets'
import { Sidebar } from '../components/layout/Sidebar'
import { BottomNav } from '../components/layout/BottomNav'
import {
  fetchAllUsers,
  setUserPro,
  fetchPlansForUser,
  copyPlanToUser,
  fetchAllTrainers,
  createTrainer,
  deleteTrainer,
  type AdminUser,
  type Trainer,
} from '../lib/admin'
import type { CatalogExercise, Difficulty, MuscleGroup, WorkoutPlan } from '../types'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'

const ADMIN_EMAIL = 'victorguilhermevg3@gmail.com'
const BUCKET = 'exercises'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'exercicios' | 'usuarios' | 'treinos' | 'treinadores'

type FormData = {
  name: string
  muscle_group: MuscleGroup
  difficulty: Difficulty
  description: string
  muscles_worked: string
  image_url: string
}

const DIFFICULTIES: { key: Difficulty; label: string }[] = [
  { key: 'iniciante', label: 'Iniciante' },
  { key: 'intermediario', label: 'Intermediario' },
  { key: 'avancado', label: 'Avancado' },
]

const EMPTY_FORM: FormData = {
  name: '',
  muscle_group: 'peito',
  difficulty: 'iniciante',
  description: '',
  muscles_worked: '',
  image_url: '',
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function AdminPage() {
  const navigate = useNavigate()
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [tab, setTab] = useState<Tab>('exercicios')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAuthorized(user?.email === ADMIN_EMAIL && user?.role === 'authenticated')
    })
  }, [])

  if (authorized === null) return null

  if (!authorized) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-obliq-black px-4">
        <Card className="text-center max-w-sm w-full">
          <p className="text-obliq-red font-bold text-lg">Acesso restrito</p>
          <p className="mt-2 text-sm text-white/50">Area exclusiva para administradores.</p>
          <Button className="mt-4 w-full" onClick={() => navigate('/')}>Voltar</Button>
        </Card>
      </div>
    )
  }

  const TAB_LABELS: Record<Tab, string> = {
    exercicios: 'Exercicios',
    usuarios: 'Usuarios',
    treinos: 'Treinos',
    treinadores: 'Treinadores',
  }

  return (
    <div className="min-h-dvh bg-obliq-black md:pl-56">
      <Sidebar />
      <BottomNav />
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-obliq-border bg-obliq-black/95 backdrop-blur-md px-4 py-3">
        <div className="mx-auto max-w-lg flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-obliq-red">Admin</p>
            <p className="text-xs text-white/30">{ADMIN_EMAIL}</p>
          </div>
          <button type="button" onClick={() => navigate('/')}
            className="text-xs text-white/30 hover:text-white">Sair</button>
        </div>
        {/* Tabs */}
        <div className="mx-auto max-w-lg mt-3 flex gap-1">
          {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={`flex-1 rounded-lg py-1.5 text-[10px] font-bold uppercase tracking-wide transition-all ${
                tab === t ? 'bg-obliq-red text-white' : 'text-white/40 hover:text-white/70'
              }`}>
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-4 pb-24 md:pb-4">
        {tab === 'exercicios' && <ExerciciosTab />}
        {tab === 'usuarios' && <UsuariosTab />}
        {tab === 'treinos' && <TreinosTab />}
        {tab === 'treinadores' && <TreinadoresTab />}
      </div>
    </div>
  )
}

// ─── Aba Exercicios ───────────────────────────────────────────────────────────

function ExerciciosTab() {
  const [exercises, setExercises] = useState<CatalogExercise[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<CatalogExercise | 'new' | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const load = () => {
    setLoading(true)
    fetchExercises().then(setExercises).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const assertAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    return user?.email === ADMIN_EMAIL
  }

  const openNew = () => { setForm(EMPTY_FORM); setEditing('new'); setError('') }
  const openEdit = (ex: CatalogExercise) => {
    setForm({
      name: ex.name, muscle_group: ex.muscle_group as MuscleGroup,
      difficulty: (ex.difficulty ?? 'iniciante') as Difficulty,
      description: ex.description ?? '', muscles_worked: ex.muscles_worked ?? '',
      image_url: ex.image_url ?? '',
    })
    setEditing(ex); setError('')
  }

  const handleImageUpload = async (file: File) => {
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true })
    if (upErr) { setError('Erro no upload: ' + upErr.message); setUploading(false); return }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    setForm((f) => ({ ...f, image_url: data.publicUrl }))
    setUploading(false)
  }

  const save = async () => {
    if (!form.name.trim()) { setError('Nome obrigatorio.'); return }
    if (!await assertAdmin()) return
    setSaving(true); setError('')
    const payload = {
      name: form.name.trim(), muscle_group: form.muscle_group, difficulty: form.difficulty,
      description: form.description.trim() || null,
      muscles_worked: form.muscles_worked.trim() || null,
      image_url: form.image_url || null,
    }
    if (editing === 'new') {
      const { error: e } = await supabase.from('exercises').insert(payload)
      if (e) { setError(e.message); setSaving(false); return }
    } else if (editing) {
      const { error: e } = await supabase.from('exercises').update(payload).eq('id', (editing as CatalogExercise).id)
      if (e) { setError(e.message); setSaving(false); return }
    }
    setSaving(false); setEditing(null); load()
  }

  const remove = async (id: string) => {
    if (!confirm('Excluir este exercicio?')) return
    if (!await assertAdmin()) return
    await supabase.from('exercises').delete().eq('id', id)
    load()
  }

  const filtered = exercises.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    muscleLabel(e.muscle_group).toLowerCase().includes(search.toLowerCase())
  )

  if (editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setEditing(null)}
            className="text-sm font-bold uppercase text-white/50 hover:text-white">
            &larr; Voltar
          </button>
          <p className="text-xs font-black uppercase tracking-widest text-white/40">
            {editing === 'new' ? 'Novo Exercicio' : 'Editar'}
          </p>
        </div>

        <Card>
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-white/40">Foto</p>
          {form.image_url && (
            <img src={form.image_url} alt="preview" className="mb-3 h-48 w-full rounded-xl object-cover" />
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f) }} />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
            className="w-full rounded-xl border border-dashed border-obliq-border py-3 text-sm text-white/40 hover:border-obliq-red/50 hover:text-white/70 transition-all disabled:opacity-50">
            {uploading ? 'Enviando...' : form.image_url ? 'Trocar foto' : 'Adicionar foto'}
          </button>
          {form.image_url && (
            <button type="button" onClick={() => setForm((f) => ({ ...f, image_url: '' }))}
              className="mt-2 w-full text-xs text-white/30 hover:text-obliq-red">
              Remover foto
            </button>
          )}
        </Card>

        <Card>
          <div className="space-y-4">
            <Input label="Nome" placeholder="Ex: Supino reto com barra"
              value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <div>
              <p className="mb-2 text-sm font-medium text-white/70">Grupo muscular</p>
              <div className="flex flex-wrap gap-2">
                {MUSCLE_GROUPS.map((g) => (
                  <button key={g.key} type="button" onClick={() => setForm((f) => ({ ...f, muscle_group: g.key }))}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold uppercase transition-all ${
                      form.muscle_group === g.key
                        ? 'border-obliq-red bg-obliq-red/10 text-white'
                        : 'border-obliq-border text-white/50'
                    }`}>
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-white/70">Dificuldade</p>
              <div className="flex gap-2">
                {DIFFICULTIES.map((d) => (
                  <button key={d.key} type="button" onClick={() => setForm((f) => ({ ...f, difficulty: d.key }))}
                    className={`flex-1 rounded-xl border py-2 text-xs font-bold uppercase transition-all ${
                      form.difficulty === d.key
                        ? 'border-obliq-red bg-obliq-red/10 text-white'
                        : 'border-obliq-border text-white/50'
                    }`}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <Input label="Musculos trabalhados" placeholder="Ex: Peitoral maior, triceps"
              value={form.muscles_worked}
              onChange={(e) => setForm((f) => ({ ...f, muscles_worked: e.target.value }))} />
          </div>
        </Card>

        <Card>
          <p className="mb-2 text-sm font-medium text-white/70">Como realizar</p>
          <textarea value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Descreva a execucao passo a passo..." rows={6}
            className="w-full resize-none rounded-xl border border-obliq-border bg-obliq-surface px-4 py-3 text-sm text-white placeholder-white/20 focus:border-obliq-red focus:outline-none" />
        </Card>

        {error && <p className="text-center text-sm font-medium text-obliq-red">{error}</p>}
        <Button onClick={save} disabled={saving} className="w-full">
          {saving ? 'Salvando...' : editing === 'new' ? 'Criar exercicio' : 'Salvar'}
        </Button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs text-white/30">{filtered.length} exercicios</p>
        <Button onClick={openNew} className="px-4 py-2 text-xs">+ Novo</Button>
      </div>
      <input type="text" placeholder="Buscar..." value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full rounded-xl border border-obliq-border bg-obliq-surface px-4 py-2.5 text-sm text-white placeholder-white/20 focus:border-obliq-red focus:outline-none" />
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-obliq-border/50" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((ex) => (
            <Card key={ex.id} className="flex items-center gap-3">
              {ex.image_url ? (
                <img src={ex.image_url} alt={ex.name} className="h-12 w-12 shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-obliq-border text-xl">
                  💪
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate text-sm">{ex.name}</p>
                <p className="text-xs text-white/40">{muscleLabel(ex.muscle_group)}</p>
              </div>
              <div className="flex gap-3 shrink-0">
                <button type="button" onClick={() => openEdit(ex)}
                  className="text-xs font-bold text-white/40 hover:text-white">Editar</button>
                <button type="button" onClick={() => remove(ex.id)}
                  className="text-xs font-bold text-white/40 hover:text-obliq-red">X</button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Aba Usuarios ─────────────────────────────────────────────────────────────

function UsuariosTab() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    fetchAllUsers()
      .then(setUsers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const toggle = async (user: AdminUser) => {
    setTogglingId(user.id)
    try {
      await setUserPro(user.id, user.subscription_status !== 'active')
      load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setTogglingId(null)
    }
  }

  const filtered = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.full_name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <input type="text" placeholder="Buscar por email ou nome..." value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full rounded-xl border border-obliq-border bg-obliq-surface px-4 py-2.5 text-sm text-white placeholder-white/20 focus:border-obliq-red focus:outline-none" />

      <p className="mb-3 text-xs text-white/30">{filtered.length} usuario{filtered.length !== 1 ? 's' : ''}</p>

      {error && <p className="mb-3 text-sm text-obliq-red">{error}</p>}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-obliq-border/50" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => {
            const isPro = u.subscription_status === 'active'
            const date = new Date(u.created_at).toLocaleDateString('pt-BR')
            return (
              <Card key={u.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {u.full_name && (
                      <p className="font-bold text-sm truncate">{u.full_name}</p>
                    )}
                    <p className="text-sm text-white/70 truncate">{u.email}</p>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        isPro ? 'bg-obliq-red/20 text-obliq-red' : 'bg-obliq-border text-white/40'
                      }`}>
                        {isPro ? 'PRO' : 'Free'}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        u.onboarding_complete ? 'bg-green-500/20 text-green-400' : 'bg-obliq-border text-white/40'
                      }`}>
                        {u.onboarding_complete ? 'Onboarding OK' : 'Sem onboarding'}
                      </span>
                      <span className="rounded-full bg-obliq-border px-2 py-0.5 text-[10px] text-white/40">
                        {u.plan_count} treino{u.plan_count !== 1 ? 's' : ''}
                      </span>
                      <span className="rounded-full bg-obliq-border px-2 py-0.5 text-[10px] text-white/40">
                        desde {date}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={togglingId === u.id}
                    onClick={() => toggle(u)}
                    className={`shrink-0 rounded-xl border px-3 py-1.5 text-xs font-bold uppercase transition-all disabled:opacity-50 ${
                      isPro
                        ? 'border-obliq-red/50 text-obliq-red hover:bg-obliq-red/10'
                        : 'border-obliq-border text-white/50 hover:border-obliq-red/50 hover:text-white'
                    }`}>
                    {togglingId === u.id ? '...' : isPro ? 'Remover Pro' : 'Dar Pro'}
                  </button>
                </div>
              </Card>
            )
          })}
          {filtered.length === 0 && (
            <Card><p className="text-center text-sm text-white/40">Nenhum usuario encontrado.</p></Card>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Aba Treinos ──────────────────────────────────────────────────────────────

type ClientPlan = WorkoutPlan & { exercise_count: number }

function TreinosTab() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [clientPlans, setClientPlans] = useState<ClientPlan[]>([])
  const [adminPlans, setAdminPlans] = useState<ClientPlan[]>([])
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [editingPlan, setEditingPlan] = useState<WorkoutPlan | 'new' | null>(null)
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [copying, setCopying] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAllUsers()
      .then(setUsers)
      .catch((e) => setError(e.message))
      .finally(() => setLoadingUsers(false))
  }, [])

  const selectUser = async (user: AdminUser) => {
    setSelectedUser(user)
    setEditingPlan(null)
    setLoadingPlans(true)
    try {
      const plans = await fetchPlansForUser(user.id)
      setClientPlans(plans)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoadingPlans(false)
    }
  }

  const loadAdminPlans = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const plans = await fetchPlansForUser(user.id)
    setAdminPlans(plans)
  }

  const openCopyModal = async () => {
    await loadAdminPlans()
    setShowCopyModal(true)
  }

  const doCopyPreset = async (p: Preset) => {
    if (!selectedUser) return
    setCopying(p.id)
    try {
      await createPresetForUser(p, selectedUser.id)
      const plans = await fetchPlansForUser(selectedUser.id)
      setClientPlans(plans)
      setShowCopyModal(false)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCopying(null)
    }
  }

  const doCopy = async (planId: string) => {
    if (!selectedUser) return
    setCopying(planId)
    try {
      await copyPlanToUser(planId, selectedUser.id)
      const plans = await fetchPlansForUser(selectedUser.id)
      setClientPlans(plans)
      setShowCopyModal(false)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCopying(null)
    }
  }

  const deletePlanForUser = async (planId: string) => {
    if (!confirm('Excluir este treino?')) return
    await supabase.from('workout_plans').delete().eq('id', planId)
    if (selectedUser) {
      const plans = await fetchPlansForUser(selectedUser.id)
      setClientPlans(plans)
    }
  }

  const filtered = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.full_name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  // WorkoutBuilder aberto para o cliente
  if (editingPlan !== null && selectedUser) {
    return (
      <div>
        <div className="mb-4 flex items-center justify-between">
          <button type="button" onClick={() => setEditingPlan(null)}
            className="text-sm font-bold uppercase text-white/50 hover:text-white">
            &larr; Voltar
          </button>
          <p className="text-xs text-white/40 truncate max-w-[60%]">{selectedUser.email}</p>
        </div>
        <WorkoutBuilder
          plan={editingPlan === 'new' ? null : editingPlan}
          targetUserId={selectedUser.id}
          onClose={() => setEditingPlan(null)}
          onSaved={async () => {
            setEditingPlan(null)
            const plans = await fetchPlansForUser(selectedUser.id)
            setClientPlans(plans)
          }}
        />
      </div>
    )
  }

  // Lista de treinos do cliente selecionado
  if (selectedUser) {
    return (
      <div>
        <button type="button" onClick={() => setSelectedUser(null)}
          className="mb-4 text-sm font-bold uppercase text-white/50 hover:text-white">
          &larr; Clientes
        </button>

        <Card className="mb-4">
          <p className="font-bold">{selectedUser.full_name ?? selectedUser.email}</p>
          {selectedUser.full_name && (
            <p className="text-xs text-white/40">{selectedUser.email}</p>
          )}
          <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
            selectedUser.subscription_status === 'active'
              ? 'bg-obliq-red/20 text-obliq-red'
              : 'bg-obliq-border text-white/40'
          }`}>
            {selectedUser.subscription_status === 'active' ? 'PRO' : 'Free'}
          </span>
        </Card>

        <div className="mb-4 flex gap-2">
          <Button onClick={() => setEditingPlan('new')} className="flex-1 py-2 text-xs">
            + Novo treino
          </Button>
          <button type="button" onClick={openCopyModal}
            className="flex-1 rounded-xl border border-obliq-border py-2 text-xs font-bold uppercase text-white/50 hover:border-obliq-red/50 hover:text-white transition-all">
            Copiar modelo
          </button>
        </div>

        {error && <p className="mb-3 text-sm text-obliq-red">{error}</p>}

        {loadingPlans ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-obliq-border/50" />
            ))}
          </div>
        ) : clientPlans.length === 0 ? (
          <Card>
            <p className="text-center text-sm text-white/40">Nenhum treino ainda.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {clientPlans.map((plan) => (
              <Card key={plan.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-bold truncate">{plan.name}</p>
                  <p className="text-xs text-white/40">
                    {plan.exercise_count} exercicio{plan.exercise_count !== 1 ? 's' : ''}
                    {plan.goal ? ` · ${plan.goal}` : ''}
                  </p>
                </div>
                <div className="flex gap-3 shrink-0">
                  <button type="button" onClick={() => setEditingPlan(plan as WorkoutPlan)}
                    className="text-xs font-bold text-white/40 hover:text-white">Editar</button>
                  <button type="button" onClick={() => deletePlanForUser(plan.id)}
                    className="text-xs font-bold text-white/40 hover:text-obliq-red">X</button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Modal copiar plano */}
        {showCopyModal && (
          <div className="fixed inset-0 z-50 flex flex-col bg-obliq-black/95 backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-obliq-border px-4 py-3">
              <p className="text-sm font-black uppercase tracking-wide">Copiar meu treino para cliente</p>
              <button type="button" onClick={() => setShowCopyModal(false)}
                className="text-sm font-bold text-white/50 hover:text-white">Fechar</button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-white/40">Modelos prontos</p>
              <div className="mb-5 grid grid-cols-2 gap-2">
                {PRESETS.map((p) => (
                  <button key={p.id} type="button" disabled={copying === p.id}
                    onClick={() => doCopyPreset(p)}
                    className="rounded-xl border border-obliq-border bg-obliq-surface px-3 py-2 text-left text-xs font-bold hover:border-obliq-red/50 transition-all disabled:opacity-50">
                    {copying === p.id ? 'Copiando...' : p.label}
                  </button>
                ))}
              </div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-white/40">Meus treinos</p>
              {adminPlans.length === 0 ? (
                <p className="text-center text-sm text-white/40 pt-2">Voce nao tem treinos modelo.</p>
              ) : (
                <div className="space-y-2">
                  {adminPlans.map((plan) => (
                    <button key={plan.id} type="button"
                      disabled={copying === plan.id}
                      onClick={() => doCopy(plan.id)}
                      className="w-full rounded-xl border border-obliq-border bg-obliq-surface px-4 py-3 text-left hover:border-obliq-red/50 transition-all disabled:opacity-50">
                      <p className="font-bold text-sm">{plan.name}</p>
                      <p className="text-xs text-white/40">
                        {copying === plan.id ? 'Copiando...' : `${plan.exercise_count} exercicios`}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Lista de clientes
  return (
    <div>
      <p className="mb-3 text-xs text-white/40">Selecione um cliente para gerenciar os treinos</p>
      <input type="text" placeholder="Buscar cliente..." value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full rounded-xl border border-obliq-border bg-obliq-surface px-4 py-2.5 text-sm text-white placeholder-white/20 focus:border-obliq-red focus:outline-none" />

      {loadingUsers ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-obliq-border/50" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => (
            <button key={u.id} type="button" onClick={() => selectUser(u)}
              className="w-full rounded-2xl border border-obliq-border bg-obliq-surface px-4 py-3 text-left hover:border-obliq-red/50 transition-all active:scale-[0.98]">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  {u.full_name && <p className="font-bold text-sm truncate">{u.full_name}</p>}
                  <p className="text-sm text-white/60 truncate">{u.email}</p>
                  <p className="text-xs text-white/30 mt-0.5">
                    {u.plan_count} treino{u.plan_count !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {u.subscription_status === 'active' && (
                    <span className="rounded-full bg-obliq-red/20 px-2 py-0.5 text-[10px] font-bold uppercase text-obliq-red">
                      PRO
                    </span>
                  )}
                  <span className="text-white/30">›</span>
                </div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <Card><p className="text-center text-sm text-white/40">Nenhum cliente encontrado.</p></Card>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Aba Treinadores ──────────────────────────────────────────────────────────

function TreinadoresTab() {
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', code: '' })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    fetchAllTrainers()
      .then(setTrainers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.code.trim()) {
      setError('Preencha todos os campos.')
      return
    }
    setSaving(true); setError('')
    try {
      await createTrainer(form.name, form.email, form.code)
      setForm({ name: '', email: '', code: '' })
      setShowForm(false)
      load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir treinador ${name}? Os clientes serão desvinculados.`)) return
    setDeletingId(id)
    try {
      await deleteTrainer(id)
      load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {!showForm ? (
        <Button onClick={() => setShowForm(true)} className="w-full py-2 text-xs">
          + Novo treinador
        </Button>
      ) : (
        <Card>
          <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">
            Novo Treinador
          </p>
          <div className="space-y-3">
            <Input
              label="Nome"
              placeholder="Cleber Silva"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Input
              label="Email (para login)"
              type="email"
              placeholder="cleber@obliq.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <Input
              label="Código único"
              placeholder="CLEBER2024"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
            />
          </div>
          {error && <p className="mt-2 text-xs text-obliq-red">{error}</p>}
          <div className="mt-4 flex gap-2">
            <Button onClick={handleCreate} disabled={saving} className="flex-1 text-xs">
              {saving ? 'Criando...' : 'Criar'}
            </Button>
            <button type="button" onClick={() => { setShowForm(false); setError('') }}
              className="flex-1 rounded-xl border border-obliq-border py-2 text-xs font-bold uppercase text-white/50 hover:text-white transition-all">
              Cancelar
            </button>
          </div>
        </Card>
      )}

      {!showForm && error && <p className="text-sm text-obliq-red">{error}</p>}

      <p className="text-xs text-white/30">{trainers.length} treinador{trainers.length !== 1 ? 'es' : ''}</p>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-obliq-border/50" />
          ))}
        </div>
      ) : trainers.length === 0 ? (
        <Card className="text-center py-6">
          <p className="text-white/30 text-sm">Nenhum treinador cadastrado.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {trainers.map((t) => (
            <Card key={t.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm">{t.name}</p>
                    {t.user_id && (
                      <span className="rounded-full bg-green-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-green-400">
                        Ativo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/40 truncate">{t.email}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="rounded-md border border-obliq-border bg-obliq-surface px-2 py-0.5 font-mono text-[10px] font-black tracking-widest text-white/60">
                      {t.code}
                    </span>
                    <span className="text-[10px] text-white/30">
                      {t.client_count ?? 0} cliente{(t.client_count ?? 0) !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={deletingId === t.id}
                  onClick={() => handleDelete(t.id, t.name)}
                  className="shrink-0 rounded-xl border border-obliq-border px-3 py-1.5 text-xs font-bold uppercase text-white/30 hover:border-obliq-red/50 hover:text-obliq-red transition-all disabled:opacity-50">
                  {deletingId === t.id ? '...' : 'Excluir'}
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
