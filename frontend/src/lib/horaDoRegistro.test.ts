// node --test src/lib/horaDoRegistro.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { horaNoDia } from './horaDoRegistro.ts'

const quarta = new Date(2026, 8, 2) // 2 de setembro de 2026, meia-noite local
const em = (h: number, m = 0) => ({ logged_at: new Date(2026, 8, 2, h, m).toISOString() })

test('dia vazio carimba meio-dia', () => {
  const d = horaNoDia(quarta, [])
  assert.equal(d.getHours(), 12)
  assert.equal(d.getDate(), 2)
})

test('o item novo entra depois do ultimo do dia, nao no meio', () => {
  // o defeito relatado: lista com registro das 20h, anotando as 14h
  const d = horaNoDia(quarta, [em(8), em(20), em(12)])
  assert.ok(d.getTime() > new Date(2026, 8, 2, 20).getTime(), 'tem que ficar depois das 20h')
  assert.equal(d.getHours(), 20)
  assert.equal(d.getMinutes(), 1)
})

test('a ordem da lista de entrada nao importa, vale a mais tardia', () => {
  const crescente = horaNoDia(quarta, [em(8), em(12), em(20)])
  const decrescente = horaNoDia(quarta, [em(20), em(12), em(8)])
  assert.equal(crescente.getTime(), decrescente.getTime())
})

test('perto da meia-noite nao vaza pro dia seguinte', () => {
  const d = horaNoDia(quarta, [em(23, 59)])
  assert.equal(d.getDate(), 2, 'continua no dia 2')
  assert.equal(d.getHours(), 23)
  assert.equal(d.getMinutes(), 59)
})

test('registro com data suja e ignorado em vez de estragar a conta', () => {
  const d = horaNoDia(quarta, [{ logged_at: 'nao e data' }, em(9)])
  assert.equal(d.getHours(), 9)
  assert.equal(d.getMinutes(), 1)
})

test('anotar varios seguidos mantem cada um acima do anterior', () => {
  const lista = [em(8)]
  const primeiro = horaNoDia(quarta, lista)
  lista.push({ logged_at: primeiro.toISOString() })
  const segundo = horaNoDia(quarta, lista)
  assert.ok(segundo.getTime() > primeiro.getTime())
})
