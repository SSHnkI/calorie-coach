import { useEffect, useRef, useState } from 'react'

// Numero que sobe ate o valor novo. O movimento e a recompensa
// de ter registrado: o total pular seco nao marca nada.
export function useCountUp(alvo: number, duracao = 620) {
  const [valor, setValor] = useState(alvo)
  const deRef = useRef(alvo)
  const frameRef = useRef(0)

  useEffect(() => {
    const de = deRef.current
    if (de === alvo) return

    const reduzido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduzido) {
      deRef.current = alvo
      setValor(alvo)
      return
    }

    const inicio = performance.now()
    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / duracao)
      const suave = 1 - Math.pow(1 - t, 3)
      setValor(Math.round(de + (alvo - de) * suave))
      if (t < 1) frameRef.current = requestAnimationFrame(passo)
      else deRef.current = alvo
    }

    frameRef.current = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(frameRef.current)
  }, [alvo, duracao])

  return valor
}
