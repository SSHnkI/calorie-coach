// node --test src/lib/semaforo.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { faixaDoConsumo, FOLGA, preenchimento } from './semaforo.ts'

test('coluna sem registro nao tem cor', () => {
  assert.equal(faixaDoConsumo(0, 700), 'vazio')
})

test('com folga e verde, encostando na meta e ambar, passando e vermelho', () => {
  assert.equal(faixaDoConsumo(300, 700), 'folga')
  assert.equal(faixaDoConsumo(700 * FOLGA - 1, 700), 'folga')
  assert.equal(faixaDoConsumo(700 * FOLGA + 1, 700), 'limite')
  assert.equal(faixaDoConsumo(700, 700), 'limite', 'na meta ainda nao passou')
  assert.equal(faixaDoConsumo(701, 700), 'passou')
})

test('sem meta o numero nao pode virar alarme falso', () => {
  // meta zerada acontece antes de o perfil carregar; dividir por ela pintaria
  // tudo de vermelho na abertura.
  assert.equal(faixaDoConsumo(500, 0), 'folga')
})

test('o preenchimento acompanha o quanto entrou', () => {
  assert.equal(preenchimento(0, 700), 0, 'coluna vazia nao desenha barra')
  assert.equal(preenchimento(350, 700), 50)
  assert.equal(preenchimento(700, 700), 100)
})

test('passar da meta nao vaza pra fora da coluna', () => {
  // O vermelho ja diz que passou. Barra maior que a caixa so quebraria o
  // alinhamento das quatro colunas.
  assert.equal(preenchimento(2000, 700), 100)
})

test('registro pequeno ainda aparece', () => {
  // 1% e visualmente igual a coluna vazia, e as duas coisas sao opostas.
  assert.ok(preenchimento(5, 700) >= 4)
})
