import { Link } from 'react-router-dom'

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'text-xl', md: 'text-2xl', lg: 'text-4xl' }
  return (
    <Link to="/" className={`font-black tracking-tighter ${sizes[size]}`}>
      OBL<span className="text-obliq-red">IQ</span>
    </Link>
  )
}
