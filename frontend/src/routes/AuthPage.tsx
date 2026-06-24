import { type FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useI18n } from '../i18n/I18nContext'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Tabs } from '../components/ui/Tabs'
import { Logo } from '../components/layout/Logo'

export function AuthPage() {
  const { t } = useI18n()
  const [searchParams] = useSearchParams()
  const initialTab = searchParams.get('mode') === 'signup' ? 'signup' : 'login'
  const [tab, setTab] = useState(initialTab)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const { login, signup, loginWithGoogle, loginWithApple } = useApp()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password.trim()) {
      setError(t.auth.errorFillFields)
      return
    }

    if (tab === 'signup') {
      if (password.length < 6) {
        setError(t.auth.errorPasswordLength)
        return
      }
      if (password !== confirm) {
        setError(t.auth.errorPasswordMatch)
        return
      }

      setIsLoading(true)
      const result = await signup(email, password)
      setIsLoading(false)

      if (result.error) {
        setError(result.error)
        return
      }

      setEmailSent(true)
      return
    }

    // Login
    setIsLoading(true)
    const result = await login(email, password)
    setIsLoading(false)

    if (result.error) {
      setError(result.error)
      return
    }

    navigate('/dashboard')
  }

  const handleGoogle = async () => {
    setSocialLoading('google')
    await loginWithGoogle()
    setSocialLoading(null)
  }

  const handleApple = async () => {
    setSocialLoading('apple')
    await loginWithApple()
    setSocialLoading(null)
  }

  // Tela de confirmação após signup
  if (emailSent) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-obliq-black px-4 py-8">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <Logo size="lg" />
          </div>
          <Card glow>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-obliq-red/10 text-3xl">
                ✉️
              </div>
              <h2 className="text-xl font-black uppercase tracking-wide text-white">
                Verifique seu e-mail
              </h2>
              <p className="mt-3 text-sm text-white/60">
                Enviamos um link de confirmação para
              </p>
              <p className="mt-1 font-bold text-white">{email}</p>

              <div className="mt-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-left">
                <p className="text-xs font-bold uppercase tracking-widest text-yellow-400">
                  ⚠ Verifique a pasta de spam
                </p>
                <p className="mt-1 text-xs text-yellow-200/70">
                  O email pode cair na caixa de spam ou lixo eletrônico. Se não encontrar, procure por "Supabase" ou "noreply".
                </p>
              </div>

              <p className="mt-4 text-xs text-white/40">
                Após clicar no link, você será redirecionado automaticamente e não precisará fazer login de novo.
              </p>
            </div>
          </Card>

          <p className="mt-4 text-center text-xs text-white/30">
            Não recebeu?{' '}
            <button
              type="button"
              className="text-white/50 underline hover:text-white"
              onClick={() => {
                setEmailSent(false)
                setTab('signup')
              }}
            >
              Tentar novamente
            </button>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-obliq-black px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Logo size="lg" />
          <p className="mt-3 text-sm text-white/50">
            {tab === 'signup' ? t.auth.createAccount : t.auth.welcomeBack}
          </p>
        </div>

        <Card>
          <Tabs
            tabs={[
              { id: 'login', label: t.auth.login },
              { id: 'signup', label: t.auth.signup },
            ]}
            active={tab}
            onChange={(newTab) => {
              setTab(newTab)
              setError('')
            }}
          />

          {/* Login social */}
          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleGoogle}
              disabled={!!socialLoading || isLoading}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-obliq-border py-3 text-sm font-bold text-white/80 transition-all hover:border-white/20 hover:text-white disabled:opacity-50"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {socialLoading === 'google' ? 'Aguarde...' : 'Continuar com Google'}
            </button>

            <button
              type="button"
              onClick={handleApple}
              disabled={!!socialLoading || isLoading}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-obliq-border py-3 text-sm font-bold text-white/80 transition-all hover:border-white/20 hover:text-white disabled:opacity-50"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              {socialLoading === 'apple' ? 'Aguarde...' : 'Continuar com Apple'}
            </button>
          </div>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-obliq-border" />
            <span className="text-xs text-white/30 font-medium">ou</span>
            <div className="h-px flex-1 bg-obliq-border" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label={t.auth.email}
              type="email"
              placeholder={t.auth.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <Input
              label={t.auth.password}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
            />
            {tab === 'signup' && (
              <Input
                label={t.auth.confirmPassword}
                type="password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            )}

            {error && (
              <p className="text-sm font-medium text-obliq-red">{error}</p>
            )}

            <Button type="submit" className="mt-1 w-full" disabled={isLoading || !!socialLoading}>
              {isLoading
                ? 'Aguarde...'
                : tab === 'signup'
                  ? t.auth.createAccountBtn
                  : t.auth.signInBtn}
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-center text-sm text-white/40">
          <Link to="/" className="hover:text-white/70">
            {t.auth.backHome}
          </Link>
        </p>
      </div>
    </div>
  )
}
