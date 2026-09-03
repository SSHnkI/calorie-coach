// node --test src/components/layout/destinoDaRota.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { destinoDaRota } from './destinoDaRota.ts'

const base = { carregando: false, autenticado: true, perfilPronto: true, onboardingCompleto: true }

test('sessao de pe com o perfil ainda a caminho espera, nao manda pro onboarding', () => {
  assert.equal(destinoDaRota({ ...base, perfilPronto: false, onboardingCompleto: false }), 'espera')
})

test('perfil chegou dizendo que falta onboarding manda pro onboarding', () => {
  assert.equal(destinoDaRota({ ...base, onboardingCompleto: false }), 'onboarding')
})

test('sem sessao vai pro auth mesmo com o resto zerado', () => {
  assert.equal(destinoDaRota({ ...base, autenticado: false, perfilPronto: false }), 'auth')
})

test('carregando ganha de tudo', () => {
  assert.equal(destinoDaRota({ ...base, carregando: true, autenticado: false }), 'espera')
})

test('tudo pronto entra no app', () => {
  assert.equal(destinoDaRota(base), 'app')
})
