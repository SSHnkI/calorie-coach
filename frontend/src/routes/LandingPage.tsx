import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Logo } from '../components/layout/Logo'
import { useI18n } from '../i18n/I18nContext'

export function LandingPage() {
  const { t } = useI18n()

  const features = [
    {
      icon: '🧠',
      title: t.landing.feature1Title,
      description: t.landing.feature1Desc,
    },
    {
      icon: '🏋️',
      title: t.landing.feature2Title,
      description: t.landing.feature2Desc,
    },
    {
      icon: '📈',
      title: t.landing.feature3Title,
      description: t.landing.feature3Desc,
    },
  ]

  return (
    <div className="min-h-dvh bg-obliq-black">
      <section className="relative overflow-hidden px-4 pb-16 pt-8 sm:pt-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(232,0,13,0.15),transparent_60%)]" />
        <div className="relative mx-auto max-w-lg text-center sm:max-w-2xl">
          <Logo size="lg" />
          <h1 className="mt-8 text-4xl font-black uppercase leading-none tracking-tight sm:text-6xl">
            {t.landing.tagline1}
            <br />
            <span className="text-red-gradient">{t.landing.tagline2}</span>
            <br />
            {t.landing.tagline3}
          </h1>
          <p className="mx-auto mt-6 max-w-md text-base text-white/60 sm:text-lg">
            {t.landing.subtitle}
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button to="/auth?mode=signup" className="w-full sm:w-auto">
              {t.landing.startFree}
            </Button>
            <Button to="/pricing" variant="secondary" className="w-full sm:w-auto">
              {t.landing.viewPricing}
            </Button>
          </div>
        </div>
      </section>

      <section className="border-t border-obliq-border px-4 py-16">
        <div className="mx-auto max-w-lg sm:max-w-2xl">
          <h2 className="mb-8 text-center text-2xl font-black uppercase tracking-wide">
            {t.landing.featuresTitle}
          </h2>
          <div className="flex flex-col gap-4">
            {features.map((f) => (
              <Card key={f.title} glow>
                <div className="flex items-start gap-4">
                  <span className="text-3xl">{f.icon}</span>
                  <div className="text-left">
                    <h3 className="font-bold uppercase tracking-wide">{f.title}</h3>
                    <p className="mt-1 text-sm text-white/60">{f.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-obliq-border px-4 py-16">
        <div className="mx-auto max-w-lg text-center sm:max-w-2xl">
          <Card glow className="py-8">
            <p className="text-sm font-bold uppercase tracking-widest text-obliq-red">
              {t.landing.proLabel}
            </p>
            <p className="mt-2 text-5xl font-black tabular-nums">
              R$14,99
              <span className="text-lg font-medium text-white/40">{t.common.month}</span>
            </p>
            <p className="mt-2 text-white/60">{t.landing.proDesc}</p>
            <Button to="/auth?mode=signup" className="mt-6">
              {t.landing.startFree}
            </Button>
          </Card>
        </div>
      </section>

      <footer className="border-t border-obliq-border px-4 py-8 text-center text-sm text-white/30">
        <Logo size="sm" />
        <p className="mt-2">{t.landing.footer}</p>
      </footer>
    </div>
  )
}
