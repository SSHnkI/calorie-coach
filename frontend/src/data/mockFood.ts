import type { FoodEntry } from '../types'

const today = new Date().toISOString()

export const initialFoodLog: FoodEntry[] = [
  {
    id: '1',
    name: 'Ovos mexidos',
    quantity: 2,
    unit: 'unidades',
    kcal: 180,
    protein_g: 14,
    carbs_g: 2,
    fat_g: 12,
    confidence: 'high',
    logged_at: today,
  },
  {
    id: '2',
    name: 'Arroz branco',
    quantity: 150,
    unit: 'g',
    kcal: 195,
    protein_g: 4,
    carbs_g: 43,
    fat_g: 0,
    confidence: 'high',
    logged_at: today,
  },
  {
    id: '3',
    name: 'Frango grelhado',
    quantity: 120,
    unit: 'g',
    kcal: 198,
    protein_g: 37,
    carbs_g: 0,
    fat_g: 4,
    confidence: 'high',
    logged_at: today,
  },
]

const mockDatabase: Record<string, Omit<FoodEntry, 'id' | 'logged_at'>> = {
  'coca cola 350ml': {
    name: 'Coca-Cola',
    quantity: 350,
    unit: 'ml',
    kcal: 140,
    protein_g: 0,
    carbs_g: 35,
    fat_g: 0,
    confidence: 'high',
  },
  'coca cola': {
    name: 'Coca-Cola',
    quantity: 350,
    unit: 'ml',
    kcal: 140,
    protein_g: 0,
    carbs_g: 35,
    fat_g: 0,
    confidence: 'high',
  },
  'banana': {
    name: 'Banana',
    quantity: 1,
    unit: 'unidade',
    kcal: 105,
    protein_g: 1,
    carbs_g: 27,
    fat_g: 0,
    confidence: 'high',
  },
  'pão com manteiga': {
    name: 'Pão com manteiga',
    quantity: 1,
    unit: 'porção',
    kcal: 220,
    protein_g: 5,
    carbs_g: 28,
    fat_g: 10,
    confidence: 'medium',
  },
}

export async function mockAnalyzeFood(input: string): Promise<Omit<FoodEntry, 'id' | 'logged_at'>> {
  await new Promise((resolve) => setTimeout(resolve, 800))

  const key = input.trim().toLowerCase()
  const match = mockDatabase[key]

  if (match) return match

  return {
    name: input.trim(),
    quantity: 1,
    unit: 'porção',
    kcal: 250,
    protein_g: 10,
    carbs_g: 30,
    fat_g: 8,
    confidence: 'low',
  }
}
