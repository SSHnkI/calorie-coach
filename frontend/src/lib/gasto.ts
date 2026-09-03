import { supabase } from './supabase'

// Gasto extra do dia, digitado a mao. Uma linha por usuario por dia.
// A data e local, nao UTC: o dia do usuario e o que ele ve no relogio dele.
export function chaveDoDia(dia: Date): string {
  const m = String(dia.getMonth() + 1).padStart(2, '0')
  const d = String(dia.getDate()).padStart(2, '0')
  return `${dia.getFullYear()}-${m}-${d}`
}

async function meuId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

export async function fetchGasto(dia: Date): Promise<number> {
  const uid = await meuId()
  if (!uid) return 0

  const { data, error } = await supabase
    .from('gasto_diario')
    .select('kcal')
    .eq('user_id', uid)
    .eq('dia', chaveDoDia(dia))
    .maybeSingle()

  if (error) throw error
  return data?.kcal ?? 0
}

// Zero apaga a linha em vez de guardar um zero: dia sem gasto e dia sem linha.
export async function salvarGasto(dia: Date, kcal: number): Promise<void> {
  const uid = await meuId()
  if (!uid) return
  const chave = chaveDoDia(dia)

  if (kcal <= 0) {
    const { error } = await supabase
      .from('gasto_diario')
      .delete()
      .eq('user_id', uid)
      .eq('dia', chave)
    if (error) throw error
    return
  }

  const { error } = await supabase
    .from('gasto_diario')
    .upsert(
      { user_id: uid, dia: chave, kcal, atualizado_em: new Date().toISOString() },
      { onConflict: 'user_id,dia' },
    )
  if (error) throw error
}
