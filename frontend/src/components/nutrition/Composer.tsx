import { type FormEvent, useRef, useState } from 'react'
import { prepararFoto } from '../../lib/imagem'
import { Icon } from '../ui/Icon'

type ComposerProps = {
  onEnviar: (texto: string, foto?: string) => Promise<void>
  ocupado: boolean
  erro?: string
}

/**
 * Barra de registro fixa no rodape. No celular, registrar comida e a acao
 * que se repete o dia todo: ela mora onde o polegar alcanca, nao no meio da pagina.
 */
export function Composer({ onEnviar, ocupado, erro }: ComposerProps) {
  const [texto, setTexto] = useState('')
  const [foto, setFoto] = useState<string | null>(null)
  const [preparando, setPreparando] = useState(false)
  const arquivoRef = useRef<HTMLInputElement>(null)

  const escolherFoto = async (file?: File) => {
    if (!file) return
    setPreparando(true)
    try {
      setFoto(await prepararFoto(file))
    } catch {
      setFoto(null)
    } finally {
      setPreparando(false)
    }
  }

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    if (!texto.trim() && !foto) return
    await onEnviar(texto, foto ?? undefined)
    setTexto('')
    setFoto(null)
    if (arquivoRef.current) arquivoRef.current.value = ''
  }

  const podeEnviar = (texto.trim().length > 0 || !!foto) && !ocupado && !preparando

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-obliq-border bg-obliq-black/95 backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <form onSubmit={enviar} className="mx-auto max-w-3xl px-4 py-3">
        {foto && (
          <div className="mb-2 flex items-center gap-2">
            <img
              src={foto}
              alt="Foto da refeição escolhida"
              className="h-12 w-12 rounded object-cover ring-1 ring-obliq-border"
            />
            <span className="font-mono text-[11px] text-obliq-dim">
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
            className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-xl text-obliq-dim ring-1 ring-obliq-border transition-colors duration-200 hover:text-obliq-chalk hover:ring-obliq-dim active:scale-95"
          >
            {preparando ? (
              <span className="h-4 w-4 animate-pulse rounded-full bg-obliq-dim" />
            ) : (
              <Icon name="camera" className="h-5 w-5" />
            )}
          </label>

          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={foto ? 'algo a acrescentar?' : 'o que você comeu?'}
            enterKeyHint="send"
            autoComplete="off"
            aria-label="O que você comeu"
            className="h-12 min-w-0 flex-1 rounded-xl bg-obliq-surface px-4 text-base text-obliq-chalk ring-1 ring-obliq-border outline-none transition-colors duration-200 placeholder:text-obliq-faint focus:ring-obliq-dim"
          />

          <button
            type="submit"
            disabled={!podeEnviar}
            aria-label="Registrar"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-obliq-red text-white transition-all duration-200 active:scale-95 disabled:opacity-30"
          >
            {ocupado ? (
              <span className="h-4 w-4 animate-pulse rounded-full bg-white" />
            ) : (
              <Icon name="arrowRight" className="h-5 w-5" />
            )}
          </button>
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
