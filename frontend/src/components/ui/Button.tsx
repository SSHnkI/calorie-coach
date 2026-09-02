import { Link } from 'react-router-dom'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  children: ReactNode
  to?: string
}

// Um so botao cheio por tela. Secundario e uma borda, terciario e texto.
const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-obliq-red text-white shadow-red-glow hover:bg-[#ff1420] active:translate-y-px',
  secondary:
    'border border-obliq-line text-obliq-chalk hover:border-obliq-dim hover:bg-white/[0.03] active:translate-y-px',
  ghost:
    'text-obliq-dim hover:text-obliq-chalk underline decoration-obliq-line underline-offset-4 hover:decoration-obliq-dim',
}

export function Button({
  variant = 'primary',
  className = '',
  children,
  to,
  ...props
}: ButtonProps) {
  const base =
    variant === 'ghost'
      ? 'inline-flex items-center justify-center gap-2 text-sm font-medium transition-colors duration-200'
      : 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold tracking-tight transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none'

  const classes = `${base} ${variants[variant]} ${className}`

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
