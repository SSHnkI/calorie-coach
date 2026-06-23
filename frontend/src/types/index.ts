export type Sex = 'male' | 'female'

export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very_active'

export type Goal = 'lose' | 'maintain' | 'gain'

export type SubscriptionStatus = 'free' | 'active'

export type UserProfile = {
  email: string
  age: number
  weight_kg: number
  height_cm: number
  sex: Sex
  activity: ActivityLevel
  goal: Goal
  daily_kcal: number
  subscription_status: SubscriptionStatus
  onboarding_complete: boolean
}

export type FoodEntry = {
  id: string
  name: string
  quantity: number
  unit: string
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  confidence: 'high' | 'medium' | 'low'
  logged_at: string
}

export type NutritionResult = Omit<FoodEntry, 'id' | 'logged_at'>

export type Exercise = {
  id: string
  name: string
  muscle: string
  sets: number
  reps: string
  pro: boolean
}

export type OnboardingData = Pick<
  UserProfile,
  'age' | 'weight_kg' | 'height_cm' | 'sex' | 'activity' | 'goal'
>
