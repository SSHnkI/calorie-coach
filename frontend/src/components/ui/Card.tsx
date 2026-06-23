import type { ReactNode } from 'react'

type CardProps = {
  children: ReactNode
  className?: string
  glow?: boolean
}

export function Card({ children, className = '', glow = false }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-obliq-border bg-obliq-surface p-4 sm:p-5 ${glow ? 'border-obliq-red/30 shadow-red-glow' : ''} ${className}`}
    >
      {children}
    </div>
  )
}
