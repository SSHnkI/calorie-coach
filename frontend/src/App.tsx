import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import { I18nProvider } from './i18n/I18nContext'
import { ProtectedRoute, GuestRoute } from './components/layout/ProtectedRoute'
import { LanguageBar } from './components/layout/LanguageBar'
import { LandingPage } from './routes/LandingPage'
import { AuthPage } from './routes/AuthPage'
import { OnboardingPage } from './routes/OnboardingPage'
import { DashboardPage } from './routes/DashboardPage'
import { WorkoutPage } from './routes/WorkoutPage'
import { PricingPage } from './routes/PricingPage'
import { AdminPage } from './routes/AdminPage'

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
        <LanguageBar />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/pricing" element={<PricingPage />} />

            <Route element={<GuestRoute />}>
              <Route path="/auth" element={<AuthPage />} />
            </Route>

            <Route path="/onboarding" element={<OnboardingGuard />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/workout" element={<WorkoutPage />} />
            </Route>

            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </I18nProvider>
  )
}
