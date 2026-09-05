// node --test src/lib/semaforo.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { faixaDoConsumo, FOLGA, MARCA_DA_META, preenchimento, TETO } from './semaforo.ts'

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

test('a barra so enche no teto, nao na meta', () => {
  // Encher no proprio alvo apagava a diferenca entre acertar e estourar.
  assert.equal(preenchimento(700, 700), MARCA_DA_META)
  assert.ok(preenchimento(700, 700) < 100, 'bater a meta nao pode encher a barra')
  assert.equal(preenchimento(700 * TETO, 700), 100)
})

test('o preenchimento acompanha o quanto entrou', () => {
  assert.equal(preenchimento(0, 700), 0, 'coluna vazia nao desenha nada')
  assert.equal(preenchimento(350, 700), 40)
  assert.ok(preenchimento(600, 700) > preenchimento(350, 700))
})

test('passar do teto nao vaza pra fora da coluna', () => {
  // Dali pra frente o vermelho ja disse tudo. Barra maior que a caixa so
  // quebraria o alinhamento das quatro colunas.
  assert.equal(preenchimento(2000, 700), 100)
})

test('registro pequeno ainda aparece', () => {
  // 1% e visualmente igual a coluna vazia, e as duas coisas sao opostas.
  assert.ok(preenchimento(5, 700) >= 4)
  assert.ok(preenchimento(5, 700, 12) >= 12, 'a coluna do dia precisa de mais')
})
