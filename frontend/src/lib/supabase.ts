import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Sessao explicita: no PWA instalado o app abre e fecha o tempo todo.
// persistSession guarda no localStorage, autoRefreshToken renova antes de expirar.
// ponytail: nao mexa em storageKey. Trocar a chave orfana toda sessao ja salva
// e desloga todo mundo no deploy seguinte.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
