import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'

const sizes = { sm: 'text-lg', md: 'text-xl', lg: 'text-3xl' }

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const { isAuthenticated } = useApp()
  // Logado, a marca leva pro app. Deslogado, leva pra apresentacao.
  const destino = isAuthenticated ? '/dashboard' : '/'

  return (
    <Link
      to={destino}
      aria-label="Obliq, ir para o início"
      className={`font-display font-extrabold tracking-[-0.05em] text-obliq-chalk ${sizes[size]}`}
    >
      OBL<span className="text-obliq-red">IQ</span>
    </Link>
  )
}
