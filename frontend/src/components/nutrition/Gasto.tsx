import { useEffect, useRef, useState } from 'react'
import { chaveDoDia, fetchGasto, salvarGasto } from '../../lib/gasto'

type GastoProps = {
  dia: Date
  valor: number
  onMudou: (kcal: number) => void
}

/**
 * Gasto extra do dia, digitado a mao: o que voce queimou em exercicio e volta
 * pra meta como kcal a mais pra comer.
 *
 * Ocupa uma linha so. Tinha titulo de secao em cima e explicacao embaixo, tres
 * blocos pra um campo que a maioria dos dias fica vazio. O que o rodape dizia
 * agora esta no proprio rotulo, que e onde a pessoa olha.
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
      <div className="flex items-baseline border-y border-obliq-border py-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-obliq-faint">
          gasto
        </span>
        <span className="ml-2 truncate text-[12px] text-obliq-dim">
          treino, caminhada, esporte
        </span>
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
              aria-label="Calorias gastas em exercício hoje"
              className="num w-20 rounded bg-obliq-raised px-2 py-0.5 text-right text-obliq-chalk ring-1 ring-obliq-dim outline-none"
            />
          </span>
        ) : (
          <button
            type="button"
            onClick={abrir}
            title="Somar à meta do dia as calorias que você gastou em exercício"
            className={`num flex shrink-0 items-baseline gap-1 rounded px-1 transition-colors hover:text-obliq-red ${
              valor > 0 ? 'text-obliq-chalk' : 'text-obliq-line'
            } ${salvando ? 'opacity-50' : ''}`}
          >
            {valor > 0 ? (
              <>
                {/* O mais nao e enfeite: diz que isso ABRE espaco na meta. */}
                <span>+{valor}</span>
                <span className="font-mono text-[12px] text-obliq-faint">kcal</span>
              </>
            ) : (
              <span className="font-mono text-[12px]">+ kcal gasta</span>
            )}
          </button>
        )}
      </div>

      {erro && (
        <p role="alert" className="mt-1 font-mono text-[11px] text-obliq-red">
          não salvou
        </p>
      )}
    </section>
  )
}
