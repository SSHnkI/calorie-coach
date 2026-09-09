import { type CSSProperties, type FormEvent, useEffect, useRef, useState } from 'react'
import { prepararFoto } from '../../lib/imagem'
import { gravar, type Gravador } from '../../lib/audio'
import type { Atalho } from '../../lib/atalhos'
import { Icon } from '../ui/Icon'

/**
 * O que aconteceu com o ultimo envio. Mora aqui, na barra, e nao la no meio da
 * pagina: a pessoa registra com o polegar no rodape e olhando pro rodape, e o
 * retorno acontecia num pedaco da tela que ela nem estava vendo. Sumia.
 */
export type EstadoDoEnvio =
  | { tipo: 'calculando'; rotulo: string; fila: number }
  | { tipo: 'entrou'; rotulo: string; kcal: number }
  | { tipo: 'erro'; rotulo: string; texto: string }

type ComposerProps = {
  onEnviar: (texto: string, foto?: string, fala?: string) => void
  erro?: string
  estado?: EstadoDoEnvio | null
  onTentarDeNovo?: () => void
  onDescartar?: () => void
  // O que a pessoa repete todo dia, a um toque de distancia.
  atalhos?: Atalho[]
  onAtalho?: (a: Atalho) => void
  // Preenchido quando o registro NAO vai para este instante: dia passado, ou
  // outra janela do dia. Sem esse aviso a barra fica identica a de agora e a
  // pessoa lanca no lugar errado sem perceber.
  destino?: string
}

/**
 * Barra de registro fixa no rodape. No celular, registrar comida e a acao
 * que se repete o dia todo: ela mora onde o polegar alcanca, nao no meio da pagina.
 */
