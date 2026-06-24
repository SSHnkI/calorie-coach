import { useEffect, useState } from 'react'
import { fetchAchievements, type AchievementView } from '../../lib/achievements'
import { Card } from '../ui/Card'

export function Achievements() {
  const [items, setItems] = useState<AchievementView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    fetchAchievements()
      .then((d) => active && setItems(d))
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-obliq-border/50" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <p className="text-center text-sm text-obliq-red">Falha ao carregar conquistas.</p>
      </Card>
    )
  }

  const unlockedCount = items.filter((i) => i.unlocked).length

  return (
    <div>
      <p className="mb-4 text-sm text-white/50">
        {unlockedCount} de {items.length} conquistas desbloqueadas
      </p>
      <div className="grid grid-cols-2 gap-3">
        {items.map((a) => (
          <Card
            key={a.id}
            glow={a.unlocked}
            className={`text-center ${a.unlocked ? '' : 'opacity-50'}`}
          >
            <div className="text-4xl">{a.unlocked ? (a.icon ?? '🏅') : '🔒'}</div>
            <h3 className="mt-2 text-sm font-bold">{a.name}</h3>
            {a.description && (
              <p className="mt-1 text-xs text-white/40">{a.description}</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
