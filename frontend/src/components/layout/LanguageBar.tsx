import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { aplicarTema, temaSalvo, type Tema } from '../../lib/tema'
import { useApp } from '../../context/AppContext'
import { ADMIN_EMAIL } from '../../lib/users'
import { Icon } from '../ui/Icon'
import { SinoAvisos } from './Avisos'

/**
 * Barra utilitaria: um botao so, e tudo o resto dentro do menu.
 *
 * Antes o tema morava fora, e a barra tinha tres controles disputando o canto
 * com o logo do cabecalho. Trocar de tema e algo que se faz uma vez, nao a cada
 * sessao, entao nao paga o espaco permanente que ocupava.
 */
export function LanguageBar() {
  const { isAuthenticated, logout, user } = useApp()
  const [aberto, setAberto] = useState(false)
  const [tema, setTema] = useState<Tema>(temaSalvo)
  const caixa = useRef<HTMLDivElement>(null)
  const ehAdmin = user?.email === ADMIN_EMAIL

  useEffect(() => {
    aplicarTema(tema)
  }, [tema])

  // Menu aberto no celular sem jeito de fechar sem escolher nada e armadilha:
  // toque fora e a tecla Escape fecham.
  useEffect(() => {
    if (!aberto) return
    const foraOuEscape = (e: Event) => {
      if (e.type === 'keydown' && (e as KeyboardEvent).key !== 'Escape') return
      if (e.type === 'pointerdown' && caixa.current?.contains(e.target as Node)) return
      setAberto(false)
    }
    document.addEventListener('pointerdown', foraOuEscape)
    document.addEventListener('keydown', foraOuEscape)
    return () => {
      document.removeEventListener('pointerdown', foraOuEscape)
      document.removeEventListener('keydown', foraOuEscape)
    }
  }, [aberto])

  const links = [
    ...(ehAdmin ? [{ to: '/usuarios', label: 'Usuários' }] : []),
    { to: '/reset-password', label: 'Trocar senha' },
  ]

  return (
    <div
      ref={caixa}
      style={{ top: 'calc(0.5rem + env(safe-area-inset-top))' }}
      className="fixed right-3 z-50 flex flex-col items-end gap-1"
    >
      <div className="flex items-center gap-0.5">
        {/* O sino so pra quem tem conta: aviso e coisa de diario, nao de visita. */}
        {isAuthenticated && <SinoAvisos />}

        <button
          type="button"
          onClick={() => setAberto((a) => !a)}
          aria-expanded={aberto}
          aria-label="Menu"
          className={`rounded-lg bg-obliq-black/85 p-2 backdrop-blur-sm transition-colors duration-200 ${
            aberto ? 'text-obliq-chalk' : 'text-obliq-faint hover:text-obliq-dim'
          }`}
        >
          <Icon name="menu" className="h-4 w-4" />
        </button>
      </div>

      {aberto && (
        <nav className="rise w-44 overflow-hidden rounded-lg bg-obliq-surface py-1 shadow-lift ring-1 ring-obliq-border">
          {/* Tema primeiro: e o unico item que todo mundo ve, logado ou nao. */}
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-obliq-faint">
              tema
            </span>
            <div className="flex gap-0.5" role="group" aria-label="Tema">
              {(
                [
                  { id: 'escuro' as Tema, icone: 'lua' as const, rotulo: 'Tema escuro' },
                  { id: 'claro' as Tema, icone: 'sol' as const, rotulo: 'Tema claro' },
                ]
              ).map((t) => (
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
                  className={`rounded-md p-1.5 transition-all duration-200 active:scale-90 ${
                    tema === t.id
                      ? 'bg-obliq-raised text-obliq-red ring-1 ring-obliq-red/40'
                      : 'text-obliq-faint hover:text-obliq-dim'
                  }`}
                >
                  <Icon name={t.icone} className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          </div>

          {isAuthenticated && (
            <>
              <span className="mx-4 block h-px bg-obliq-border" aria-hidden="true" />
              {links.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setAberto(false)}
                  className="block px-4 py-2.5 text-sm text-obliq-dim transition-colors hover:text-obliq-chalk"
                >
                  {l.label}
                </Link>
              ))}
              <button
                type="button"
                onClick={() => {
                  setAberto(false)
                  logout()
                }}
                className="block w-full px-4 py-2.5 text-left text-sm text-obliq-dim transition-colors hover:text-obliq-red"
              >
                Sair
              </button>
            </>
          )}
        </nav>
      )}
    </div>
  )
}
