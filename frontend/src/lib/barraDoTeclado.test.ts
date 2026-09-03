// node --test src/lib/barraDoTeclado.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { proximoDeslocamento } from './barraDoTeclado.ts'

// Simula uma barra: subir `desloc` move o fundo dela para cima na mesma medida.
function converge(fundoSemDesloc: number, alturaVisivel: number, passos = 5) {
  let atual = 0
  for (let i = 0; i < passos; i++) {
    atual = proximoDeslocamento({
      fundoDaBarra: fundoSemDesloc - atual,
      alturaVisivel,
      deslocamentoVisual: 0,
      atual,
    })
  }
  return { desloc: atual, fundoFinal: fundoSemDesloc - atual }
}

test('sem teclado a barra ja esta no lugar e nada se move', () => {
  assert.equal(converge(800, 800).desloc, 0)
})

test('navegador que nao mexe na barra: ela sobe a altura inteira do teclado', () => {
  // Janela de 800, teclado de 340: area visivel 460, barra ainda no fundo.
  const { desloc, fundoFinal } = converge(800, 460)
  assert.equal(desloc, 340)
  assert.equal(fundoFinal, 460)
})

test('navegador que ja empurrou a barra sozinho: corrige so o que falta', () => {
  // O iOS ja levantou 300; falta 40 para encostar nos 460.
  const { desloc, fundoFinal } = converge(500, 460)
  assert.equal(desloc, 40)
  assert.equal(fundoFinal, 460)
})

test('navegador que empurrou demais: a barra desce de volta', () => {
  // Levantou 500 quando bastavam 340: a barra ficou acima da area visivel e
  // precisa descer, senao sobra uma faixa vazia embaixo dela.
  const { desloc, fundoFinal } = converge(300, 460)
  assert.equal(desloc, -160)
  assert.equal(fundoFinal, 460)
})

test('uma correcao ja fecha a conta, nao fica indo e voltando', () => {
  const um = proximoDeslocamento({
    fundoDaBarra: 800,
    alturaVisivel: 460,
    deslocamentoVisual: 0,
    atual: 0,
  })
  const dois = proximoDeslocamento({
    fundoDaBarra: 800 - um,
    alturaVisivel: 460,
    deslocamentoVisual: 0,
    atual: um,
  })
  assert.equal(um, 340)
  assert.equal(dois, um, 'a segunda medicao nao pode mexer de novo')
})

test('meio pixel de arredondamento nao faz a barra tremer', () => {
  const d = proximoDeslocamento({
    fundoDaBarra: 460.4,
    alturaVisivel: 460,
    deslocamentoVisual: 0,
    atual: 12,
  })
  assert.equal(d, 12)
})

test('pagina rolada dentro da area visivel entra na conta', () => {
  const d = proximoDeslocamento({
    fundoDaBarra: 800,
    alturaVisivel: 460,
    deslocamentoVisual: 100,
    atual: 0,
  })
  assert.equal(d, 240)
})
