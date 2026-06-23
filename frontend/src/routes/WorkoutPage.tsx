import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useI18n } from '../i18n/I18nContext'
import { mockExercises, muscleGroups } from '../data/mockExercises'
import { AppShell } from '../components/layout/AppShell'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

export function WorkoutPage() {
  const { t } = useI18n()
  const { isPro } = useApp()
  const [filter, setFilter] = useState<string>('All')

  const exercises = useMemo(() => {
    if (filter === 'All') return mockExercises
    return mockExercises.filter((e) => e.muscle === filter)
  }, [filter])

  return (
    <AppShell titleKey="workout">
      {!isPro && (
        <Card glow className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide">
              {t.workout.unlockTitle}
            </p>
            <p className="text-xs text-white/50">{t.workout.unlockDesc}</p>
          </div>
          <Button to="/pricing" className="shrink-0 px-4 py-2 text-xs">
            {t.workout.upgrade}
          </Button>
        </Card>
      )}

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {muscleGroups.map((group) => (
          <button
            key={group}
            type="button"
            onClick={() => setFilter(group)}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-all ${
              filter === group
                ? 'border-obliq-red bg-obliq-red/10 text-white shadow-red-glow'
                : 'border-obliq-border text-white/50 hover:border-white/20'
            }`}
          >
            {t.workout.muscle[group]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {exercises.map((exercise) => {
          const locked = exercise.pro && !isPro
          const exerciseName =
            t.workout.exercises[exercise.id] ?? exercise.name

          return (
            <Card
              key={exercise.id}
              className={`relative overflow-hidden ${locked ? 'opacity-80' : ''}`}
            >
              {locked && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-obliq-black/70 backdrop-blur-sm">
                  <Badge variant="pro">{t.common.pro}</Badge>
                  <p className="text-xs font-medium text-white/60">
                    {t.workout.upgradeUnlock}
                  </p>
                  <Link
                    to="/pricing"
                    className="text-xs font-bold uppercase text-obliq-red hover:underline"
                  >
                    {t.workout.viewPlans}
                  </Link>
                </div>
              )}

              <div className="mb-3 flex h-32 items-center justify-center rounded-xl bg-obliq-border">
                <span className="text-4xl opacity-30">🏋️</span>
              </div>

              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold">{exerciseName}</h3>
                  <p className="text-xs text-white/40">
                    {t.workout.muscle[exercise.muscle]}
                  </p>
                </div>
                {exercise.pro && <Badge variant="pro">{t.common.pro}</Badge>}
              </div>

              <div className="mt-3 flex gap-4 text-sm">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/30">
                    {t.common.sets}
                  </p>
                  <p className="font-black tabular-nums">{exercise.sets}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/30">
                    {t.common.reps}
                  </p>
                  <p className="font-black">{exercise.reps}</p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </AppShell>
  )
}
