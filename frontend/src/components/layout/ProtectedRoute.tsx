import { Navigate, Outlet } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { destinoDaRota } from './destinoDaRota'
import { Esperando } from './Esperando'

export function useDestino() {
  const { isAuthenticated, user, loading, perfilPronto } = useApp()
  return destinoDaRota({
    carregando: loading,
    autenticado: isAuthenticated,
    perfilPronto,
    onboardingCompleto: !!user?.onboarding_complete,
  })
}

export function ProtectedRoute() {
  const destino = useDestino()

  if (destino === 'espera') return <Esperando />
  if (destino === 'auth') return <Navigate to="/auth" replace />
  if (destino === 'onboarding') return <Navigate to="/onboarding" replace />

  return <Outlet />
}

export function GuestRoute() {
  const destino = useDestino()

  if (destino === 'espera') return <Esperando />
  if (destino === 'onboarding') return <Navigate to="/onboarding" replace />
  if (destino === 'app') return <Navigate to="/dashboard" replace />

  return <Outlet />
}
