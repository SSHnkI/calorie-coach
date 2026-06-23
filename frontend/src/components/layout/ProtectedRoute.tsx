import { Navigate, Outlet } from 'react-router-dom'
import { useApp } from '../../context/AppContext'

export function ProtectedRoute() {
  const { isAuthenticated, user } = useApp()

  if (!isAuthenticated) return <Navigate to="/auth" replace />
  if (user && !user.onboarding_complete) return <Navigate to="/onboarding" replace />

  return <Outlet />
}

export function GuestRoute() {
  const { isAuthenticated, user } = useApp()

  if (isAuthenticated && !user?.onboarding_complete) {
    return <Navigate to="/onboarding" replace />
  }
  if (isAuthenticated && user?.onboarding_complete) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
