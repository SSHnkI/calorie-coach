// node --test src/lib/projecao.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { kgPorSemana, objetivoDaMeta, rumoDoSaldo } from './projecao.ts'

test('o mesmo saldo muda de cor conforme o objetivo', () => {
  // Meio quilo por semana de deficit: sucesso pra quem emagrece, fracasso pra
  // quem quer ganhar massa. O sinal do numero nao decide nada sozinho.
  assert.equal(rumoDoSaldo(-550, 'lose'), 'certo')
  assert.equal(rumoDoSaldo(-550, 'gain'), 'contra')
  assert.equal(rumoDoSaldo(-550, 'maintain'), 'contra')

  assert.equal(rumoDoSaldo(550, 'gain'), 'certo')
  assert.equal(rumoDoSaldo(550, 'lose'), 'contra')
})

test('saldo perto de zero e peso parado, nao progresso', () => {
  assert.equal(rumoDoSaldo(20, 'lose'), 'parado')
  assert.equal(rumoDoSaldo(-20, 'gain'), 'parado')
  // Pra quem so quer manter, parado e exatamente o alvo.
  assert.equal(rumoDoSaldo(20, 'maintain'), 'certo')
})

test('o objetivo sai da distancia entre a meta e a manutencao', () => {
  assert.equal(objetivoDaMeta(1900, 2400), 'lose')
  assert.equal(objetivoDaMeta(2700, 2400), 'gain')
  assert.equal(objetivoDaMeta(2400, 2400), 'maintain')
  // Diferenca de arredondamento nao pode virar mudanca de objetivo.
  assert.equal(objetivoDaMeta(2380, 2400), 'maintain')
})

test('mil kcal de deficit por dia dao cerca de nove decimos de quilo por semana', () => {
  assert.ok(Math.abs(kgPorSemana(-1000) + 0.909) < 0.01)
  assert.equal(kgPorSemana(0), 0)
})
