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

test('declarado alto demais para os macros vira suspeito, sem sobrescrever', () => {
  // creme de ricota real do diario: 34 kcal declarado, macros somando 16 porque a
  // gordura ficou de fora. A referencia era 35: o declarado e que estava certo.
  const r = coerir({ kcal: 34, protein_g: 3, carbs_g: 1, fat_g: 0, grams_total: 20 })
  assert.equal(r.kcal, 34, 'nao pode sobrescrever: macro faltando e mais provavel')
  assert.equal(r.ajuste, 'suspeito')
  assert.equal(r.confiavel, false)
})

test('declarado que nao cabe nos proprios macros sobe para o piso de energia', () => {
  // 30 g de gordura nao cabem em 100 kcal. Isso e fisica, nao estimativa.
  const r = coerir({ kcal: 100, protein_g: 10, carbs_g: 10, fat_g: 30, grams_total: 120 })
  assert.equal(r.kcal, 350) // 4*10 + 4*10 + 9*30
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

test('item inflado e sinalizado, nao silenciosamente reescrito', () => {
  // Arroz de 150 g com 700 kcal, enquanto os proprios macros somam 188. Antes o
  // codigo baixava para 188. A auditoria mostrou que sobrescrever para baixo e
  // um cara ou coroa: no creme de ricota o declarado e que estava certo.
  //
  // Entao aqui a promessa e outra e mais honesta: o numero fica, mas o item
  // perde a confianca e a tela mostra "estimado" nele.
  const r = coerir({ kcal: 700, protein_g: 4, carbs_g: 42, fat_g: 0.4, grams_total: 150 })
  assert.equal(r.kcal, 700)
  assert.equal(r.ajuste, 'suspeito')
  assert.equal(r.confiavel, false)
})

test('o que de fato protege contra inflacao e a fonte, nao a trava', () => {
  // Registro de porcoes coerentes passa inteiro: nenhuma trava tem como pegar
  // superestimativa de PORCAO, que e coerente por dentro. Isso e trabalho do
  // prompt, e por isso ele ganhou porcoes caseiras brasileiras de referencia.
  const prato = [
    { kcal: 195, protein_g: 4, carbs_g: 42, fat_g: 0.4, grams_total: 150 },
    { kcal: 380, protein_g: 15, carbs_g: 40, fat_g: 15, grams_total: 220 },
    { kcal: 300, protein_g: 30, carbs_g: 0, fat_g: 20, grams_total: 130 },
  ]
  for (const item of prato) {
    assert.equal(coerir(item).ajuste, 'nenhum', JSON.stringify(item))
  }
})

test('bebida destilada nao some da conta de energia', () => {
  // Uma dose de whisky: nenhum dos tres macros, e ainda assim ~110 kcal. Sem o
  // alcool na conta, kcalDosMacros dava 0 e a conciliacao nao tinha o que
  // conferir. Com ele, o declarado e conferido de verdade.
  const dose = { kcal: 110, protein_g: 0, carbs_g: 0, fat_g: 0, alcohol_g: 16, grams_total: 50 }
  assert.equal(kcalDosMacros(dose), 112)
  assert.equal(coerir(dose).ajuste, 'nenhum')
  assert.equal(coerir(dose).kcal, 110)
})

test('destilado com kcal chutado pra baixo sobe pro piso do alcool', () => {
  // O erro classico: o modelo zera os macros e chuta 30 kcal numa dose inteira.
  const r = coerir({ kcal: 30, protein_g: 0, carbs_g: 0, fat_g: 0, alcohol_g: 16, grams_total: 50 })
  assert.equal(r.kcal, 112)
  assert.equal(r.ajuste, 'macros')
})

test('agua e cafe puro continuam podendo ser zero', () => {
  const r = coerir({ kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, alcohol_g: 0, grams_total: 200 })
  assert.equal(r.kcal, 0)
  assert.equal(r.ajuste, 'nenhum')
})
