// node --test src/lib/horaDoRegistro.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { horaNoPeriodo } from './horaDoRegistro.ts'
import { periodoDaHora } from './periodos.ts'

const quarta = new Date(2026, 8, 2) // 2 de setembro de 2026, meia-noite local
const em = (h: number, m = 0) => ({ logged_at: new Date(2026, 8, 2, h, m).toISOString() })

test('a hora cai dentro da janela escolhida', () => {
  for (const p of ['manha', 'almoco', 'tarde', 'noite'] as const) {
    const d = horaNoPeriodo(quarta, p, [])
    assert.equal(periodoDaHora(d.getHours()), p, `${p} carimbou fora da propria janela`)
    assert.equal(d.getDate(), 2)
  }
})

test('o item novo entra depois do ultimo DAQUELE periodo, nao no meio', () => {
  // o defeito relatado: lista com registro das 20h, anotando as 14h
  const d = horaNoPeriodo(quarta, 'noite', [em(8), em(20), em(12)])
  assert.ok(d.getTime() > new Date(2026, 8, 2, 20).getTime(), 'tem que ficar depois das 20h')
  assert.equal(d.getHours(), 20)
  assert.equal(d.getMinutes(), 1)
})

test('registro de outro periodo nao empurra o do periodo escolhido', () => {
  const d = horaNoPeriodo(quarta, 'manha', [em(20)])
  assert.equal(periodoDaHora(d.getHours()), 'manha')
})

test('a ordem da lista de entrada nao importa, vale a mais tardia', () => {
  const crescente = horaNoPeriodo(quarta, 'noite', [em(19), em(20), em(21)])
  const decrescente = horaNoPeriodo(quarta, 'noite', [em(21), em(20), em(19)])
  assert.equal(crescente.getTime(), decrescente.getTime())
})

test('perto da meia-noite nao vaza pro dia seguinte', () => {
  const d = horaNoPeriodo(quarta, 'noite', [em(23, 59)])
  assert.equal(d.getDate(), 2, 'continua no dia 2')
  assert.equal(d.getHours(), 23)
  assert.equal(d.getMinutes(), 59)
})

test('janela curta tambem nao vaza pra janela seguinte', () => {
  // almoco vai das 12h as 14h; um registro as 13h59 nao pode virar 14h
  const d = horaNoPeriodo(quarta, 'almoco', [em(13, 59)])
  assert.equal(periodoDaHora(d.getHours()), 'almoco')
  assert.equal(d.getHours(), 13)
  assert.equal(d.getMinutes(), 59)
})

test('registro com data suja e ignorado em vez de estragar a conta', () => {
  const d = horaNoPeriodo(quarta, 'manha', [{ logged_at: 'nao e data' }, em(9)])
  assert.equal(d.getHours(), 9)
  assert.equal(d.getMinutes(), 1)
})

test('anotar varios seguidos mantem cada um acima do anterior', () => {
  const lista = [em(8)]
  const primeiro = horaNoPeriodo(quarta, 'manha', lista)
  lista.push({ logged_at: primeiro.toISOString() })
  const segundo = horaNoPeriodo(quarta, 'manha', lista)
  assert.ok(segundo.getTime() > primeiro.getTime())
})

test('a madrugada pertence a noite', () => {
  assert.equal(periodoDaHora(1), 'noite')
  assert.equal(periodoDaHora(4), 'noite')
  assert.equal(periodoDaHora(5), 'manha')
  assert.equal(periodoDaHora(11), 'manha')
  assert.equal(periodoDaHora(12), 'almoco')
  assert.equal(periodoDaHora(13), 'almoco')
  assert.equal(periodoDaHora(14), 'tarde')
  assert.equal(periodoDaHora(17), 'tarde')
  assert.equal(periodoDaHora(18), 'noite')
})
