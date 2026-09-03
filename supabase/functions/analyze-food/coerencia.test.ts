// node --test supabase/functions/analyze-food/coerencia.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { coerir, kcalDosMacros, MAX_KCAL_POR_GRAMA } from './coerencia.ts'

test('kcal coerente com os macros passa intacto', () => {
  // arroz cozido, 150 g: 195 kcal, 4 P, 42 C, 0.4 G
  const r = coerir({ kcal: 195, protein_g: 4, carbs_g: 42, fat_g: 0.4, grams_total: 150 })
  assert.equal(r.kcal, 195)
  assert.equal(r.ajuste, 'nenhum')
  assert.equal(r.confiavel, true)
})

test('kcal inflado contra os macros e puxado de volta para a soma', () => {
  // o defeito real: arroz de 150 g virando 700 kcal por causa do Open Food Facts,
  // enquanto os proprios macros do item somam 189
  const r = coerir({ kcal: 700, protein_g: 4, carbs_g: 42, fat_g: 0.4, grams_total: 150 })
  assert.equal(r.kcal, 188) // 4*4 + 4*42 + 9*0.4 = 187.6
  assert.equal(r.ajuste, 'macros')
  assert.equal(r.confiavel, false)
})

test('densidade impossivel e cortada no limite fisico', () => {
  // 1900 kcal/100g, que foi o que o OFF devolveu para "rice"
  const r = coerir({ kcal: 1900, protein_g: 40, carbs_g: 300, fat_g: 60, grams_total: 100 })
  assert.equal(r.kcal, 100 * MAX_KCAL_POR_GRAMA)
  assert.equal(r.ajuste, 'densidade')
})

test('item sem macro nenhum nao vira zero kcal', () => {
  // cafe puro: 5 kcal e macros zerados. Conciliar aqui apagaria o item.
  const r = coerir({ kcal: 5, protein_g: 0, carbs_g: 0, fat_g: 0, grams_total: 200 })
  assert.equal(r.kcal, 5)
  assert.equal(r.ajuste, 'nenhum')
})

test('diferenca pequena cabe na tolerancia, fibra nao entra em Atwater', () => {
  // macros somam 200, declarado 220: 9% de diferenca, dentro dos 25%
  const r = coerir({ kcal: 220, protein_g: 10, carbs_g: 30, fat_g: 4.4, grams_total: 100 })
  assert.equal(r.kcal, 220)
  assert.equal(r.ajuste, 'nenhum')
})

test('sem peso da porcao a trava de densidade nao se aplica', () => {
  const r = coerir({ kcal: 500, protein_g: 20, carbs_g: 60, fat_g: 20 })
  assert.equal(r.kcal, 500)
  assert.equal(r.ajuste, 'nenhum')
})

test('numero sujo do modelo nao explode a conta', () => {
  const r = coerir({
    kcal: Number('abc'),
    protein_g: -5,
    carbs_g: 30,
    fat_g: 10,
    grams_total: 100,
  } as never)
  assert.equal(r.kcal, kcalDosMacros({ kcal: 0, protein_g: 0, carbs_g: 30, fat_g: 10 }))
  assert.ok(Number.isFinite(r.kcal))
})

test('o prato do usuario, com o defeito e sem ele', () => {
  const comDefeito = [
    { kcal: 700, protein_g: 4, carbs_g: 42, fat_g: 0.4, grams_total: 150 }, // arroz inflado
    { kcal: 340, protein_g: 16, carbs_g: 30, fat_g: 16, grams_total: 200 }, // lasanha
    { kcal: 264, protein_g: 32, carbs_g: 0, fat_g: 15, grams_total: 120 }, // bife
  ]
  const antes = comDefeito.reduce((s, i) => s + i.kcal, 0)
  const depois = comDefeito.reduce((s, i) => s + coerir(i).kcal, 0)
  assert.equal(antes, 1304)
  assert.ok(depois < 800, `esperava menos de 800, deu ${depois}`)
})
