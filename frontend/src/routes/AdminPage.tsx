import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { fetchExercises } from '../lib/exercises'
import { MUSCLE_GROUPS, muscleLabel } from '../components/workout/ExerciseCatalog'
import type { CatalogExercise, Difficulty, MuscleGroup } from '../types'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'

const ADMIN_EMAIL = 'victorguilhermevg3@gmail.com'
const BUCKET = 'exercises'

const DIFFICULTIES: { key: Difficulty; label: string }[] = [
  { key: 'iniciante', label: 'Iniciante' },
  { key: 'intermediario', label: 'Intermediario' },
  { key: 'avancado', label: 'Avancado' },
]

type FormData = {
  name: string
  muscle_group: MuscleGroup
  difficulty: Difficulty
  description: string
  muscles_worked: string
  image_url: string
}

const EMPTY_FORM: FormData = {
  name: '',
  muscle_group: 'peito',
  difficulty: 'iniciante',
  description: '',
  muscles_worked: '',
  image_url: '',
}

export function AdminPage() {
  const navigate = useNavigate()
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [exercises, setExercises] = useState<CatalogExercise[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<CatalogExercise | 'new' | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user }, error: e }) => {
      if (!e && user?.email === ADMIN_EMAIL && user?.role === 'authenticated') {
        setAuthorized(true)
        load()
      } else {
        setAuthorized(false)
      }
    })
  }, [])

  const load = () => {
    setLoading(true)
    fetchExercises()
      .then(setExercises)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const openNew = () => { setForm(EMPTY_FORM); setEditing('new'); setError('') }

  const openEdit = (ex: CatalogExercise) => {
    setForm({
      name: ex.name,
      muscle_group: ex.muscle_group as MuscleGroup,
      difficulty: (ex.difficulty ?? 'iniciante') as Difficulty,
      description: ex.description ?? '',
      muscles_worked: ex.muscles_worked ?? '',
      image_url: ex.image_url ?? '',
    })
    setEditing(ex)
    setError('')
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

  const assertAdmin = async (): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email !== ADMIN_EMAIL) { setAuthorized(false); return false }
    return true
  }

  const save = async () => {
    if (!form.name.trim()) { setError('Nome obrigatorio.'); return }
    if (!await assertAdmin()) return
    setSaving(true)
    setError('')
    const payload = {
      name: form.name.trim(),
      muscle_group: form.muscle_group,
      difficulty: form.difficulty,
      description: form.description.trim() || null,
      muscles_worked: form.muscles_worked.trim() || null,
      image_url: form.image_url || null,
    }
    if (editing === 'new') {
      const { error: e } = await supabase.from('exercises').insert(payload)
      if (e) { setError(e.message); setSaving(false); return }
    } else if (editing) {
      const { error: e } = await supabase.from('exercises').update(payload).eq('id', editing.id)
      if (e) { setError(e.message); setSaving(false); return }
    }
    setSaving(false)
    setEditing(null)
    load()
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

  if (authorized === null) return null

  if (!authorized) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-obliq-black px-4">
        <Card className="text-center max-w-sm w-full">
          <p className="text-obliq-red font-bold text-lg">Acesso restrito</p>
          <p className="mt-2 text-sm text-white/50">Esta area e exclusiva para administradores.</p>
          <Button className="mt-4 w-full" onClick={() => navigate('/')}>Voltar</Button>
        </Card>
      </div>
    )
  }

  if (editing) {
    return (
      <div className="min-h-dvh bg-obliq-black px-4 py-6">
        <div className="mx-auto max-w-lg">
          <div className="mb-4 flex items-center justify-between">
            <button type="button" onClick={() => setEditing(null)}
              className="text-sm font-bold uppercase text-white/50 hover:text-white">
              &larr; Voltar
            </button>
            <h1 className="text-sm font-black uppercase tracking-widest text-white/60">
              {editing === 'new' ? 'Novo Exercicio' : 'Editar Exercicio'}
            </h1>
          </div>

          <div className="space-y-4">
            <Card>
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-white/40">Foto</p>
              {form.image_url && (
                <img src={form.image_url} alt="preview"
                  className="mb-3 h-48 w-full rounded-xl object-cover" />
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
                <Input label="Nome do exercicio" placeholder="Ex: Supino reto com barra"
                  value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />

                <div>
                  <p className="mb-2 text-sm font-medium text-white/70">Grupo muscular</p>
                  <div className="flex flex-wrap gap-2">
                    {MUSCLE_GROUPS.map((g) => (
                      <button key={g.key} type="button"
                        onClick={() => setForm((f) => ({ ...f, muscle_group: g.key }))}
                        className={`rounded-full border px-3 py-1.5 text-xs font-bold uppercase transition-all ${
                          form.muscle_group === g.key
                            ? 'border-obliq-red bg-obliq-red/10 text-white shadow-red-glow'
                            : 'border-obliq-border text-white/50 hover:border-white/20'
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
                      <button key={d.key} type="button"
                        onClick={() => setForm((f) => ({ ...f, difficulty: d.key }))}
                        className={`flex-1 rounded-xl border py-2 text-xs font-bold uppercase transition-all ${
                          form.difficulty === d.key
                            ? 'border-obliq-red bg-obliq-red/10 text-white shadow-red-glow'
                            : 'border-obliq-border text-white/50 hover:border-white/20'
                        }`}>
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Input label="Musculos trabalhados"
                  placeholder="Ex: Peitoral maior, triceps, deltoide anterior"
                  value={form.muscles_worked}
                  onChange={(e) => setForm((f) => ({ ...f, muscles_worked: e.target.value }))} />
              </div>
            </Card>

            <Card>
              <p className="mb-2 text-sm font-medium text-white/70">Como realizar</p>
              <textarea value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Descreva a execucao passo a passo..."
                rows={6}
                className="w-full resize-none rounded-xl border border-obliq-border bg-obliq-surface px-4 py-3 text-sm text-white placeholder-white/20 focus:border-obliq-red focus:outline-none" />
            </Card>

            {error && <p className="text-center text-sm font-medium text-obliq-red">{error}</p>}

            <Button onClick={save} disabled={saving} className="w-full">
              {saving ? 'Salvando...' : editing === 'new' ? 'Criar exercicio' : 'Salvar alteracoes'}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-obliq-black px-4 py-6">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black uppercase tracking-wide">Admin</h1>
            <p className="text-xs text-white/40">Catalogo de exercicios</p>
          </div>
          <Button onClick={openNew} className="px-4 py-2 text-xs">+ Novo</Button>
        </div>

        <input type="text" placeholder="Buscar exercicio ou grupo..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="mb-4 w-full rounded-xl border border-obliq-border bg-obliq-surface px-4 py-2.5 text-sm text-white placeholder-white/20 focus:border-obliq-red focus:outline-none" />

        <p className="mb-3 text-xs text-white/30">
          {filtered.length} exercicio{filtered.length !== 1 ? 's' : ''}
        </p>

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
                  <img src={ex.image_url} alt={ex.name}
                    className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-obliq-border text-xl">
                    💪
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{ex.name}</p>
                  <p className="text-xs text-white/40">{muscleLabel(ex.muscle_group)}</p>
                </div>
                <div className="flex gap-3 shrink-0">
                  <button type="button" onClick={() => openEdit(ex)}
                    className="text-xs font-bold text-white/40 hover:text-white">
                    Editar
                  </button>
                  <button type="button" onClick={() => remove(ex.id)}
                    className="text-xs font-bold text-white/40 hover:text-obliq-red">
                    X
                  </button>
                </div>
              </Card>
            ))}
            {filtered.length === 0 && (
              <Card>
                <p className="text-center text-sm text-white/40">Nenhum exercicio encontrado.</p>
              </Card>
            )}
          </div>
        )}

        <button type="button" onClick={() => navigate('/')}
          className="mt-6 w-full text-center text-xs text-white/30 hover:text-white/60">
          &larr; Voltar ao app
        </button>
      </div>
    </div>
  )
}
