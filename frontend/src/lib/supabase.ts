import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Sessao explicita: no PWA instalado o app abre e fecha o tempo todo,
// e o padrao implicito ja mordeu antes. persistSession guarda no
// localStorage, autoRefreshToken renova o token antes de expirar.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'obliq-auth',
    flowType: 'pkce',
  },
})
