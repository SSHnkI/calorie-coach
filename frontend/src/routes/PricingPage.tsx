import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useI18n } from '../i18n/I18nContext'
import { supabase } from '../lib/supabase'
import { AppShell } from '../components/layout/AppShell'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'

const PRICE_ID = 'price_1TlUaE7FbBrEWaC4hU5oppwd'
const APP_URL = 'https://obliq-psi.vercel.app'

function FeatureList({ items, highlight }: { items: string[]; highlight?: boolean }) {
  return (
    <ul className="mt-4 flex flex-col gap-2">
      {items.map((item) => (
        <li key={item} className="flex items-center gap-2 text-sm">
          <span className={highlight ? 'text-obliq-red' : 'text-white/40'}>
            {highlight ? '✓' : '○'}
          </span>
          <span className={highlight ? 'text-white' : 'text-white/60'}>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function TrainerCodeSection() {
  const { isPro, isAuthenticated, refreshUser } = useApp()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  if (isPro) return null

  const handleActivate = async () => {
    if (!code.trim()) return
    if (!isAuthenticated) { navigate('/auth?mode=signup'); return }

    setLoading(true)
    setError('')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { navigate('/auth'); return }

    // Validação + ativação no servidor (SECURITY DEFINER)
    const { data: ok, error: rpcErr } = await supabase.rpc('redeem_trainer_code', {
      p_code: code.trim(),
    })

    if (rpcErr) {
      setError('Erro ao ativar. Tente novamente.')
      setLoading(false)
      return
    }
    if (!ok) {
      setError('Código inválido. Verifique com seu treinador.')
      setLoading(false)
      return
    }

    await refreshUser()
    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <Card className="mt-4 border-obliq-red/30 bg-obliq-red/5">
        <p className="text-center text-sm font-bold text-obliq-red">
          ✓ Pro ativado! Seu treinador já pode gerenciar seus treinos.
        </p>
      </Card>
    )
  }

  return (
    <Card className="mt-4">
      <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">
        Tem um código de treinador?
      </p>
      <div className="flex gap-2">
        <Input
          placeholder="CODIGO123"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="flex-1 font-mono tracking-widest"
        />
        <Button onClick={handleActivate} disabled={loading || !code.trim()} className="shrink-0 px-4">
          {loading ? '...' : 'Ativar'}
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-obliq-red">{error}</p>}
      <p className="mt-2 text-[10px] text-white/30">
        Ativa o plano Pro e vincula você ao seu treinador automaticamente.
      </p>
    </Card>
  )
}

export function PricingPage() {
  const { t } = useI18n()
  const { isPro, isAuthenticated } = useApp()
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      navigate('/auth?mode=signup')
      return
    }

    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        navigate('/auth')
        return
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          user_id: session.user.id,
          email: session.user.email,
          price_id: PRICE_ID,
          success_url: `${APP_URL}/dashboard?subscribed=true`,
          cancel_url: `${APP_URL}/pricing`,
        },
      })

      if (error || !data?.url) {
        console.error('Erro ao criar sessão de checkout:', error)
        alert('Erro ao redirecionar para o Stripe. Tente novamente.')
        return
      }

      window.location.href = data.url
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell titleKey="pricing">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-black uppercase tracking-wide">
          {t.pricing.title}
        </h1>
        <p className="mt-2 text-sm text-white/50">{t.pricing.subtitle}</p>
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <p className="text-sm font-bold uppercase tracking-widest text-white/40">
            {t.common.free}
          </p>
          <p className="mt-2 text-3xl font-black">R$0</p>
          <FeatureList items={t.pricing.freeFeatures} />
          {!isPro && (
            <p className="mt-4 text-xs font-medium text-white/30">
              {t.pricing.currentPlan}
            </p>
          )}
        </Card>

        <Card glow>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold uppercase tracking-widest text-obliq-red">
              {t.common.pro}
            </p>
            {isPro && (
              <span className="rounded-md bg-obliq-red/20 px-2 py-0.5 text-[10px] font-black uppercase text-obliq-red">
                {t.pricing.active}
              </span>
            )}
          </div>
          <p className="mt-2 text-4xl font-black tabular-nums">
            R$19,90
            <span className="text-base font-medium text-white/40">
              {t.common.month}
            </span>
          </p>
          <FeatureList items={t.pricing.proFeatures} highlight />
          <Button
            onClick={handleCheckout}
            disabled={loading || isPro}
            className="mt-6 w-full"
          >
            {isPro
              ? t.pricing.subscribed
              : loading
                ? t.pricing.redirecting
                : t.pricing.subscribe}
          </Button>
        </Card>
      </div>

      <TrainerCodeSection />

      <Card className="mt-6">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-white/50">
          {t.pricing.comparison}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-obliq-border text-left text-white/40">
                <th className="pb-3 pr-4 font-medium">{t.pricing.featureCol}</th>
                <th className="pb-3 pr-4 font-medium">{t.pricing.freeCol}</th>
                <th className="pb-3 font-medium text-obliq-red">{t.pricing.proCol}</th>
              </tr>
            </thead>
            <tbody className="text-white/70">
              {t.pricing.compareRows.map((row) => (
                <tr key={row.feature} className="border-b border-obliq-border/50">
                  <td className="py-3 pr-4">{row.feature}</td>
                  <td className="py-3 pr-4 text-white/40">{row.free}</td>
                  <td className="py-3 font-semibold text-white">{row.pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  )
}
