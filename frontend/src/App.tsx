import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import { I18nProvider } from './i18n/I18nContext'
import { ProtectedRoute, GuestRoute } from './components/layout/ProtectedRoute'
import { LanguageBar } from './components/layout/LanguageBar'
import { LandingPage } from './routes/LandingPage'
import { AuthPage } from './routes/AuthPage'
import { OnboardingPage } from './routes/OnboardingPage'
import { DashboardPage } from './routes/DashboardPage'
import { ResetPasswordPage } from './routes/ResetPasswordPage'
import { supabase } from './lib/supabase'

// ponytail: escopo enxugado para a calculadora de calorias.
// Treino, dieta, admin, personal, nutri e pricing seguem no git (branch main).

// O link de recuperacao do e-mail cria a sessao e cai na raiz do app, nao em
// /reset-password. Sem isso o usuario entra logado e nunca troca a senha.
function RecoveryRedirect() {
  const navigate = useNavigate()

  useEffect(() => {
    const go = () => navigate('/reset-password', { replace: true })

    // O token chega no hash da URL; o supabase-js consome antes do evento em alguns casos.
    if (window.location.hash.includes('type=recovery')) go()

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') go()
    })
    return () => sub.subscription.unsubscribe()
  }, [navigate])

  return null
}

function OnboardingGuard() {
  const { isAuthenticated, user, loading } = useApp()
  if (loading) return null
  if (!isAuthenticated) return <Navigate to="/auth?mode=signup" replace />
  if (user?.onboarding_complete) return <Navigate to="/dashboard" replace />
  return <OnboardingPage />
}

export default function App() {
  return (
    <I18nProvider>
      <AppProvider>
        <BrowserRouter>
          <LanguageBar />
          <RecoveryRedirect />
          <Routes>
            <Route path="/" element={<LandingPage />} />

            <Route element={<GuestRoute />}>
              <Route path="/auth" element={<AuthPage />} />
            </Route>

            <Route path="/reset-password" element={<ResetPasswordPage />} />

            <Route path="/onboarding" element={<OnboardingGuard />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<DashboardPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </I18nProvider>
  )
}
