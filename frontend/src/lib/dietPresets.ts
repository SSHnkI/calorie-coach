import { saveMealPlan, type DietDayInput, type DietItemInput } from './nutrition'
import type { Goal } from '../types'

const REF_KCAL = 2000

const it = (
  food_name: string,
  quantity: number,
  unit: string,
  kcal: number,
  protein_g: number,
  carbs_g: number,
  fat_g: number,
): DietItemInput => ({ food_name, quantity, unit, kcal, protein_g, carbs_g, fat_g })

// Semana-base real (~2000 kcal/dia). Os objetivos escalam pela meta do usuário.
const BASE_WEEK: { cafe: DietItemInput[]; almoco: DietItemInput[]; lanche: DietItemInput[]; jantar: DietItemInput[] }[] = [
  { // Seg
    cafe: [it('Ovos mexidos', 2, 'unid', 180, 14, 2, 12), it('Pão integral', 2, 'fatias', 140, 6, 24, 2)],
    almoco: [it('Frango grelhado', 150, 'g', 240, 45, 0, 6), it('Arroz', 120, 'g', 156, 3, 34, 0), it('Feijão', 80, 'g', 75, 5, 13, 0), it('Salada', 1, 'prato', 40, 2, 6, 1)],
    lanche: [it('Iogurte natural', 170, 'g', 100, 10, 8, 3), it('Banana', 1, 'unid', 105, 1, 27, 0)],
    jantar: [it('Omelete (3 ovos)', 1, 'porção', 260, 21, 2, 18), it('Legumes refogados', 1, 'prato', 90, 3, 12, 3)],
  },
  { // Ter
    cafe: [it('Tapioca com queijo', 1, 'unid', 220, 9, 30, 7), it('Café com leite', 1, 'xícara', 60, 3, 6, 2)],
    almoco: [it('Patinho moído', 150, 'g', 250, 38, 0, 11), it('Batata-doce', 150, 'g', 130, 2, 30, 0), it('Brócolis', 1, 'prato', 55, 4, 8, 1)],
    lanche: [it('Whey', 1, 'scoop', 120, 24, 3, 1), it('Maçã', 1, 'unid', 95, 0, 25, 0)],
    jantar: [it('Filé de tilápia', 150, 'g', 190, 36, 0, 4), it('Arroz', 100, 'g', 130, 3, 28, 0)],
  },
  { // Qua
    cafe: [it('Aveia com leite', 40, 'g', 200, 9, 30, 5), it('Morangos', 100, 'g', 32, 1, 8, 0)],
    almoco: [it('Frango desfiado', 150, 'g', 240, 45, 0, 6), it('Macarrão integral', 120, 'g', 170, 6, 34, 1), it('Salada', 1, 'prato', 40, 2, 6, 1)],
    lanche: [it('Pão integral + pasta de amendoim', 1, 'porção', 230, 9, 22, 12)],
    jantar: [it('Carne magra', 130, 'g', 230, 34, 0, 10), it('Purê de abóbora', 1, 'prato', 90, 2, 16, 2)],
  },
  { // Qui
    cafe: [it('Crepioca', 1, 'unid', 210, 16, 18, 9), it('Suco de laranja', 200, 'ml', 90, 1, 21, 0)],
    almoco: [it('Salmão', 130, 'g', 280, 30, 0, 17), it('Arroz', 120, 'g', 156, 3, 34, 0), it('Salada', 1, 'prato', 40, 2, 6, 1)],
    lanche: [it('Iogurte proteico', 1, 'unid', 100, 15, 6, 1), it('Castanhas', 20, 'g', 120, 3, 4, 11)],
    jantar: [it('Frango grelhado', 150, 'g', 240, 45, 0, 6), it('Legumes', 1, 'prato', 80, 3, 12, 2)],
  },
  { // Sex
    cafe: [it('Ovos + pão', 1, 'porção', 300, 18, 26, 14)],
    almoco: [it('Patinho', 150, 'g', 250, 38, 0, 11), it('Arroz e feijão', 1, 'prato', 230, 8, 45, 1), it('Salada', 1, 'prato', 40, 2, 6, 1)],
    lanche: [it('Vitamina de banana', 1, 'copo', 220, 10, 35, 4)],
    jantar: [it('Wrap de frango', 1, 'unid', 320, 28, 30, 10)],
  },
  { // Sáb
    cafe: [it('Panqueca de banana', 2, 'unid', 260, 12, 36, 7)],
    almoco: [it('Strogonoff de frango', 1, 'prato', 380, 32, 18, 18), it('Arroz', 120, 'g', 156, 3, 34, 0)],
    lanche: [it('Iogurte + granola', 1, 'porção', 210, 9, 30, 6)],
    jantar: [it('Hambúrguer caseiro', 1, 'unid', 350, 28, 22, 16)],
  },
  { // Dom
    cafe: [it('Ovos mexidos', 2, 'unid', 180, 14, 2, 12), it('Fruta', 1, 'unid', 90, 1, 22, 0)],
    almoco: [it('Frango assado', 160, 'g', 270, 48, 0, 8), it('Batata', 150, 'g', 130, 3, 28, 0), it('Salada', 1, 'prato', 45, 2, 7, 1)],
    lanche: [it('Queijo + tomate', 1, 'porção', 150, 11, 4, 10)],
    jantar: [it('Sopa de legumes com frango', 1, 'prato', 240, 22, 18, 8)],
  },
]

const GOAL_NAME: Record<Goal, string> = {
  lose: 'Emagrecer',
  maintain: 'Manter',
  gain: 'Ganhar massa',
}

export async function createDietPreset(
  goal: Goal,
  targetKcal: number,
  targetUserId?: string,
): Promise<string> {
  const f = (targetKcal || REF_KCAL) / REF_KCAL
  const scale = (it: DietItemInput): DietItemInput => ({
    food_name: it.food_name,
    quantity: it.quantity != null ? Math.round(it.quantity * f * 10) / 10 : null,
    unit: it.unit,
    kcal: Math.round(it.kcal * f),
    protein_g: Math.round(it.protein_g * f),
    carbs_g: Math.round(it.carbs_g * f),
    fat_g: Math.round(it.fat_g * f),
  })

  const days: DietDayInput[] = BASE_WEEK.map((d, i) => ({
    day_of_week: i,
    meals: [
      { meal_type: 'cafe', items: d.cafe.map(scale) },
      { meal_type: 'almoco', items: d.almoco.map(scale) },
      { meal_type: 'lanche', items: d.lanche.map(scale) },
      { meal_type: 'jantar', items: d.jantar.map(scale) },
    ],
  }))

  return saveMealPlan({ name: `Dieta — ${GOAL_NAME[goal]}`, goal, days }, targetUserId)
}
