import { type FormEvent, useState } from 'react'
import { useApp } from '../context/AppContext'
import { useI18n } from '../i18n/I18nContext'
import { mockAnalyzeFood } from '../data/mockFood'
import { calculateMacroTargets } from '../lib/tdee'
import { formatKcal } from '../lib/format'
import { AppShell } from '../components/layout/AppShell'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { MacroRing } from '../components/ui/MacroRing'
import { ProgressBar } from '../components/ui/ProgressBar'

export function DashboardPage() {
  const { t, locale } = useI18n()
  const { user, foodLog, totals, addFoodEntry, isPro } = useApp()
  const [foodInput, setFoodInput] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')

  const target = user?.daily_kcal ?? 2000
  const remaining = Math.max(0, target - totals.kcal)
  const macros = calculateMacroTargets(target)

  const handleAnalyze = async (e: FormEvent) => {
    e.preventDefault()
    if (!foodInput.trim()) return

    setAnalyzing(true)
    setError('')
    try {
      const result = await mockAnalyzeFood(foodInput)
      addFoodEntry(result)
      setFoodInput('')
    } catch {
      setError(t.dashboard.analyzeError)
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <AppShell titleKey="dashboard">
      <Card glow className="mb-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/50">
              {t.dashboard.today}
            </p>
            <p className="mt-1 text-4xl font-black tabular-nums">
              {formatKcal(totals.kcal, locale)}
              <span className="text-lg font-medium text-white/40">
                {' '}
                / {formatKcal(target, locale)}
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/40">{t.dashboard.remaining}</p>
            <p className="text-2xl font-black tabular-nums text-obliq-red">
              {formatKcal(remaining, locale)}
            </p>
          </div>
        </div>
        <ProgressBar
          value={totals.kcal}
          max={target}
          showLabel
          className="mt-4"
        />
      </Card>

      <Card className="mb-4">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-white/50">
          {t.dashboard.macros}
        </h2>
        <div className="flex justify-around">
          <MacroRing
            label={t.dashboard.protein}
            current={totals.protein_g}
            target={macros.protein_g}
          />
          <MacroRing
            label={t.dashboard.carbs}
            current={totals.carbs_g}
            target={macros.carbs_g}
            color="#FFFFFF"
          />
          <MacroRing
            label={t.dashboard.fat}
            current={totals.fat_g}
            target={macros.fat_g}
            color="#888888"
          />
        </div>
      </Card>

      <Card className="mb-4">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-white/50">
          {t.dashboard.logFood}
        </h2>
        <form onSubmit={handleAnalyze} className="flex flex-col gap-3 sm:flex-row">
          <Input
            placeholder={t.dashboard.foodPlaceholder}
            value={foodInput}
            onChange={(e) => setFoodInput(e.target.value)}
            className="flex-1"
            disabled={analyzing}
          />
          <Button type="submit" disabled={analyzing || !foodInput.trim()} className="shrink-0">
            {analyzing ? t.dashboard.analyzing : t.dashboard.analyze}
          </Button>
        </form>
        {!isPro && (
          <p className="mt-2 text-xs text-white/30">{t.dashboard.freePlanNote}</p>
        )}
        {error && <p className="mt-2 text-sm text-obliq-red">{error}</p>}
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-white/50">
          {t.dashboard.foodLog}
        </h2>
        {foodLog.length === 0 ? (
          <Card>
            <p className="text-center text-sm text-white/40">
              {t.dashboard.foodLogEmpty}
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {foodLog.map((item) => (
              <Card key={item.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{item.name}</p>
                    <p className="text-xs text-white/40">
                      {item.quantity} {item.unit}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-black tabular-nums text-obliq-red">
                      {item.kcal} {t.common.kcal}
                    </p>
                    <div className="mt-1 flex gap-2 text-[10px] text-white/40">
                      <span>P {item.protein_g}g</span>
                      <span>C {item.carbs_g}g</span>
                      <span>F {item.fat_g}g</span>
                    </div>
                  </div>
                </div>
                {item.confidence === 'low' && (
                  <div className="mt-2">
                    <Badge>{t.common.estimated}</Badge>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
