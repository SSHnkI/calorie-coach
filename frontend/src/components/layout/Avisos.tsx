import { useEffect, useState } from 'react'
import { ativarPush, desligarPush, estadoPush, type EstadoPush } from '../../lib/push'
import { Icon } from '../ui/Icon'

/**
 * O sino: liga e desliga os lembretes no aparelho, num toque.
 *
 * Era uma secao no meio do painel, com titulo, explicacao e botao, disputando
 * espaco com o diario do dia todo santo dia. Mas ligar aviso e coisa que se faz
 * uma vez. Virou sino no cabecalho, do lado do menu: pequeno, sempre no mesmo
 * lugar, e o estado dele ja e a resposta (aceso e porque esta ligado).
 *
 * Quem liga recebe: meio-dia sem registro, saldo as 20h, meta batida na hora e
 * resumo no domingo.
 */
export function SinoAvisos() {
  const [estado, setEstado] = useState<EstadoPush | 'erro' | null>(null)
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    estadoPush().then(setEstado)
  }, [])

  // Aparelho que nao faz push nao ganha botao que nao faz nada.
  if (estado === null || estado === 'sem-suporte') return null

  const ligado = estado === 'ligado'
  const negado = estado === 'negado'

  const alternar = async () => {
    if (negado) return
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

  const descricao = negado
    ? 'Avisos bloqueados no aparelho. Libere as notificações do Obliq nos ajustes.'
    : ligado
      ? 'Avisos ligados. Toque para desligar.'
      : 'Ligar avisos: lembrete de registro, saldo do dia e resumo de domingo.'

  return (
    <button
      type="button"
      onClick={alternar}
      disabled={ocupado || negado}
      aria-pressed={ligado}
      aria-label={descricao}
      title={descricao}
      className={`relative rounded-lg bg-obliq-black/85 p-2 backdrop-blur-sm transition-colors duration-200 disabled:opacity-40 ${
        ligado ? 'text-obliq-red' : 'text-obliq-faint hover:text-obliq-dim'
      } ${estado === 'erro' ? 'text-obliq-red' : ''}`}
    >
      <Icon name="sino" className="h-4 w-4" />
      {/* Desligado nao e neutro, e uma escolha: o corte diz isso sem texto. */}
      {!ligado && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 m-auto h-[1.5px] w-4 rotate-45 rounded-full bg-current opacity-70"
        />
      )}
    </button>
  )
}
