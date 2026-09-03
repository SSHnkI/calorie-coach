// Quanto a barra fixa precisa subir para encostar no topo do teclado.
//
// Calcular pela altura do teclado nao funciona: no iOS o navegador ja empurra
// sozinho os elementos fixos quando o teclado abre, e quanto ele empurra muda
// entre Safari, PWA instalado e versao do sistema. Somar a altura do teclado
// por cima disso levanta a barra duas vezes, que era o defeito.
//
// Entao ninguem adivinha nada: mede-se onde o fundo da barra esta de verdade,
// compara com onde a area visivel termina, e corrige a diferenca. A relacao e
// linear (subir d move o fundo em -d), entao uma correcao ja fecha a conta, e a
// tolerancia impede o vaivem por causa de arredondamento.

export const TOLERANCIA_PX = 1

export function proximoDeslocamento(p: {
  /** `getBoundingClientRect().bottom` da barra. */
  fundoDaBarra: number
  /** `visualViewport.height` */
  alturaVisivel: number
  /** `visualViewport.offsetTop` */
  deslocamentoVisual: number
  /** Deslocamento aplicado agora. */
  atual: number
}): number {
  const alvo = p.alturaVisivel + p.deslocamentoVisual
  const erro = p.fundoDaBarra - alvo
  if (Math.abs(erro) < TOLERANCIA_PX) return p.atual
  // Pode ficar negativo de proposito: se o navegador levantou a barra mais do
  // que o teclado pedia, ela precisa poder descer de volta. A medicao manda.
  return Math.round(p.atual + erro)
}
