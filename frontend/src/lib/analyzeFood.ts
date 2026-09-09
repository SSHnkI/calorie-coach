import { supabase } from './supabase'
import type { FoodEntry, NutritionResult } from '../types'

export type ErroDeAnalise = 'limit_reached' | 'unauthorized' | 'nao_gravou' | 'failed'

export type AnalyzeResult =
  // `itens` sao as linhas gravadas, com id e hora: a tela mostra elas direto em
  // vez de recarregar o dia inteiro numa segunda ida de rede.
  | { ok: true; itens: FoodEntry[]; analysesRemaining: number | null }
  | { ok: false; error: ErroDeAnalise; analysesUsed?: number; limit?: number }

// Estima macros de um alimento SEM registrar no diário (para edição de dieta).
export async function estimateFood(input: string): Promise<NutritionResult | null> {
  const { data, error } = await supabase.functions.invoke('analyze-food', {
    body: { food_input: input, log: false },
  })
  if (error || !data) return null
  const { analyses_remaining: _ignore, ...n } = data as NutritionResult & {
    analyses_remaining?: number | null
  }
  return n as NutritionResult
}

// Chama a Edge Function `analyze-food`.
export async function analyzeFood(
  input: string,
  image?: string,
  audio?: string,
  // Registro retroativo. Sem isto, a refeicao cai na hora da chamada.
  quando?: Date,
): Promise<AnalyzeResult> {
  const { data, error } = await supabase.functions.invoke('analyze-food', {
    body: {
      food_input: input,
      ...(image ? { image } : {}),
      ...(audio ? { audio } : {}),
      ...(quando ? { logged_at: quando.toISOString() } : {}),
    },
  })

  // Respostas não-2xx (ex.: 402 limite atingido) chegam como FunctionsHttpError;
  // o corpo fica em error.context (um Response).
  if (error) {
    try {
      const body = await (error as { context?: Response }).context?.json?.()
      if (body?.error === 'limit_reached') {
        return { ok: false, error: 'limit_reached', analysesUsed: body.analyses_used, limit: body.limit }
      }
      if (body?.error === 'unauthorized') {
        return { ok: false, error: 'unauthorized' }
      }
      // A analise foi, a gravacao nao. Vale tentar de novo, e o texto continua
      // na mao de quem escreveu.
      if (body?.error === 'nao_gravou') {
        return { ok: false, error: 'nao_gravou' }
      }
    } catch {
      // corpo nao-JSON, cai no erro generico abaixo
    }
    return { ok: false, error: 'failed' }
  }

  if (!data) return { ok: false, error: 'failed' }

  const corpo = data as {
    items?: FoodEntry[]
    analyses_remaining?: number | null
  } & NutritionResult
  const itens = (corpo.items ?? []).filter((i) => !!i?.id)
  if (!itens.length) return { ok: false, error: 'failed' }

  return { ok: true, itens, analysesRemaining: corpo.analyses_remaining ?? null }
}
