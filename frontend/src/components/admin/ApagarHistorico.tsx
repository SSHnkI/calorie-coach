import { useState } from 'react'
import { countUserEntries, deleteUserHistory } from '../../lib/users'
import type { AppUser } from '../../lib/users'

type Fase = 'fechado' | 'contando' | 'confirmar' | 'apagando' | 'feito' | 'erro'

/**
 * Apagar o diario de outra pessoa e irreversivel e nao tem lixeira.
 * Por isso a acao fica separada, exige duas etapas e mostra quantos
 * registros vao sumir antes de aceitar o clique final.
 */
export function ApagarHistorico({ usuario }: { usuario: AppUser }) {
  const [fase, setFase] = useState<Fase>('fechado')
  const [total, setTotal] = useState(0)
  const [msg, setMsg] = useState('')

  const abrir = async () => {
    setFase('contando')
    try {
      const n = await countUserEntries(usuario.id)
      setTotal(n)
      setFase('confirmar')
    } catch {
      setMsg('Não foi possível contar os registros.')
      setFase('erro')
    }
  }

  const apagar = async () => {
    setFase('apagando')
    try {
      const n = await deleteUserHistory(usuario.id)
      if (n === 0 && total > 0) {
        setMsg('O banco recusou. Falta a política de exclusão para o admin.')
        setFase('erro')
        return
      }
      setMsg(`${n} ${n === 1 ? 'registro apagado' : 'registros apagados'}.`)
      setFase('feito')
    } catch {
      setMsg('Não foi possível apagar.')
      setFase('erro')
    }
  }

  if (fase === 'feito' || fase === 'erro') {
    return (
      <p
        role={fase === 'erro' ? 'alert' : undefined}
        className={`font-mono text-[11px] ${
          fase === 'erro' ? 'text-obliq-red' : 'text-obliq-dim'
        }`}
      >
        {msg}
      </p>
    )
  }

  if (fase === 'confirmar') {
    return (
      <div className="md:text-right">
        <p className="font-mono text-[11px] text-obliq-chalk">
          {total === 0
            ? 'esta conta não tem registros'
            : `apagar ${total} ${total === 1 ? 'registro' : 'registros'} de ${usuario.email}?`}
        </p>
        <p className="mt-0.5 font-mono text-[11px] text-obliq-faint">
          não dá para desfazer
        </p>
        <div className="mt-2 flex gap-2 md:justify-end">
          <button
            type="button"
            onClick={() => setFase('fechado')}
            className="min-h-9 rounded px-2.5 py-1.5 font-mono text-[11px] text-obliq-faint ring-1 ring-obliq-border transition-colors duration-200 hover:text-obliq-chalk"
          >
            cancelar
          </button>
          <button
            type="button"
            onClick={apagar}
            disabled={total === 0}
            className="min-h-9 rounded bg-obliq-red px-2.5 py-1.5 font-mono text-[11px] text-white transition-colors duration-200 hover:bg-[#ff1420] disabled:opacity-30"
          >
            apagar tudo
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={abrir}
      disabled={fase === 'contando'}
      className="min-h-9 rounded px-2.5 py-1.5 font-mono text-[11px] text-obliq-faint ring-1 ring-obliq-border transition-colors duration-200 hover:text-obliq-red hover:ring-obliq-red/50 disabled:opacity-40"
    >
      {fase === 'contando' ? 'contando…' : 'apagar histórico'}
    </button>
  )
}
