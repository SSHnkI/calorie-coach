import { useEffect, useRef, useState } from 'react'
import { chaveDoDia, fetchGasto, salvarGasto } from '../../lib/gasto'
import { Icon } from '../ui/Icon'

type GastoProps = {
  dia: Date
  valor: number
  onMudou: (kcal: number) => void
}

/**
 * Gasto extra do dia, digitado a mao. Fica em uma linha so, no idioma de
 * livro-caixa do resto da tela: rotulo a esquerda, numero a direita, pontilhado
 * ligando os dois. Vazio nao vira cartao nem tela de estado vazio, vira um traco.
 */
export function Gasto({ dia, valor, onMudou }: GastoProps) {
  const [editando, setEditando] = useState(false)
  const [rascunho, setRascunho] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(false)
  const campo = useRef<HTMLInputElement>(null)

  // A dependencia e a chave do dia, nunca o objeto Date: `new Date()` no pai
  // gera uma referencia nova a cada render, e a busca disparada por ela chegava
  // depois do usuario digitar, apagando o que ele tinha acabado de anotar.
  const chave = chaveDoDia(dia)

  useEffect(() => {
    let vivo = true
    fetchGasto(new Date(`${chave}T00:00:00`))
      .then((k) => vivo && onMudou(k))
      .catch(() => vivo && setErro(true))
    return () => {
      vivo = false
    }
    // onMudou vem do pai e muda a cada render; seguir ela recarregaria em loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave])

  const abrir = () => {
    setRascunho(valor > 0 ? String(valor) : '')
    setEditando(true)
    // O foco tem que esperar o input existir.
    setTimeout(() => campo.current?.select(), 0)
  }

  const gravar = async () => {
    const bruto = rascunho.trim()
    const kcal = bruto === '' ? 0 : Math.round(Number(bruto))
    setEditando(false)
    if (!Number.isFinite(kcal) || kcal < 0 || kcal > 20000 || kcal === valor) return

    const anterior = valor
    onMudou(kcal)
    setSalvando(true)
    setErro(false)
    try {
      await salvarGasto(dia, kcal)
      navigator.vibrate?.(8)
    } catch {
      onMudou(anterior)
      setErro(true)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-obliq-faint">
          gasto do dia
        </span>
        {erro && (
          <span role="alert" className="font-mono text-[11px] text-obliq-red">
            não salvou
          </span>
        )}
      </div>

      <div className="mt-2 flex items-baseline border-y border-obliq-border py-2.5">
        <span className="text-obliq-dim">exercício e atividade</span>
        <span className="leader" aria-hidden="true" />

        {editando ? (
          <span className="shrink-0">
            <input
              ref={campo}
              autoFocus
              type="number"
              inputMode="numeric"
              min={0}
              max={20000}
              placeholder="0"
              value={rascunho}
              onChange={(e) => setRascunho(e.target.value)}
              onBlur={gravar}
              onKeyDown={(e) => {
                if (e.key === 'Enter') gravar()
                if (e.key === 'Escape') setEditando(false)
              }}
              aria-label="Calorias gastas no dia"
              className="num w-24 rounded bg-obliq-raised px-2 py-0.5 text-right text-obliq-chalk ring-1 ring-obliq-dim outline-none"
            />
          </span>
        ) : (
          <button
            type="button"
            onClick={abrir}
            title="Digitar o gasto do dia"
            className={`num flex shrink-0 items-baseline gap-1.5 rounded px-1 transition-colors hover:text-obliq-red ${
              valor > 0 ? 'text-obliq-chalk' : 'text-obliq-line'
            } ${salvando ? 'opacity-50' : ''}`}
          >
            {valor > 0 ? (
              <>
                <span>{valor}</span>
                <span className="font-mono text-[12px] text-obliq-faint">kcal</span>
              </>
            ) : (
              <span className="font-mono text-[12px]">anotar</span>
            )}
            <Icon name="chevron" className="h-3 w-3 -rotate-90 self-center opacity-50" />
          </button>
        )}
      </div>

      <p className="mt-2 font-mono text-[11px] leading-relaxed text-obliq-faint">
        {valor > 0
          ? 'somado à meta do dia'
          : 'o que o relógio marcou, ou sua estimativa do treino'}
      </p>
    </section>
  )
}
