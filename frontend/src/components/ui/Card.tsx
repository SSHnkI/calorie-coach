import type { ReactNode } from 'react'

type CardProps = {
  children: ReactNode
  className?: string
  glow?: boolean
}

// Cartao sem borda por padrao: a superficie ja separa do fundo.
// `glow` fica so no bloco principal de cada tela.
export function Card({ children, className = '', glow = false }: CardProps) {
  return (
    <div
      className={`rounded-xl bg-obliq-surface p-5 shadow-lift sm:p-6 ${
        glow ? 'ring-1 ring-obliq-red/25' : 'ring-1 ring-obliq-border'
      } ${className}`}
    >
      {children}
    </div>
  )
}
