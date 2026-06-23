type BadgeProps = {
  children: React.ReactNode
  variant?: 'pro' | 'default'
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  const styles =
    variant === 'pro'
      ? 'bg-obliq-red text-white shadow-red-glow'
      : 'bg-obliq-border text-white/80'

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${styles}`}
    >
      {children}
    </span>
  )
}
