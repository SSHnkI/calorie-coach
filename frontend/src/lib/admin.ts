import { supabase } from './supabase'
import type { SubscriptionStatus } from '../types'

export type AdminUser = {
  id: string          // profiles.id = auth.users.id
  email: string
  full_name: string | null
  subscription_status: SubscriptionStatus
  onboarding_complete: boolean
  created_at: string
  plan_count: number
  trainer_id: string | null
}

export async function fetchAllUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, subscription_status, onboarding_complete, created_at, trainer_id, workout_plans(count)')
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((p: any) => ({
    id: p.id,
    email: p.email,
    full_name: p.full_name ?? null,
    subscription_status: p.subscription_status,
    onboarding_complete: p.onboarding_complete,
    created_at: p.created_at,
    plan_count: p.workout_plans?.[0]?.count ?? 0,
    trainer_id: p.trainer_id ?? null,
  }))
}

export async function setUserPro(userId: string, isPro: boolean): Promise<void> {
  const { error } = await supabase.rpc('admin_set_pro', { target_id: userId, pro: isPro })
  if (error) throw error
}

export async function fetchPlansForUser(userId: string) {
  const { data, error } = await supabase
    .from('workout_plans')
    .select('id, user_id, name, goal, created_at, workout_exercises(count)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) throw error

  return (data ?? []).map((p: any) => ({
    ...p,
    exercise_count: p.workout_exercises?.[0]?.count ?? 0,
  }))
}

export async function copyPlanToUser(planId: string, targetUserId: string): Promise<void> {
  const { data: plan, error: planErr } = await supabase
    .from('workout_plans')
    .select('name, goal')
    .eq('id', planId)
    .single()
  if (planErr) throw planErr

  const { data: exercises, error: exErr } = await supabase
    .from('workout_exercises')
    .select('exercise_id, sets, reps, rest_seconds, target_weight_kg, notes, order_index')
    .eq('plan_id', planId)
    .order('order_index', { ascending: true })
  if (exErr) throw exErr

  const { data: newPlan, error: insertErr } = await supabase
    .from('workout_plans')
    .insert({ user_id: targetUserId, name: plan.name, goal: plan.goal })
    .select('id')
    .single()
  if (insertErr) throw insertErr

  if (exercises && exercises.length > 0) {
    const rows = exercises.map((e: any) => ({ ...e, plan_id: newPlan.id }))
    const { error: rowErr } = await supabase.from('workout_exercises').insert(rows)
    if (rowErr) throw rowErr
  }
}

// ── Trainers ──────────────────────────────────────────────────────────────────

export type Trainer = {
  id: string
  user_id: string | null
  name: string
  email: string
  code: string
  is_trainer?: boolean
  is_nutri?: boolean
  created_at: string
  client_count?: number
}

export async function fetchAllTrainers(): Promise<Trainer[]> {
  const { data, error } = await supabase
    .from('professionals')
    .select('id, user_id, name, email, code, is_trainer, is_nutri, created_at')
    .order('created_at', { ascending: false })
  if (error) throw error

  const pros = data ?? []
  const ids = pros.map((t: any) => t.id)
  let counts: Record<string, number> = {}
  if (ids.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('professional_id')
      .in('professional_id', ids)
    for (const p of (profiles ?? []) as any[]) {
      counts[p.professional_id] = (counts[p.professional_id] ?? 0) + 1
    }
  }

  return pros.map((t: any) => ({ ...t, client_count: counts[t.id] ?? 0 }))
}

export async function createTrainer(
  name: string,
  email: string,
  code: string,
  isTrainer = true,
  isNutri = false,
): Promise<void> {
  const { error } = await supabase.from('professionals').insert({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    code: code.trim().toUpperCase(),
    is_trainer: isTrainer,
    is_nutri: isNutri,
  })
  if (error) throw error
}

export async function deleteTrainer(id: string): Promise<void> {
  await supabase.from('profiles').update({ professional_id: null }).eq('professional_id', id)
  const { error } = await supabase.from('professionals').delete().eq('id', id)
  if (error) throw error
}
