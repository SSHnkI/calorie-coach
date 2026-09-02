import { useEffect, useState } from 'react'
import { aplicarTema, temaSalvo, type Tema } from '../../lib/tema'

// Sem sol e sem lua: duas letras, igual ao seletor de idioma ao lado.
export function TemaSwitcher() {
  const [tema, setTema] = useState<Tema>(temaSalvo)

  useEffect(() => {
    aplicarTema(tema)
  }, [tema])

  return (
    <div className="inline-flex gap-1" role="group" aria-label="Tema">
      {(['escuro', 'claro'] as Tema[]).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => setTema(t)}
          aria-pressed={tema === t}
          title={t === 'escuro' ? 'Tema escuro' : 'Tema claro'}
          className={`rounded px-1.5 py-0.5 font-mono text-[10px] tracking-[0.1em] transition-colors duration-200 ${
            tema === t ? 'text-obliq-chalk' : 'text-obliq-faint hover:text-obliq-dim'
          }`}
        >
          {t === 'escuro' ? 'ESC' : 'CLA'}
        </button>
      ))}
    </div>
  )
}
