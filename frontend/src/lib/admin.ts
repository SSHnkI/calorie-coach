import { supabase } from './supabase'
import type { SubscriptionStatus } from '../types'

export type AdminUser = {
  id: string
  user_id: string
  email: string
  full_name: string | null
  subscription_status: SubscriptionStatus
  onboarding_complete: boolean
  created_at: string
  plan_count: number
}

export async function fetchAllUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, user_id, email, full_name, subscription_status, onboarding_complete, created_at, workout_plans(count)')
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((p: any) => ({
    id: p.id,
    user_id: p.user_id,
    email: p.email,
    full_name: p.full_name ?? null,
    subscription_status: p.subscription_status,
    onboarding_complete: p.onboarding_complete,
    created_at: p.created_at,
    plan_count: p.workout_plans?.[0]?.count ?? 0,
  }))
}

export async function setUserPro(userId: string, isPro: boolean): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ subscription_status: isPro ? 'active' : 'free' })
    .eq('user_id', userId)
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
  // 1. Fetch original plan
  const { data: plan, error: planErr } = await supabase
    .from('workout_plans')
    .select('name, goal')
    .eq('id', planId)
    .single()
  if (planErr) throw planErr

  // 2. Fetch exercises
  const { data: exercises, error: exErr } = await supabase
    .from('workout_exercises')
    .select('exercise_id, sets, reps, rest_seconds, target_weight_kg, notes, order_index')
    .eq('plan_id', planId)
    .order('order_index', { ascending: true })
  if (exErr) throw exErr

  // 3. Create new plan for target user
  const { data: newPlan, error: insertErr } = await supabase
    .from('workout_plans')
    .insert({ user_id: targetUserId, name: plan.name, goal: plan.goal })
    .select('id')
    .single()
  if (insertErr) throw insertErr

  // 4. Copy exercises
  if (exercises && exercises.length > 0) {
    const rows = exercises.map((e: any) => ({ ...e, plan_id: newPlan.id }))
    const { error: rowErr } = await supabase.from('workout_exercises').insert(rows)
    if (rowErr) throw rowErr
  }
}
