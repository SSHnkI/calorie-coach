// node --test src/lib/tdee.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateBmr,
  calculateDailyKcal,
  DEFICIT_MAXIMO,
  metasPorRefeicao,
  PISO_KCAL,
} from './tdee.ts'
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

// Os pisos da meta. Sem eles o -500 fixo produzia meta de 889 kcal por dia numa
// mulher pequena e sedentaria, e o app comemorava fechar o dia nesse valor.

const pequena = {
  age: 30,
  weight_kg: 50,
  height_cm: 155,
  sex: 'female' as const,
  activity: 'sedentary' as const,
}

test('meta nunca cai abaixo do gasto de repouso', () => {
  const bmr = calculateBmr(pequena.weight_kg, pequena.height_cm, pequena.age, pequena.sex)
  const meta = calculateDailyKcal({ ...pequena, goal: 'lose' })
  assert.ok(meta >= bmr, `meta ${meta} ficou abaixo do BMR ${Math.round(bmr)}`)
})

test('o caso que motivou o piso: 889 kcal nao acontece mais', () => {
  const meta = calculateDailyKcal({ ...pequena, goal: 'lose' })
  assert.ok(meta >= PISO_KCAL.female, `meta ${meta} abaixo do piso ${PISO_KCAL.female}`)
  assert.ok(meta > 1100, `meta ${meta} continua baixa demais`)
})

test('o deficit e proporcional ao gasto, nao um numero fixo', () => {
  const manter = calculateDailyKcal({ ...pequena, goal: 'maintain' })
  const perder = calculateDailyKcal({ ...pequena, goal: 'lose' })
  assert.ok(manter - perder <= manter * DEFICIT_MAXIMO + 1, 'o corte passou de um quarto do gasto')
})

test('quem ja esta abaixo do peso nao recebe deficit', () => {
  // IMC 16,6, abaixo de 18,5.
  const magra = { ...pequena, weight_kg: 40, height_cm: 155 }
  assert.equal(
    calculateDailyKcal({ ...magra, goal: 'lose' }),
    calculateDailyKcal({ ...magra, goal: 'maintain' }),
  )
})

test('o piso de seguranca nao empurra a meta acima da manutencao', () => {
  // Se o piso absoluto fosse aplicado cru, quem gasta menos que ele receberia
  // meta de engordar por causa de uma regra que existe pra proteger.
  const manter = calculateDailyKcal({ ...pequena, goal: 'maintain' })
  const perder = calculateDailyKcal({ ...pequena, goal: 'lose' })
  assert.ok(perder <= manter, `perder ${perder} passou de manter ${manter}`)
})

test('gasto normal continua com o deficit de 500, sem regressao', () => {
  const normal = {
    age: 30,
    weight_kg: 80,
    height_cm: 180,
    sex: 'male' as const,
    activity: 'moderate' as const,
  }
  const manter = calculateDailyKcal({ ...normal, goal: 'maintain' })
  const perder = calculateDailyKcal({ ...normal, goal: 'lose' })
  assert.equal(manter - perder, 500)
})
