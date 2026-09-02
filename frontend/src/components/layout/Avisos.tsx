import { useEffect, useState } from 'react'
import { ativarPush, desligarPush, estadoPush, type EstadoPush } from '../../lib/push'
import { Icon } from '../ui/Icon'

/**
 * Uma linha so: liga ou desliga os lembretes no aparelho. Sem tela de
 * preferencias, sem lista de horarios. Quem liga recebe: meio-dia sem
 * registro, saldo as 20h, meta batida na hora e resumo no domingo.
 */
export function Avisos() {
  const [estado, setEstado] = useState<EstadoPush | 'erro' | null>(null)
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    estadoPush().then(setEstado)
  }, [])

  if (estado === null || estado === 'sem-suporte') return null

  const ligado = estado === 'ligado'

  const alternar = async () => {
    setOcupado(true)
    navigator.vibrate?.(8)
    try {
      if (ligado) {
        await desligarPush()
        setEstado('desligado')
      } else {
        setEstado(await ativarPush())
      }
    } finally {
      setOcupado(false)
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-obliq-faint">
            avisos
          </span>
          <p className="mt-0.5 text-[12px] text-obliq-dim">
            {estado === 'negado'
              ? 'Bloqueado no aparelho. Libere as notificações do Obliq nos ajustes.'
              : ligado
                ? 'Saldo do dia às 20h, meta batida na hora e resumo no domingo.'
                : 'Lembretes de registro, saldo do dia e resumo da semana.'}
          </p>
          {estado === 'erro' && (
            <p role="alert" className="mt-1 text-[12px] text-obliq-red">
              Não deu pra ligar agora. Tente de novo.
            </p>
          )}
        </div>

        {estado !== 'negado' && (
          <button
            type="button"
            onClick={alternar}
            disabled={ocupado}
            aria-pressed={ligado}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 font-mono text-[11px] uppercase tracking-[0.1em] transition-all duration-200 active:scale-95 disabled:opacity-50 ${
              ligado
                ? 'text-obliq-red ring-1 ring-obliq-red/40'
                : 'bg-red-gradient text-white shadow-red-glow'
            }`}
          >
            {ligado && <Icon name="check" className="h-3 w-3" />}
            {ocupado ? '...' : ligado ? 'ligado' : 'ativar'}
          </button>
        )}
      </div>
    </section>
  )
}
