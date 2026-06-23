import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { initialFoodLog } from '../data/mockFood'
import { calculateDailyKcal } from '../lib/tdee'
import type {
  FoodEntry,
  OnboardingData,
  SubscriptionStatus,
  UserProfile,
} from '../types'

const STORAGE_KEY = 'obliq_user'

type AppContextValue = {
  user: UserProfile | null
  foodLog: FoodEntry[]
  isAuthenticated: boolean
  isPro: boolean
  login: (email: string, password: string) => void
  signup: (email: string, password: string) => void
  logout: () => void
  completeOnboarding: (data: OnboardingData) => void
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

function loadUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as UserProfile) : null
  } catch {
    return null
  }
}

function saveUser(user: UserProfile | null) {
  if (user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => loadUser())
  const [foodLog, setFoodLog] = useState<FoodEntry[]>(() =>
    loadUser() ? initialFoodLog : [],
  )

  const persist = useCallback((next: UserProfile | null) => {
    setUser(next)
    saveUser(next)
  }, [])

  const login = useCallback(
    (email: string, _password: string) => {
      const existing = loadUser()
      if (existing?.email === email) {
        setUser(existing)
        setFoodLog(initialFoodLog)
        return
      }
      const profile: UserProfile = {
        email,
        age: 0,
        weight_kg: 0,
        height_cm: 0,
        sex: 'male',
        activity: 'moderate',
        goal: 'maintain',
        daily_kcal: 2000,
        subscription_status: 'free',
        onboarding_complete: false,
      }
      persist(profile)
      setFoodLog([])
    },
    [persist],
  )

  const signup = useCallback(
    (email: string, _password: string) => {
      const profile: UserProfile = {
        email,
        age: 0,
        weight_kg: 0,
        height_cm: 0,
        sex: 'male',
        activity: 'moderate',
        goal: 'maintain',
        daily_kcal: 2000,
        subscription_status: 'free',
        onboarding_complete: false,
      }
      persist(profile)
      setFoodLog([])
    },
    [persist],
  )

  const logout = useCallback(() => {
    persist(null)
    setFoodLog([])
  }, [persist])

  const completeOnboarding = useCallback(
    (data: OnboardingData) => {
      if (!user) return
      const daily_kcal = calculateDailyKcal(data)
      persist({
        ...user,
        ...data,
        daily_kcal,
        onboarding_complete: true,
      })
    },
    [user, persist],
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
    persist({ ...user, subscription_status: 'active' as SubscriptionStatus })
  }, [user, persist])

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
