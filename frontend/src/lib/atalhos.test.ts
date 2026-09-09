// node --test src/lib/atalhos.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { atalhosDoHistorico } from './atalhos.ts'
import type { FoodEntry } from '../types/index.ts'

let n = 0
const item = (name: string, kcal: number): FoodEntry => ({
  id: `i${n++}`,
  name,
  quantity: 1,
  unit: 'porção',
  kcal,
  protein_g: 1,
  carbs_g: 1,
  fat_g: 1,
  confidence: 'high',
  logged_at: new Date(2026, 8, 1).toISOString(),
})

test('so vira atalho o que se repete', () => {
  const a = atalhosDoHistorico([item('café', 4), item('café', 4), item('feijoada', 800)])
  assert.deepEqual(a.map((x) => x.nome), ['café'])
})

test('o mais repetido vem primeiro', () => {
  const a = atalhosDoHistorico([
    item('café', 4),
    item('pão', 150),
    item('café', 4),
    item('pão', 150),
    item('café', 4),
  ])
  assert.deepEqual(a.map((x) => x.nome), ['café', 'pão'])
})

test('acento e caixa nao criam dois atalhos do mesmo alimento', () => {
  const a = atalhosDoHistorico([item('Café', 4), item('cafe', 4)])
  assert.equal(a.length, 1)
  assert.equal(a[0].vezes, 2)
})

test('o numero que repete e o mais recente, que e o que voce corrigiu', () => {
  // A lista chega do mais novo pro mais antigo. O 90 e a correcao de ontem.
  const a = atalhosDoHistorico([item('café', 90), item('café', 4), item('café', 4)])
  assert.equal(a[0].kcal, 90)
  assert.equal(a[0].modelo.kcal, 90)
})

test('historico vazio nao inventa atalho', () => {
  assert.deepEqual(atalhosDoHistorico([]), [])
})

test('o limite corta a lista', () => {
  const muitos = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].flatMap((x) => [item(x, 10), item(x, 10)])
  assert.equal(atalhosDoHistorico(muitos, 4).length, 4)
})
