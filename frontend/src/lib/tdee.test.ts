// node --test src/lib/tdee.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateDailyKcal, metasPorRefeicao } from './tdee.ts'
import { PERIODOS } from './periodos.ts'

test('as quatro refeicoes somam exatamente a meta do dia', () => {
  for (const meta of [1200, 1850, 2000, 2317, 3400]) {
    const m = metasPorRefeicao(PERIODOS, meta)
    const soma = PERIODOS.reduce((s, j) => s + m[j.id], 0)
    assert.equal(soma, meta, `meta ${meta} nao fechou`)
  }
})

test('o almoco e a maior refeicao do dia', () => {
  // O defeito relatado: almoco com 220 kcal, porque a meta era repartida pelo
  // gasto por hora e a janela do almoco dura so duas horas.
  const m = metasPorRefeicao(PERIODOS, 2000)
  assert.ok(m.almoco > m.manha, 'almoco tem que passar a manha')
  assert.ok(m.almoco > m.noite, 'almoco tem que passar a noite')
  assert.ok(m.almoco > m.tarde, 'almoco tem que passar a tarde')
  assert.ok(m.almoco >= 650 && m.almoco <= 750, `almoco fora do razoavel: ${m.almoco}`)
})

test('nenhuma refeicao fica com meta risivel', () => {
  const m = metasPorRefeicao(PERIODOS, 1500)
  for (const j of PERIODOS) {
    assert.ok(m[j.id] >= 200, `${j.id} ficou com ${m[j.id]}`)
  }
})

test('as fatias somam o dia inteiro', () => {
  const soma = PERIODOS.reduce((s, j) => s + j.fatia, 0)
  assert.ok(Math.abs(soma - 1) < 1e-9, `fatias somam ${soma}`)
})

test('a meta do dia continua vindo do perfil', () => {
  const base = {
    age: 30,
    weight_kg: 80,
    height_cm: 180,
    sex: 'male' as const,
    activity: 'moderate' as const,
  }
  const perder = calculateDailyKcal({ ...base, goal: 'lose' })
  const manter = calculateDailyKcal({ ...base, goal: 'maintain' })
  assert.equal(manter - perder, 500)
})
