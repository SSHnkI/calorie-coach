import { useEffect, useState } from 'react'

// A tela de carregamento, e a rede de seguranca contra tela branca.
//
// Os guards de rota tem um estado "ainda nao sei", e ele NUNCA pode ser
// `return null`. Foi assim que o PWA ficou em branco: a sessao voltava do
// background, a busca do perfil pendurava na rede ainda dormindo, e a espera
// nao terminava mais. So a barra utilitaria aparecia.
//
// Aqui a espera tem prazo. Fica quieta no comeco, para nao piscar carregamento
// numa carga rapida, mostra a marca enquanto carrega, e se passar do limite
// assume que travou e devolve o controle para a pessoa. Qualquer causa futura
// de travamento cai neste mesmo funil, entao a tela branca deixa de ser um
// final possivel.
//
// A irma desta tela mora no index.html: um splash em HTML puro que cobre a
// janela anterior, entre abrir o app e o React montar.
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
        className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-obliq-black"
      >
        <span className="font-display text-3xl font-extrabold tracking-[-0.05em] text-obliq-chalk">
          OBL<span className="text-obliq-red">IQ</span>
        </span>
        {/* Barra que corre, nao spinner: diz que algo avanca sem fingir progresso. */}
        <span className="h-0.5 w-20 overflow-hidden rounded-full bg-obliq-border">
          <span className="correr block h-full w-2/5 rounded-full bg-obliq-red" />
        </span>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-obliq-black px-8 text-center">
      <span className="font-display text-3xl font-extrabold tracking-[-0.05em] text-obliq-chalk">
        OBL<span className="text-obliq-red">IQ</span>
      </span>
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
