export type Tema = 'escuro' | 'claro'

const CHAVE = 'obliq-tema'

export function temaSalvo(): Tema {
  try {
    const t = localStorage.getItem(CHAVE)
    if (t === 'claro' || t === 'escuro') return t
  } catch {
    // navegador sem storage: segue no padrao
  }
  return 'escuro'
}

// Escreve no <html> e na barra do sistema, pra cor do PWA acompanhar.
export function aplicarTema(t: Tema) {
  document.documentElement.dataset.theme = t === 'claro' ? 'light' : 'dark'
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', t === 'claro' ? '#f6f4f1' : '#101015')
  try {
    localStorage.setItem(CHAVE, t)
  } catch {
    // sem storage, o tema vale so nesta sessao
  }
}
