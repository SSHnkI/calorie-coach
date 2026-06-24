import { supabase } from './supabase'
import type { NutritionResult } from '../types'

export type AnalyzeResult =
  | { ok: true; nutrition: NutritionResult; analysesRemaining: number | null }
  | { ok: false; error: 'limit_reached' | 'unauthorized' | 'failed'; analysesUsed?: number; limit?: number }

// Chama a Edge Function `analyze-food` (Gemini) para estimar os macros do alimento.
export async function analyzeFood(input: string): Promise<AnalyzeResult> {
  const { data, error } = await supabase.functions.invoke('analyze-food', {
    body: { food_input: input },
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
    } catch {
      // corpo não-JSON — cai no erro genérico abaixo
    }
    return { ok: false, error: 'failed' }
  }

  if (!data) return { ok: false, error: 'failed' }

  const { analyses_remaining, ...nutrition } = data as NutritionResult & { analyses_remaining: number | null }
  return { ok: true, nutrition, analysesRemaining: analyses_remaining ?? null }
}
