import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { interpolate, useI18n } from '../i18n/I18nContext'
import { calculateDailyKcal } from '../lib/tdee'
import type { ActivityLevel, Goal, OnboardingData, Sex } from '../types'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Logo } from '../components/layout/Logo'
import { formatKcal } from '../lib/format'

const TOTAL_STEPS = 6

const defaultData: OnboardingData = {
  age: 25,
  weight_kg: 70,
  height_cm: 175,
  sex: 'male',
  activity: 'moderate',
  goal: 'maintain',
}

export function OnboardingPage() {
  const { t, locale } = useI18n()
  const [step, setStep] = useState(1)
  const [data, setData] = useState<OnboardingData>(defaultData)
  const { completeOnboarding } = useApp()
  const navigate = useNavigate()

  const dailyKcal = calculateDailyKcal(data)
  const progress = (step / TOTAL_STEPS) * 100

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS + 1))
  const back = () => setStep((s) => Math.max(s - 1, 1))

  const finish = async () => {
    await completeOnboarding(data)
    navigate('/dashboard')
  }

  const canProceed = () => {
    if (step === 1) return data.age >= 13 && data.age <= 100
    if (step === 2) return data.weight_kg >= 30 && data.weight_kg <= 300
    if (step === 3) return data.height_cm >= 100 && data.height_cm <= 250
    return true
  }

  return (
    <div className="flex min-h-dvh flex-col bg-obliq-black px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 text-center">
          <Logo size="md" />
          <p className="mt-2 text-sm text-white/50">
            {interpolate(t.onboarding.step, {
              current: Math.min(step, TOTAL_STEPS),
              total: TOTAL_STEPS,
            })}
          </p>
        </div>

        <div className="mb-8 h-1.5 overflow-hidden rounded-full bg-obliq-border">
          <div
            className="h-full bg-red-gradient transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <Card glow>
          {step === 1 && (
            <div>
              <h2 className="text-xl font-black uppercase">{t.onboarding.ageTitle}</h2>
              <p className="mt-1 text-sm text-white/50">{t.onboarding.ageDesc}</p>
              <div className="mt-6">
                <Input
                  label={t.onboarding.ageLabel}
                  type="number"
                  min={13}
                  max={100}
                  value={data.age || ''}
                  onChange={(e) =>
                    setData({ ...data, age: Number(e.target.value) })
                  }
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-xl font-black uppercase">{t.onboarding.weightTitle}</h2>
              <p className="mt-1 text-sm text-white/50">{t.onboarding.weightDesc}</p>
              <div className="mt-6">
                <Input
                  label={t.onboarding.weightLabel}
                  type="number"
                  min={30}
                  max={300}
                  value={data.weight_kg || ''}
                  onChange={(e) =>
                    setData({ ...data, weight_kg: Number(e.target.value) })
                  }
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-xl font-black uppercase">{t.onboarding.heightTitle}</h2>
              <p className="mt-1 text-sm text-white/50">{t.onboarding.heightDesc}</p>
              <div className="mt-6">
                <Input
                  label={t.onboarding.heightLabel}
                  type="number"
                  min={100}
                  max={250}
                  value={data.height_cm || ''}
                  onChange={(e) =>
                    setData({ ...data, height_cm: Number(e.target.value) })
                  }
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="text-xl font-black uppercase">{t.onboarding.sexTitle}</h2>
              <p className="mt-1 text-sm text-white/50">{t.onboarding.sexDesc}</p>
              <div className="mt-6 flex gap-3">
                {(['male', 'female'] as Sex[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setData({ ...data, sex: s })}
                    className={`flex-1 rounded-xl border py-4 text-sm font-bold uppercase tracking-wide transition-all ${
                      data.sex === s
                        ? 'border-obliq-red bg-obliq-red/10 text-white shadow-red-glow'
                        : 'border-obliq-border text-white/50 hover:border-white/20'
                    }`}
                  >
                    {s === 'male' ? t.onboarding.male : t.onboarding.female}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <h2 className="text-xl font-black uppercase">{t.onboarding.activityTitle}</h2>
              <p className="mt-1 text-sm text-white/50">{t.onboarding.activityDesc}</p>
              <div className="mt-4 flex flex-col gap-2">
                {(Object.keys(t.onboarding.activity) as ActivityLevel[]).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setData({ ...data, activity: level })}
                    className={`rounded-xl border px-4 py-3 text-left text-sm transition-all ${
                      data.activity === level
                        ? 'border-obliq-red bg-obliq-red/10 shadow-red-glow'
                        : 'border-obliq-border text-white/60 hover:border-white/20'
                    }`}
                  >
                    {t.onboarding.activity[level]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 6 && (
            <div>
              <h2 className="text-xl font-black uppercase">{t.onboarding.goalTitle}</h2>
              <p className="mt-1 text-sm text-white/50">{t.onboarding.goalDesc}</p>
              <div className="mt-4 flex flex-col gap-2">
                {(Object.keys(t.onboarding.goal) as Goal[]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setData({ ...data, goal: g })}
                    className={`rounded-xl border px-4 py-4 text-sm font-bold uppercase tracking-wide transition-all ${
                      data.goal === g
                        ? 'border-obliq-red bg-obliq-red/10 shadow-red-glow'
                        : 'border-obliq-border text-white/60 hover:border-white/20'
                    }`}
                  >
                    {t.onboarding.goal[g]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 7 && (
            <div className="text-center">
              <p className="text-sm font-bold uppercase tracking-widest text-obliq-red">
                {t.onboarding.targetTitle}
              </p>
              <p className="mt-4 text-6xl font-black tabular-nums text-red-gradient">
                {formatKcal(dailyKcal, locale)}
              </p>
              <p className="text-lg font-medium text-white/60">{t.common.kcalPerDay}</p>
              <p className="mt-4 text-sm text-white/40">{t.onboarding.targetDesc}</p>
            </div>
          )}

          <div className="mt-8 flex gap-3">
            {step > 1 && step <= TOTAL_STEPS && (
              <Button variant="secondary" onClick={back} className="flex-1">
                {t.common.backBtn}
              </Button>
            )}
            {step <= TOTAL_STEPS && (
              <Button
                onClick={next}
                disabled={!canProceed()}
                className="flex-1"
              >
                {t.common.continue}
              </Button>
            )}
            {step === TOTAL_STEPS + 1 && (
              <Button onClick={finish} className="w-full">
                {t.onboarding.startTracking}
              </Button>
            )}
          </div>
        </Card>
      </div>
    <