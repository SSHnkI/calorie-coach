import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from '../lib/supabase'
import { calculateDailyKcal } from '../lib/tdee'
import type {
  FoodEntry,
  OnboardingData,
  SubscriptionStatus,
  UserProfile,
} from '../types'

type AuthResult = { error: string | null }
type SignupResult = { error: string | null; emailSent?: boolean }

type AppContextValue = {
  user: UserProfile | null
  foodLog: FoodEntry[]
  isAuthenticated: boolean
  isPro: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<AuthResult>
  signup: (email: string, password: string) => Promise<SignupResult>
  logout: () => Promise<void>
  completeOnboarding: (data: OnboardingData) => Promise<void>
  addFoodEntry: (entry: Omit<FoodEntry, 'id' | 'logged_at'>) => void
  upgradeToPro: () => void
  totals: {
    kcal: number
    protein_g: number
    carbs_g: number
    fat_g: number
  }
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [foodLog, setFoodLog] = useState<FoodEntry[]>([])
  const [loading, setLoading] = useState(true)

  // Carrega o perfil do banco a partir do ID do usuário autenticado
  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error || !data) return null

    return data as UserProfile
  }, [])

  // Ouve mudanças de sessão do Supabase Auth
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await loadProfile(session.user.id)
        setUser(profile)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const profile = await loadProfile(session.user.id)
          setUser(profile)
        } else {
          setUser(null)
          setFoodLog([])
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [loadProfile])

  const login = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    return { error: null }
  }, [])

  const signup = useCallback(async (email: string, password: string): Promise<SignupResult> => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) return { error: error.message }
    return { error: null, emailSent: true }
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const completeOnboarding = useCallback(
    async (data: OnboardingData) => {
      if (!user) return
      const daily_kcal = calculateDailyKcal(data)
      const updated = { ...user, ...data, daily_kcal, onboarding_complete: true }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      await supabase
        .from('profiles')
        .update({ ...data, daily_kcal, onboarding_complete: true })
        .eq('id', session.user.id)

      setUser(updated)
    },
    [user],
  )

  const addFoodEntry = useCallback(
    (entry: Omit<FoodEntry, 'id' | 'logged_at'>) => {
      const newEntry: FoodEntry = {
        ...entry,
        id: crypto.randomUUID(),
        logged_at: new Date().toISOString(),
      }
      setFoodLog((prev) => [newEntry, ...prev])
    },
    [],
  )

  const upgradeToPro = useCallback(() => {
    if (!user) return
    setUser({ ...user, subscription_status: 'active' as SubscriptionStatus })
  }, [user])

  const totals = useMemo(
    () =>
      foodLog.reduce(
        (acc, item) => ({
          kcal: acc.kcal + item.kcal,
          protein_g: acc.protein_g + item.protein_g,
          carbs_g: acc.carbs_g + item.carbs_g,
          fat_g: acc.fat_g + item.fat_g,
        }),
        { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
      ),
    [foodLog],
  )

  const value = useMemo(
    () => ({
      user,
      foodLog,
      isAuthenticated: !!user,
      isPro: user?.subscription_status === 'active',
      loading,
      login,
      signup,
      logout,
      completeOnboarding,
      addFoodEntry,
      upgradeToPro,
      totals,
    }),
    [
      user,
      foodLog,
      loading,
      login,
      signup,
      logout,
      completeOnboarding,
      addFoodEntry,
      upgradeToPro,
      totals,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
