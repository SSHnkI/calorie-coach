import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { AppShell } from '../components/layout/AppShell'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Tabs } from '../components/ui/Tabs'
import { MyWorkouts } from '../components/workout/MyWorkouts'
import { ExerciseCatalog } from '../components/workout/ExerciseCatalog'
import { WorkoutHistory } from '../components/workout/WorkoutHistory'
import { Achievements } from '../components/workout/Achievements'

function ProGate() {
  return (
    <Card glow className="text-center">
      <div className="text-4xl">🔒</div>
      <h2 className="mt-2 text-lg font-black uppercase">Recurso Pro</h2>
      <p className="mt-1 text-sm text-white/50">
        Crie treinos, registre cargas, veja seu histórico e conquiste medalhas.
        O catálogo de exercícios é grátis.
      </p>
      <Button to="/pricing" className="mt-4">
        Virar Pro
      </Button>
    </Card>
  )
}

export function WorkoutPage() {
  const { isPro } = useApp()
  const [tab, setTab] = useState('plans')

  return (
    <AppShell titleKey="workout">
      <div className="mb-4">
        <Tabs
          tabs={[
            { id: 'plans', label: 'Treinos' },
            { id: 'history', label: 'Histórico' },
            { id: 'achievements', label: 'Conquistas' },
            { id: 'catalog', label: 'Exercícios' },
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
