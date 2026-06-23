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
  const [emailSent, setEmailSent] = useState(false)
  const { login, signup } = useApp()
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

      // Supabase envia email de confirmação — avisa o usuário
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

  // Tela de confirmação após signup
  if (emailSent) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-obliq-black px-4 py-8">
        <div className="w-full max-w-md text-center">
          <Logo size="lg" />
          <Card className="mt-8">
            <p className="text-lg font-semibold text-white">Verifique seu e-mail</p>
            <p className="mt-2 text-sm text-white/60">
              Enviamos um link de confirmação para <strong>{email}</strong>.
              Clique no link para ativar sua conta e depois faça login.
            </p>
            <Button
              className="mt-6 w-full"
              onClick={() => {
                setEmailSent(false)
                setTab('login')
                setPassword('')
                setConfirm('')
              }}
            >
              Ir para o login
            </Button>
          </Card>
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

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
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

            <Button type="submit" className="mt-2 w-full" disabled={isLoading}>
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
