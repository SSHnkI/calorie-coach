type BadgeProps = {
  children: React.ReactNode
  variant?: 'pro' | 'default'
}

// Etiqueta quadrada, nao pilula: fica mais perto de carimbo de caderno.
export function Badge({ children, variant = 'default' }: BadgeProps) {
  const styles =
    variant === 'pro'
      ? 'bg-obliq-red text-white'
      : 'bg-obliq-raised text-obliq-dim ring-1 ring-obliq-border'

  return (
    <span
      className={`inline-flex items-center rounded-[3px] px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em] ${styles}`}
    >
      {children}
    </span>
  )
}
