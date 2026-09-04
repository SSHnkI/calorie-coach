import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { calculateDailyKcal } from '../lib/tdee'
import type {
  FoodEntry,
  OnboardingData,
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

type AppContextValue = {
  user: UserProfile | null
  foodLog: FoodEntry[]
  isAuthenticated: boolean
  // O perfil ja foi buscado ao menos uma vez, com resultado ou com erro.
  perfilPronto: boolean
  isPro: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<AuthResult>
  signup: (email: string, password: string) => Promise<SignupResult>
  loginWithGoogle: () => Promise<void>
  loginWithApple: () => Promise<void>
  logout: () => Promise<void>
  completeOnboarding: (data: OnboardingData) => Promise<{ error: string | null }>
  addFoodEntry: (entry: Omit<FoodEntry, 'id' | 'logged_at'>) => void
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
  const [foodLog, setFoodLog] = useState<FoodEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [perfilPronto, setPerfilPronto] = useState(false)

  // Teto de tempo da busca do perfil. Sem ele a consulta pendura indefinidamente
  // quando o PWA volta do background com a rede ainda dormindo, e foi assim que
  // o app ficou em branco: a espera nunca terminava.
  // 4s x 2 tentativas = 8s no pior caso, e o Esperando so desiste aos 9s: a
  // segunda tentativa sempre tem chance de terminar antes de a tela dar errado.
  const TEMPO_LIMITE = 4000
  const TENTATIVAS = 2

  // Devolve `faltando` para separar duas coisas que antes eram o mesmo `null`:
  // perfil que nao existe, que e cadastro novo e vai pro onboarding, de perfil
  // que nao deu para buscar, em que o certo e admitir que nao sabemos.
  const loadProfile = useCallback(
    async (userId: string): Promise<{ perfil: UserProfile | null; faltando: boolean }> => {
      for (let tentativa = 0; tentativa < TENTATIVAS; tentativa++) {
        try {
          // Duas travas, porque sao dois jeitos diferentes de pendurar:
          // abortSignal corta o fetch que nao volta; o Promise.race corta a
          // espera ANTES do fetch, quando o supabase-js esta preso no lock de
          // auth pra pegar o token. O abortSignal sozinho nao alcanca essa.
          const resposta = await Promise.race([
            supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .abortSignal(AbortSignal.timeout(TEMPO_LIMITE))
              .maybeSingle(),
            new Promise<null>((r) => setTimeout(() => r(null), TEMPO_LIMITE)),
          ])
          if (!resposta) continue

          const { data, error } = resposta
          if (data) return { perfil: data as UserProfile, faltando: false }
          if (!error) return { perfil: null, faltando: true }
        } catch {
          // estourou o tempo ou a rede caiu: tenta de novo
        }
      }
      return { perfil: null, faltando: false }
    },
    [],
  )

  // Abrir o app dispara getSession() e o evento INITIAL_SESSION quase juntos, e
  // os dois querem o perfil. Sem isto sao duas buscas iguais na abertura fria,
  // que e justamente o momento mais lento.
  const buscando = useRef<{ uid: string; promessa: Promise<void> } | null>(null)

  const carregarPerfil = useCallback(
    async (userId: string) => {
      const { perfil, faltando } = await loadProfile(userId)
      if (perfil || faltando) {
        setUser(perfil)
        setPerfilPronto(true)
        return
      }
      // Falha dura. perfilPronto continua falso de proposito: nao da para
      // mandar a pessoa pro onboarding sem saber se ela ja tem perfil, e o
      // componente Esperando transforma essa espera num botao de tentar de novo.
      setPerfilPronto(false)
    },
    [loadProfile],
  )

  const loadAll = useCallback(
    (userId: string) => {
      // Guarda o uid junto: trocar de conta durante uma busca em voo nao pode
      // aproveitar a busca da conta anterior.
      if (buscando.current?.uid !== userId) {
        const promessa = carregarPerfil(userId).finally(() => {
          if (buscando.current?.uid === userId) buscando.current = null
        })
        buscando.current = { uid: userId, promessa }
      }
      return buscando.current.promessa
    },
    [carregarPerfil],
  )

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
      .then(({ data: { session } }) => {
        if (!vivo) return
        setSession(session)
        if (session?.user) loadAll(session.user.id)
      })
      .catch(() => {})
      .finally(() => {
        if (vivo) setLoading(false)
      })

    // NAO chame supabase aqui dentro, e nao deixe este callback async.
    //
    // O supabase-js segura um lock de auth enquanto entrega o evento, e toda
    // query pede esse mesmo lock pra montar o token. Esperar a query aqui e
    // esperar por um lock que so sai quando este callback termina: o app trava
    // em si mesmo. Era esse o PWA que abria, ficava parado ate o "tentar de
    // novo" aparecer, e andava na hora quando a pessoa apertava (o reload larga
    // o lock). O teto de tempo do loadProfile nao salvava, porque a espera
    // acontecia antes de existir fetch pra abortar.
    //
    // Aqui so mexe em estado. A busca do perfil sai da fila do lock com o
    // setTimeout, e roda em seguida, ja com o lock liberado.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
      if (session?.user) {
        const uid = session.user.id
        setTimeout(() => loadAll(uid), 0)
      } else {
        setUser(null)
        setFoodLog([])
        setPerfilPronto(false)
      }
    })

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

  const refreshUser = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return
    const { perfil, faltando } = await loadProfile(session.user.id)
    // Recarga de tela: falha aqui nao pode apagar o perfil que ja esta na mao.
    if (perfil || faltando) setUser(perfil)
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
      perfilPronto,
      isPro: user?.subscription_status === 'active',
      loading,
      login,
      signup,
      loginWithGoogle,
      loginWithApple,
      logout,
      completeOnboarding,
      addFoodEntry,
      refreshUser,
      totals,
    }),
    [
      session,
      user,
      perfilPronto,
      foodLog,
      loading,
      login,
      signup,
      loginWithGoogle,
      loginWithApple,
      logout,
      completeOnboarding,
      addFoodEntry,
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
