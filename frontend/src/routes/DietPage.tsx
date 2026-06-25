import { useApp } from '../context/AppContext'
import { AppShell } from '../components/layout/AppShell'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { MyDiet } from '../components/nutrition/MyDiet'

function ProGate() {
  return (
    <Card glow className="text-center">
      <div className="text-4xl">🔒</div>
      <h2 className="mt-2 text-lg font-black uppercase">Recurso Pro</h2>
      <p className="mt-1 text-sm text-white/50">
        Dietas semanais personalizáveis e modelos por objetivo fazem parte do plano Pro.
      </p>
      <Button to="/pricing" className="mt-4">
        Virar Pro
      </Button>
    </Card>
  )
}

export function DietPage() {
  const { isPro } = useApp()
  return <AppShell titleKey="diet">{isPro ? <MyDiet /> : <ProGate />}</AppShell>
}