export function Composer({
  onEnviar,
  erro,
  destino,
  estado,
  onTentarDeNovo,
  onDescartar,
  atalhos = [],
  onAtalho,
}: ComposerProps) {
  const [texto, setTexto] = useState('')
  const [foto, setFoto] = useState<string | null>(null)
  const [preparando, setPreparando] = useState(false)
  const arquivoRef = useRef<HTMLInputElement>(null)
  const gravadorRef = useRef<Gravador | null>(null)
  const [gravando, setGravando] = useState(false)
  const [segundos, setSegundos] = useState(0)

  // Onde a barra para, com o teclado aberto.
  //
  // O erro das tentativas anteriores foi ancorar por `bottom`. `bottom` e
  // justamente o que o iOS mexe quando o teclado abre, entao qualquer ajuste
  // nosso somava ao ajuste dele. `top` do layout viewport nao se mexe.
  //
  // Entao: top = onde a area visivel termina, e translateY(-100%) puxa a barra
  // pela propria altura. O fundo dela cai exatamente na borda de cima do
  // teclado, sem depender de quanto o navegador ja empurrou.
  //
  // ponytail: a ancora vem so da VisualViewport, nunca da posicao medida da
  // barra. Foi o laco de realimentacao que fez a tentativa anterior oscilar.
  const [ancora, setAncora] = useState<number | null>(null)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    // Folga generosa: a barra de URL do Safari encolhendo tira ~60px da area
    // visivel e nao e teclado. Teclado de celular nunca e tao curto.
    const MINIMO_DE_TECLADO = 120

    const medir = () => {
      const escondido = window.innerHeight - vv.height
      setAncora(escondido > MINIMO_DE_TECLADO ? Math.round(vv.offsetTop + vv.height) : null)
    }

    vv.addEventListener('resize', medir)
    vv.addEventListener('scroll', medir)
    medir()
    return () => {
      vv.removeEventListener('resize', medir)
      vv.removeEventListener('scroll', medir)
    }
  }, [])

  // Sem teclado, a barra volta a ser um rodape comum: bottom: 0 e o espaco do
  // indicador do iPhone reservado. Com o teclado, o indicador esta coberto.
  const estiloBarra: CSSProperties =
    ancora === null
      ? { paddingBottom: 'env(safe-area-inset-bottom)' }
      : { top: `${ancora}px`, bottom: 'auto', transform: 'translateY(-100%)', paddingBottom: 0 }

  // Contador de tempo da fala. So roda enquanto o microfone esta aberto.
  useEffect(() => {
    if (!gravando) return
    const t = setInterval(() => setSegundos((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [gravando])

  const comecarFala = async () => {
    try {
      gravadorRef.current = await gravar()
      setSegundos(0)
      setGravando(true)
      navigator.vibrate?.(8)
    } catch {
      setGravando(false)
    }
  }

  const enviarFala = async () => {
    const g = gravadorRef.current
    if (!g) return
    setGravando(false)
    gravadorRef.current = null
    try {
      const fala = await g.parar()
      onEnviar('', undefined, fala)
    } catch {
      // microfone morreu no meio: nao ha o que enviar
    }
  }

  const descartarFala = () => {
    gravadorRef.current?.cancelar()
    gravadorRef.current = null
    setGravando(false)
  }


  const escolherFoto = async (file?: File) => {
    if (!file) return
    setPreparando(true)
    try {
      setFoto(await prepararFoto(file))
      navigator.vibrate?.(8)
    } catch {
      setFoto(null)
    } finally {
      setPreparando(false)
    }
  }

  // Limpa antes de esperar a resposta: o campo vazio e o sinal de que entrou.
  // A analise segue em segundo plano e a linha aparece na hora, como pendente.
  const enviar = (e: FormEvent) => {
    e.preventDefault()
    if (!texto.trim() && !foto) return
    onEnviar(texto, foto ?? undefined)
    navigator.vibrate?.(12)
    setTexto('')
    setFoto(null)
    if (arquivoRef.current) arquivoRef.current.value = ''
  }

  const podeEnviar = (texto.trim().length > 0 || !!foto) && !preparando

  // Enquanto grava, a barra inteira vira o controle da fala.
  if (gravando) {
    return (
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-obliq-border bg-obliq-black/95 backdrop-blur-md"
        style={estiloBarra}
      >
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={descartarFala}
            className="h-12 shrink-0 rounded-xl px-3 text-sm text-obliq-dim ring-1 ring-obliq-border transition-colors hover:text-obliq-chalk"
          >
            cancelar
          </button>

          <div className="flex flex-1 items-center gap-2">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-obliq-red" />
            <span className="num text-sm text-obliq-chalk">
              {String(Math.floor(segundos / 60)).padStart(2, '0')}:
              {String(segundos % 60).padStart(2, '0')}
            </span>
            <span className="text-sm text-obliq-faint">diga o que comeu</span>
          </div>

          <button
            type="button"
            onClick={enviarFala}
            aria-label="Concluir gravação"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-obliq-red text-white transition-all active:scale-95"
          >
            <Icon name="stop" className="h-5 w-5" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-obliq-border bg-obliq-black/95 backdrop-blur-md"
      style={estiloBarra}
    >
      <form onSubmit={enviar} className="mx-auto max-w-3xl px-4 py-3">
        {destino && (
          <p className="mb-2 font-mono text-[12px] text-obliq-faint">
            registrando em <span className="text-obliq-chalk">{destino}</span>
          </p>
        )}

        {estado && (
          <div className="mb-2 text-[12px]">
            <div className="flex items-center gap-2">
              {estado.tipo === 'calculando' && (
                <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-obliq-dim" />
              )}
              {estado.tipo === 'entrou' && (
                <Icon name="check" className="h-3 w-3 shrink-0 text-obliq-green" />
              )}

              <span className="truncate text-obliq-dim">{estado.rotulo}</span>
              <span className="leader" aria-hidden="true" />

              {estado.tipo === 'calculando' && (
                <span className="num shrink-0 animate-pulse font-mono text-obliq-faint">
                  calculando
                  {estado.fila > 1 ? ` (${estado.fila})` : ''}
                </span>
              )}
              {estado.tipo === 'entrou' && (
                <span className="num bater shrink-0 font-mono text-obliq-green">
                  +{estado.kcal} kcal
                </span>
              )}
              {estado.tipo === 'erro' && (
                <span className="num shrink-0 font-mono text-obliq-red">{estado.texto}</span>
              )}
            </div>

            {/* Os botoes em linha propria: espremidos ao lado do texto, sobrava
                "macarrao com crem..." e o nome do que falhou sumia. */}
            {estado.tipo === 'erro' && (
              <div className="mt-1.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={onTentarDeNovo}
                  className="num rounded-lg px-3 py-1.5 font-mono text-obliq-chalk ring-1 ring-obliq-border transition-colors hover:text-obliq-red"
                >
                  tentar de novo
                </button>
                <button
                  type="button"
                  onClick={onDescartar}
                  className="num rounded-lg px-3 py-1.5 font-mono text-obliq-faint transition-colors hover:text-obliq-red"
                >
                  descartar
                </button>
              </div>
            )}
          </div>
        )}

        {/* Atalho do que se repete: um toque, sem teclado e sem IA, porque o
            numero ja esta no historico. Some assim que a pessoa comeca a
            digitar, que e quando ela quer o campo e nao a lista. */}
        {atalhos.length > 0 && !texto && !foto && estado?.tipo !== 'erro' && (
          <div className="-mx-4 mb-2 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {atalhos.map((a) => (
              <button
                key={a.chave}
                type="button"
                onClick={() => onAtalho?.(a)}
                className="flex shrink-0 items-baseline gap-1.5 rounded-full bg-obliq-surface px-3 py-1.5 ring-1 ring-obliq-border transition-colors active:scale-95"
              >
                <span className="max-w-[9rem] truncate text-[12px] text-obliq-dim">{a.nome}</span>
                <span className="num text-[11px] text-obliq-faint">{a.kcal}</span>
              </button>
            ))}
          </div>
        )}
        {foto && (
          <div className="mb-2 flex items-center gap-2">
            <img
              src={foto}
              alt="Foto da refeição escolhida"
              className="bater h-12 w-12 rounded object-cover ring-1 ring-obliq-border"
            />
            <span className="font-mono text-[12px] text-obliq-dim">
              foto pronta, descreva se quiser ajudar
            </span>
            <button
              type="button"
              onClick={() => {
                setFoto(null)
                if (arquivoRef.current) arquivoRef.current.value = ''
              }}
              aria-label="Remover foto"
              className="ml-auto p-2 text-obliq-faint transition-colors hover:text-obliq-red"
            >
              <Icon name="trash" className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={foto ? 'algo a acrescentar?' : 'o que você comeu?'}
            enterKeyHint="send"
            autoComplete="off"
            aria-label="O que você comeu"
            className="h-12 min-w-0 flex-1 rounded-xl bg-obliq-surface px-4 text-base text-obliq-chalk ring-1 ring-obliq-border outline-none transition-all duration-200 placeholder:text-obliq-faint focus:ring-obliq-dim"
          />

          {/* Foto e voz moram juntos na direita: e onde o polegar cai sem
              atravessar a tela. O da ponta e sempre o que conclui. */}
          <input
            ref={arquivoRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            id="foto-refeicao"
            onChange={(e) => escolherFoto(e.target.files?.[0])}
          />
          <label
            htmlFor="foto-refeicao"
            aria-label="Fotografar refeição"
            className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-xl text-obliq-dim ring-1 ring-obliq-border transition-all duration-200 hover:text-obliq-chalk hover:ring-obliq-dim active:scale-90"
          >
            {preparando ? (
              <span className="h-4 w-4 animate-pulse rounded-full bg-obliq-dim" />
            ) : (
              <Icon name="camera" className="h-5 w-5" />
            )}
          </label>

          {podeEnviar ? (
            <button
              type="submit"
              aria-label="Registrar"
              className="pulsar flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-gradient text-white shadow-red-glow transition-all duration-200 active:scale-90"
            >
              <Icon name="arrowRight" className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={comecarFala}
              aria-label="Falar o que comeu"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-gradient text-white transition-all duration-200 active:scale-90"
            >
              <Icon name="mic" className="h-5 w-5" />
            </button>
          )}
        </div>

        {erro && (
          <p role="alert" className="mt-2 text-sm text-obliq-red">
            {erro}
          </p>
        )}
      </form>
    </div>
  )
}
