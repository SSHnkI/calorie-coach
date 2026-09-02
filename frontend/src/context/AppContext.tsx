import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { calculateDailyKcal } from '../lib/tdee'
import type {
  FoodEntry,
  OnboardingData,
  SubscriptionStatus,
  UserProfile,
} from '../types'

type AuthResult = { error: string | null }

// O supabase-js as vezes entrega a falha como JSON cru ("{}" quando o servidor
// responde 500). Isso aparecia na tela literalmente. Aqui vira frase.
function mensagemDeErro(bruto: unknown, padrao: string) {
  const texto = typeof bruto === 'string' ? bruto.trim() : ''
  if (!texto || texto.startsWith('{') || texto.startsWith('[')) return padrao
  if (/failed to fetch|load failed|networkerror/i.test(texto)) {
    return 'Sem conexão agora. Confira a internet e tente de novo.'
  }
  return texto
}
type SignupResult = { error: string | null; emailSent?: boolean }

export type TrainerData = {
  id: string
  user_id: string
  name: string
  email: string
  code: string
  is_trainer: boolean
  is_nutri: boolean
}

type AppContextValue = {
  user: UserProfile | null
  foodLog: FoodEntry[]
  isAuthenticated: boolean
  isPro: boolean
  isTrainer: boolean
  isNutri: boolean
  trainerData: TrainerData | null
  loading: boolean
  login: (email: string, password: string) => Promise<AuthResult>
  signup: (email: string, password: string) => Promise<SignupResult>
  loginWithGoogle: () => Promise<void>
  loginWithApple: () => Promise<void>
  logout: () => Promise<void>
  completeOnboarding: (data: OnboardingData) => Promise<{ error: string | null }>
  addFoodEntry: (entry: Omit<FoodEntry, 'id' | 'logged_at'>) => void
  upgradeToPro: () => void
  refreshUser: () => Promise<void>
  totals: {
    kcal: number
    protein_g: number
    carbs_g: number
    fat_g: number
  }
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [trainerData, setTrainerData] = useState<TrainerData | null>(null)
  const [foodLog, setFoodLog] = useState<FoodEntry[]>([])
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (error || !data) return null
    return data as UserProfile
  }, [])

  const loadTrainer = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('professionals')
      .select('id, user_id, name, email, code, is_trainer, is_nutri')
      .eq('user_id', userId)
      .maybeSingle()
    setTrainerData(data ?? null)
  }, [])

  const loadAll = useCallback(async (userId: string) => {
    const [profile] = await Promise.all([loadProfile(userId), loadTrainer(userId)])
    setUser(profile)
  }, [loadProfile, loadTrainer])

  // Ouve mudanças de sessão do Supabase Auth.
  // PWA voltando do background: getSession() pode ficar pendurada tentando
  // renovar o token com a rede ainda dormindo. Sem teto de tempo, loading
  // nunca cai e o app fica na tela branca (só a barra de idioma aparece).
  useEffect(() => {
    let vivo = true
    const solta = setTimeout(() => {
      if (vivo) setLoading(false)
    }, 2500)

    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (!vivo) return
        setSession(session)
        if (session?.user) await loadAll(session.user.id)
      })
      .catch(() => {})
      .finally(() => {
        if (vivo) setLoading(false)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        setLoading(false)
        if (session?.user) {
          await loadAll(session.user.id)
        } else {
          setUser(null)
          setTrainerData(null)
          setFoodLog([])
        }
      }
    )

    // Voltar pro app é o momento em que os dados estão mais velhos.
    const aoVoltar = () => {
      if (document.visibilityState !== 'visible') return
      setLoading(false)
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session)
        if (session?.user) loadAll(session.user.id)
      })
    }
    document.addEventListener('visibilitychange', aoVoltar)

    return () => {
      vivo = false
      clearTimeout(solta)
      document.removeEventListener('visibilitychange', aoVoltar)
      subscription.unsubscribe()
    }
  }, [loadAll])

  const login = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      return {
        error: mensagemDeErro(error.message, 'Não foi possível entrar agora. Tente de novo em instantes.'),
      }
    }
    return { error: null }
  }, [])

  const signup = useCallback(async (email: string, password: string): Promise<SignupResult> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) {
      return {
        error: mensagemDeErro(
          error.message,
          'Não foi possível criar a conta agora. Tente de novo em instantes.',
        ),
      }
    }
    return { error: null, emailSent: true }
  }, [])

  const loginWithGoogle = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
  }, [])

  const loginWithApple = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const completeOnboarding = useCallback(
    async (data: OnboardingData): Promise<{ error: string | null }> => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return { error: 'Sessão expirada. Faça login novamente.' }

      const daily_kcal = calculateDailyKcal(data)

      // upsert cria a linha se ela ainda não existir (signup não cria perfil),
      // ou atualiza se já existir. update() puro não salvava nada quando
      // a linha não existia (0 linhas afetadas, sem erro).
      const { data: saved, error } = await supabase
        .from('profiles')
        .upsert({
          id: session.user.id,
          email: session.user.email,
          ...data,
          daily_kcal,
          onboarding_complete: true,
        })
        .select()
        .single()

      if (error) {
        console.error('Erro ao salvar onboarding:', error.message)
        return { error: error.message }
      }

      setUser(saved as UserProfile)
      return { error: null }
    },
    [],
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

  const refreshUser = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return
    const profile = await loadProfile(session.user.id)
    setUser(profile)
  }, [loadProfile])

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
      isAuthenticated: !!session,
      isPro: user?.subscription_status === 'active',
      isTrainer: !!trainerData?.is_trainer,
      isNutri: !!trainerData?.is_nutri,
      trainerData,
      loading,
      login,
      signup,
      loginWithGoogle,
      loginWithApple,
      logout,
      completeOnboarding,
      addFoodEntry,
      upgradeToPro,
      refreshUser,
      totals,
    }),
    [
      session,
      user,
      trainerData,
      foodLog,
      loading,
      login,
      signup,
      loginWithGoogle,
      loginWithApple,
      logout,
      completeOnboarding,
      addFoodEntry,
      upgradeToPro,
      refreshUser,
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
