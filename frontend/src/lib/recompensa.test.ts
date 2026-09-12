// node --test src/lib/recompensa.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { comemora, desfechoDoDia, marcoDaSequencia, marcoNovo, PISO_DO_DIA } from './recompensa.ts'

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

// O piso do dia. Sem ele, 800 kcal de uma meta de 1800 fechava o dia com a mesma
// festa que 1750, e o app premiava tanto a restricao quanto o dia mal anotado.

test('dia fechado muito abaixo da meta nao comemora', () => {
  const d = desfechoDoDia({ objetivo: 'lose', kcal: 800, meta: 1800, fechado: true })
  assert.equal(d, 'anotado')
  assert.equal(comemora(d), false)
})

test('uma linha solta nao fecha o dia em festa', () => {
  // O caso do registro incompleto: quem anotou so o cafe da manha e esqueceu o
  // resto recebia premio por ter esquecido.
  const d = desfechoDoDia({ objetivo: 'lose', kcal: 300, meta: 2000, fechado: true })
  assert.equal(comemora(d), false)
})

test('dia comedido de verdade continua comemorando', () => {
  const d = desfechoDoDia({ objetivo: 'lose', kcal: 1750, meta: 1800, fechado: true })
  assert.equal(d, 'dentro')
  assert.equal(comemora(d), true)
})

test('o piso fica exatamente onde foi declarado', () => {
  const meta = 2000
  assert.equal(desfechoDoDia({ objetivo: 'lose', kcal: meta * PISO_DO_DIA, meta, fechado: true }), 'dentro')
  assert.equal(desfechoDoDia({ objetivo: 'lose', kcal: meta * PISO_DO_DIA - 1, meta, fechado: true }), 'anotado')
})

test('quem quer ganhar peso nao e afetado pelo piso', () => {
  // Para `gain` a meta e alvo a alcancar, e a regra continua sendo outra.
  assert.equal(desfechoDoDia({ objetivo: 'gain', kcal: 2100, meta: 2000, fechado: true }), 'atingiu')
  assert.equal(desfechoDoDia({ objetivo: 'gain', kcal: 800, meta: 2000, fechado: true }), 'andando')
})
