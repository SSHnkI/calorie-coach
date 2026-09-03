import { useEffect, useState } from 'react'

// A rede de seguranca contra tela branca.
//
// Os guards de rota precisam de um estado "ainda nao sei". Antes esse estado era
// `return null`, e quando alguma coisa travava atras dele o app ficava em branco
// para sempre, sem nem um botao para sair. Foi o que aconteceu no PWA: a sessao
// voltava, a busca do perfil pendurava na rede dormindo, e a espera nunca
// terminava.
//
// Aqui a espera tem prazo. Fica quieta no comeco, para nao piscar um spinner em
// carga rapida, mostra que esta carregando, e se passar do limite assume que
// travou e devolve o controle para a pessoa. Qualquer causa futura de travamento
// cai neste mesmo funil, entao a tela branca deixa de ser um final possivel.
const ANTES_DE_APARECER = 500
// Maior que os 8s do pior caso da busca do perfil (4s x 2 tentativas), senao a
// tela declara falha enquanto a segunda tentativa ainda esta viva.
const ANTES_DE_DESISTIR = 9000

type Fase = 'quieto' | 'carregando' | 'travou'

export function Esperando() {
  const [fase, setFase] = useState<Fase>('quieto')

  useEffect(() => {
    const aparece = setTimeout(() => setFase('carregando'), ANTES_DE_APARECER)
    const desiste = setTimeout(() => setFase('travou'), ANTES_DE_DESISTIR)
    return () => {
      clearTimeout(aparece)
      clearTimeout(desiste)
    }
  }, [])

  if (fase === 'quieto') return null

  if (fase === 'carregando') {
    return (
      <div
        role="status"
        aria-label="Carregando"
        className="flex min-h-dvh items-center justify-center bg-obliq-black"
      >
        <span className="h-2 w-2 animate-pulse rounded-full bg-obliq-red" />
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-obliq-black px-8 text-center">
      <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-obliq-faint">
        não carregou
      </p>
      <p className="max-w-[34ch] text-obliq-dim">
        O app não conseguiu confirmar sua conta. Quase sempre é a conexão
        voltando do modo de espera.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="min-h-11 rounded-xl bg-obliq-red px-6 font-bold uppercase tracking-wide text-white transition-transform active:scale-95"
      >
        tentar de novo
      </button>
    </div>
  )
}
