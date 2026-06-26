import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { useI18n } from '../i18n/I18nContext'
import { AppShell } from '../components/layout/AppShell'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Tabs } from '../components/ui/Tabs'
import { MyWorkouts } from '../components/workout/MyWorkouts'
import { ExerciseCatalog } from '../components/workout/ExerciseCatalog'
import { WorkoutHistory } from '../components/workout/WorkoutHistory'
import { Achievements } from '../components/workout/Achievements'

function ProGate() {
  const { t } = useI18n()
  return (
    <Card glow className="text-center">
      <div className="text-4xl">🔒</div>
      <h2 className="mt-2 text-lg font-black uppercase">{t.ui.proFeature}</h2>
      <p className="mt-1 text-sm text-white/50">{t.ui.proGateWorkout}</p>
      <Button to="/pricing" className="mt-4">
        {t.ui.goPro}
      </Button>
    </Card>
  )
}

export function WorkoutPage() {
  const { isPro } = useApp()
  const { t } = useI18n()
  const [tab, setTab] = useState('plans')

  return (
    <AppShell titleKey="workout">
      <div className="mb-4">
        <Tabs
          tabs={[
            { id: 'plans', label: t.ui.tabWorkouts },
            { id: 'history', label: t.ui.tabHistory },
            { id: 'achievements', label: t.ui.tabAchievements },
            { id: 'catalog', label: t.ui.tabExercises },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {tab === 'plans' && (isPro ? <MyWorkouts /> : <ProGate />)}
      {tab === 'history' && (isPro ? <WorkoutHistory /> : <ProGate />)}
      {tab === 'achievements' && (isPro ? <Achievements /> : <ProGate />)}
      {tab === 'catalog' && <ExerciseCatalog />}
    </AppShell>
  )
}
