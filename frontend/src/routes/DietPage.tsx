import { useApp } from '../context/AppContext'
import { useI18n } from '../i18n/I18nContext'
import { AppShell } from '../components/layout/AppShell'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { MyDiet } from '../components/nutrition/MyDiet'

function ProGate() {
  const { t } = useI18n()
  return (
    <Card glow className="text-center">
      <div className="text-4xl">🔒</div>
      <h2 className="mt-2 text-lg font-black uppercase">{t.ui.proFeature}</h2>
      <p className="mt-1 text-sm text-white/50">{t.ui.proGateDiet}</p>
      <Button to="/pricing" className="mt-4">
        {t.ui.goPro}
      </Button>
    </Card>
  )
}

export function DietPage() {
  const { isPro } = useApp()
  return <AppShell titleKey="diet">{isPro ? <MyDiet /> : <ProGate />}</AppShell>
}
