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

export type MuscleGroup =
  | 'peito'
  | 'costas'
  | 'ombro'
  | 'biceps'
  | 'triceps'
  | 'pernas'
  | 'abdomen'

export type Difficulty = 'iniciante' | 'intermediario' | 'avancado'

// Exercício do catálogo (tabela `exercises` no Supabase)
export type CatalogExercise = {
  id: string
  name: string
  muscle_group: MuscleGroup
  difficulty: Difficulty | null
  description: string | null
  muscles_worked: string | null
  image_url: string | null
  video_url: string | null
}

export type MealType = 'cafe' | 'almoco' | 'lanche' | 'jantar' | 'ceia'

export type MealPlan = {
  id: string
  user_id: string
  name: string
  goal: Goal | null
  created_at: string
}

export type Meal = {
  id: string
  meal_plan_id: string
  day_of_week: number
  meal_type: MealType
  order_index: number
}

export type MealItem = {
  id: string
  meal_id: string
  food_name: string
  quantity: number | null
  unit: string | null
  kcal: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
}

export type WorkoutGoal = 'hipertrofia' | 'emagrecimento' | 'condicionamento'

// Modelo de treino (tabela `workout_plans`)
export type WorkoutPlan = {
  id: string
  user_id: string
  name: string
  goal: WorkoutGoal | null
  created_at: string
}

// Exercício dentro de um modelo (tabela `workout_exercises`)
export type WorkoutExercise = {
  id: string
  plan_id: string
  exercise_id: string
  sets: number
  reps: string
  rest_seconds: number
  target_weight_kg: number | null
  notes: string | null
  order_index: number
}
