// node --test src/lib/recompensa.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { comemora, desfechoDoDia, marcoDaSequencia, marcoNovo } from './recompensa.ts'

test('marco so aparece nos degraus', () => {
  assert.equal(marcoDaSequencia(0), null)
  assert.equal(marcoDaSequencia(2), null)
  assert.equal(marcoDaSequencia(3), 3)
  assert.equal(marcoDaSequencia(6), 3)
  assert.equal(marcoDaSequencia(30), 30)
  assert.equal(marcoDaSequencia(999), 365)
})

test('cada marco comemora uma vez so', () => {
  assert.deepEqual(marcoNovo(7, 3), { marco: 7, guardar: 7 })
  assert.deepEqual(marcoNovo(7, 7), { marco: null, guardar: 7 })
  assert.deepEqual(marcoNovo(9, 7), { marco: null, guardar: 7 })
})

test('sequencia quebrada abaixa o marco guardado, pra poder comemorar de novo', () => {
  const quebrou = marcoNovo(1, 30)
  assert.deepEqual(quebrou, { marco: null, guardar: 0 })
  assert.deepEqual(marcoNovo(3, quebrou.guardar), { marco: 3, guardar: 3 })
})

const base = { objetivo: 'lose' as const, meta: 2000, fechado: false }

test('quem quer emagrecer nao ganha festa por chegar na meta comendo', () => {
  assert.equal(desfechoDoDia({ ...base, kcal: 2000 }), 'andando')
  assert.equal(comemora(desfechoDoDia({ ...base, kcal: 2000 })), false)
})

test('dia fechado dentro da meta e o momento bom', () => {
  assert.equal(desfechoDoDia({ ...base, kcal: 1800, fechado: true }), 'dentro')
  assert.equal(comemora(desfechoDoDia({ ...base, kcal: 1800, fechado: true })), true)
})

test('passar da meta e passar, com o dia fechado ou nao', () => {
  assert.equal(desfechoDoDia({ ...base, kcal: 2400 }), 'acima')
  assert.equal(desfechoDoDia({ ...base, kcal: 2400, fechado: true }), 'acima')
})

test('quem quer ganhar peso tem a meta como alvo, e comemora ao alcancar', () => {
  const ganhar = { objetivo: 'gain' as const, meta: 2000, fechado: false }
  assert.equal(desfechoDoDia({ ...ganhar, kcal: 1900 }), 'andando')
  assert.equal(desfechoDoDia({ ...ganhar, kcal: 2000 }), 'atingiu')
  assert.equal(comemora(desfechoDoDia({ ...ganhar, kcal: 2600 })), true)
})

test('dia sem registro nao comemora nada, nem fechado', () => {
  assert.equal(desfechoDoDia({ ...base, kcal: 0, fechado: true }), 'vazio')
  assert.equal(comemora(desfechoDoDia({ ...base, kcal: 0, fechado: true })), false)
})
