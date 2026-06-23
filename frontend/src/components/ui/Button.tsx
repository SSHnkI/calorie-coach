import { Link } from 'react-router-dom'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  children: ReactNode
  to?: string
}

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-red-gradient text-white shadow-red-glow hover:brightness-110 active:scale-[0.98]',
  secondary:
    'bg-obliq-surface border border-obliq-border text-white hover:border-obliq-red/50',
  ghost: 'bg-transparent text-white/70 hover:text-white hover:bg-white/5',
}

export function Button({
  variant = 'primary',
  className = '',
  children,
  to,
  ...props
}: ButtonProps) {
  const classes = `inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold uppercase tracking-wide transition-all disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${className}`

  if (to) {
    return (
      <Link to={to} className={classes}>
        {children}
      </Link>
    )
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  )
}
