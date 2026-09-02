import { Link } from 'react-router-dom'

const sizes = { sm: 'text-lg', md: 'text-xl', lg: 'text-3xl' }

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return (
    <Link
      to="/"
      aria-label="Obliq, ir para o inicio"
      className={`font-display font-extrabold tracking-[-0.05em] text-obliq-chalk ${sizes[size]}`}
    >
      OBL<span className="text-obliq-red">IQ</span>
    </Link>
  )
}
