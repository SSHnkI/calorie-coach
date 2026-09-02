import { useEffect, useState } from 'react'
import { aplicarTema, temaSalvo, type Tema } from '../../lib/tema'
import { Icon } from '../ui/Icon'

// Lua e sol, dois toques pequenos: um icone diz o tema mais rapido que
// tres letras maiusculas.
export function TemaSwitcher() {
  const [tema, setTema] = useState<Tema>(temaSalvo)

  useEffect(() => {
    aplicarTema(tema)
  }, [tema])

  return (
    <div className="inline-flex gap-0.5" role="group" aria-label="Tema">
      {([
        { id: 'escuro' as Tema, icone: 'lua' as const, rotulo: 'Tema escuro' },
        { id: 'claro' as Tema, icone: 'sol' as const, rotulo: 'Tema claro' },
      ]).map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => {
            setTema(t.id)
            navigator.vibrate?.(6)
          }}
          aria-pressed={tema === t.id}
          aria-label={t.rotulo}
          title={t.rotulo}
          className={`rounded-md p-1 transition-all duration-200 active:scale-90 ${
            tema === t.id
              ? 'bg-obliq-raised text-obliq-red ring-1 ring-obliq-red/40'
              : 'text-obliq-faint hover:text-obliq-dim'
          }`}
        >
          <Icon name={t.icone} className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  )
}
