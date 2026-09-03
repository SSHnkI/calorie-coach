// node --test src/lib/format.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { formatQuantidade } from './format.ts'

test('uma unidade nao repete o numero', () => {
  assert.equal(formatQuantidade(1, 'bife', 300), '1 bife')
})

test('mais de uma mostra o valor por unidade, que e o que da pra conferir', () => {
  assert.equal(formatQuantidade(2, 'bife', 600), '2 bife · 300 cada')
  assert.equal(formatQuantidade(3, 'pão de queijo', 260), '3 pão de queijo · 87 cada')
})

test('meia porcao nao vira divisao', () => {
  assert.equal(formatQuantidade(0.5, 'pão', 70), '0.5 pão')
})

test('item sem caloria nao mostra "0 cada"', () => {
  assert.equal(formatQuantidade(2, 'copo', 0), '2 copo')
})
