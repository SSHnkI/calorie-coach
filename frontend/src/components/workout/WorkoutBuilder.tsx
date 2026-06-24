import { useEffect, useMemo, useState } from 'react'
import { fetchExercises } from '../../lib/exercises'
import { fetchPlanExercises, savePlan } from '../../lib/workouts'
import type { CatalogExercise, MuscleGroup, WorkoutGoal, WorkoutPlan } from '../../types'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Input } from '../ui/Input'
import { MUSCLE_GROUPS, muscleLabel } from './ExerciseCatalog'

type Row = {
  key: string
  exercise_id: string
  name: string
  muscle_group: string
  sets: number
  reps: string
  rest_seconds: number
  target_weight_kg: number | null
  notes: string
}

const GOALS: { key: WorkoutGoal; label: string }[] = [
  { key: 'hipertrofia', label: 'Hipertrofia' },
  { key: 'emagrecimento', label: 'Emagrecimento' },
  { key: 'condicionamento', label: 'Condicionamento' },
]

export function WorkoutBuilder({
  plan,
  onClose,
  onSaved,
  targetUserId,
}: {
  plan: WorkoutPlan | null
  onClose: () => void
  onSaved: () => void
  targetUserId?: string
}) {
  const [name, setName] = useState(plan?.name ?? '')
  const [goal, setGoal] = useState<WorkoutGoal | null>(plan?.goal ?? null)
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(!!plan)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    if (!plan) return
    let active = true
    fetchPlanExercises(plan.id)
      .then((data) => {
        if (!active) return
        setRows(
          data.map((e) => ({
            key: e.id,
            exercise_id: e.exercise_id,
            name: e.exercise?.name ?? 'Exercicio',
            muscle_group: e.exercise?.muscle_group ?? '',
            sets: e.sets,
            reps: e.reps,
            rest_seconds: e.rest_seconds,
            target_weight_kg: e.target_weight_kg,
            notes: e.notes ?? '',
          })),
        )
      })
      .catch(() => active && setError('Falha ao carregar o treino.'))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [plan])

  const addExercise = (ex: CatalogExercise) => {
    setRows((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        exercise_id: ex.id,
        name: ex.name,
        muscle_group: ex.muscle_group,
        sets: 3,
        reps: '12',
        rest_seconds: 60,
        target_weight_kg: null,
        notes: '',
      },
    ])
    setPickerOpen(false)
  }

  const updateRow = (key: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)))

  const removeRow = (key: string) =>
    setRows((prev) => prev.filter((r) => r.key !== key))

  const moveToPosition = (key: string, newPos: number) =>
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.key === key)
      const target = Math.max(0, Math.min(prev.length - 1, newPos - 1))
      if (idx === target) return prev
      const arr = [...prev]
      const [item] = arr.splice(idx, 1)
      arr.splice(target, 0, item)
      return arr
    })

  const moveRow = (key: string, dir: -1 | 1) =>
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.key === key)
      const next = idx + dir
      if (next < 0 || next >= prev.length) return prev
      const arr = [...prev]
      ;[arr[idx], arr[next]] = [arr[next], arr[idx]]
      return arr
    })

  const save = async () => {
    if (!name.trim()) return setError('De um nome ao treino.')
    if (rows.length === 0) return setError('Adicione pelo menos um exercicio.')
    setSaving(true)
    setError('')
    try {
      await savePlan({
        id: plan?.id,
        name: name.trim(),
        goal,
        exercises: rows.map((r) => ({
          exercise_id: r.exercise_id,
          sets: r.sets,
          reps: r.reps,
          rest_seconds: r.rest_seconds,
          target_weight_kg: r.target_weight_kg,
          notes: r.notes.trim() || null,
        })),
      }, targetUserId)
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao salvar o treino.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-obliq-border/50" />
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onClose}
          className="text-sm font-bold uppercase tracking-wide text-white/50 hover:text-white"
        >
          Voltar
        </button>
        <Button onClick={save} disabled={saving} className="px-4 py-2 text-xs">
          {saving ? 'Salvando...' : 'Salvar treino'}
        </Button>
      </div>

      <Card className="mb-4">
        <Input
          label="Nome do treino"
          placeholder="Treino A"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <p className="mt-4 mb-2 text-sm font-medium text-white/70">Objetivo</p>
        <div className="flex flex-wrap gap-2">
          {GOALS.map((g) => (
            <button
              key={g.key}
              type="button"
              onClick={() => setGoal(goal === g.key ? null : g.key)}
              className={`rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-all ${
                goal === g.key
                  ? 'border-obliq-red bg-obliq-red/10 text-white shadow-red-glow'
                  : 'border-obliq-border text-white/50 hover:border-white/20'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </Card>

      <div className="space-y-3">
        {rows.map((r, i) => (
          <Card key={r.key}>
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => moveRow(r.key, -1)}
                    disabled={i === 0}
                    className="text-white/30 hover:text-white disabled:opacity-20 text-xs leading-none px-1"
                  >&#9650;</button>
                  <input
                    type="number"
                    min={1}
                    max={rows.length}
                    value={i + 1}
                    onChange={(e) => moveToPosition(r.key, Number(e.target.value))}
                    className="w-10 rounded-lg border border-obliq-border bg-obliq-surface text-center text-sm font-black text-white/60 focus:border-obliq-red focus:outline-none py-0.5"
                    title="Posicao do exercicio"
                  />
                  <button
                    type="button"
                    onClick={() => moveRow(r.key, 1)}
                    disabled={i === rows.length - 1}
                    className="text-white/30 hover:text-white disabled:opacity-20 text-xs leading-none px-1"
                  >&#9660;</button>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/30">
                    {muscleLabel(r.muscle_group)}
                  </p>
                  <h3 className="font-bold">{r.name}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeRow(r.key)}
                className="text-xs font-bold uppercase text-white/40 hover:text-obliq-red"
              >
                Remover
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Input
                label="Series"
                type="number"
                min={1}
                value={r.sets || ''}
                onChange={(e) => updateRow(r.key, { sets: Number(e.target.value) })}
              />
              <Input
                label="Reps"
                value={r.reps}
                placeholder="12 ou 8-10"
                onChange={(e) => updateRow(r.key, { reps: e.target.value })}
              />
              <Input
                label="Descanso (s)"
                type="number"
                min={0}
                value={r.rest_seconds || ''}
                onChange={(e) => updateRow(r.key, { rest_seconds: Number(e.target.value) })}
              />
              <Input
                label="Carga-alvo (kg)"
                type="number"
                min={0}
                step="0.5"
                value={r.target_weight_kg ?? ''}
                onChange={(e) =>
                  updateRow(r.key, {
                    target_weight_kg: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
              />
            </div>

            <div className="mt-3">
              <Input
                label="Observacoes"
                placeholder="Cadencia lenta, foco na contracao..."
                value={r.notes}
                onChange={(e) => updateRow(r.key, { notes: e.target.value })}
              />
            </div>
          </Card>
        ))}

        <Button
          variant="secondary"
          onClick={() => setPickerOpen(true)}
          className="w-full"
        >
          + Adicionar exercicio
        </Button>
      </div>

      {error && (
        <p className="mt-3 text-center text-sm font-medium text-obliq-red">{error}</p>
      )}

      {pickerOpen && (
        <ExercisePicker onPick={addExercise} onClose={() => setPickerOpen(false)} />
      )}
    </div>
  )
}

function ExercisePicker({
  onPick,
  onClose,
}: {
  onPick: (ex: CatalogExercise) => void
  onClose: () => void
}) {
  const [exercises, setExercises] = useState<CatalogExercise[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<MuscleGroup | 'all'>('all')

  useEffect(() => {
    let active = true
    fetchExercises()
      .then((d) => active && setExercises(d))
      .catch(() => {})
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  const filtered = useMemo(
    () => (filter === 'all' ? exercises : exercises.filter((e) => e.muscle_group === filter)),
    [exercises, filter],
  )

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-obliq-black/95 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-obliq-border px-4 py-3">
        <p className="text-sm font-black uppercase tracking-wide">Adicionar exercicio</p>
        <button
          type="button"
          onClick={onClose}
          className="text-sm font-bold uppercase text-white/50 hover:text-white"
        >
          Fechar
        </button>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-obliq-border px-4 py-2">
        {[{ key: 'all' as const, label: 'Todos' }, ...MUSCLE_GROUPS].map((g) => (
          <button
            key={g.key}
            type="button"
            onClick={() => setFilter(g.key)}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide transition-all ${
              filter === g.key
                ? 'border-obliq-red bg-obliq-red/10 text-white'
                : 'border-obliq-border text-white/50'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-obliq-border/50" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => onPick(ex)}
                className="w-full rounded-xl border border-obliq-border bg-obliq-surface px-4 py-3 text-left transition-all hover:border-obliq-red/50 active:scale-[0.98]"
              >
                <p className="font-bold text-sm">{ex.name}</p>
                <p className="text-xs text-white/40">{muscleLabel(ex.muscle_group)}</p>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-sm text-white/40 pt-8">Nenhum exercicio encontrado.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
