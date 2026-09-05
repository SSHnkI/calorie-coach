import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchFoodHistory } from '../../lib/foodLog'
import { marcoDaSequencia, marcoNovo } from '../../lib/recompensa'
import { corDoConsumo, preenchimento } from '../../lib/semaforo'
import type { FoodEntry } from '../../types'

// Onde fica o ultimo marco comemorado. Por dispositivo, nao por conta: perder a
// festa por trocar de telefone e barato, repetir a festa toda vez que a tela
// recarrega estraga a festa.
const CHAVE_MARCO = 'obliq:marco-sequencia'

// null significa que este dispositivo nunca guardou nada. Nesse caso a primeira
// carga nao comemora: quem ja tinha 7 dias antes de abrir o app hoje nao acabou
// de conquistar nada agora.
function lerMarco(): number | null {
  try {
    const bruto = localStorage.getItem(CHAVE_MARCO)
    return bruto === null ? null : Number(bruto) || 0
  } catch {
    return null
  }
}

const ROTULOS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']

function chave(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

// Segunda desta semana. getDay() devolve 0 para domingo, que aqui e o ultimo dia.
function segundaDaSemana(hoje: Date) {
  const d = new Date(hoje)
  const desloca = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - desloca)
  d.setHours(0, 0, 0, 0)
  return d
}

type HabitoProps = {
  meta: number
  versao: number
  // Dia em edicao. Tocar numa barra passada e como o usuario volta pra anotar
  // o que esqueceu: a semana ja esta na tela, nao precisa de outro seletor.
  selecionado: Date
  onSelecionar: (dia: Date) => void
}

/**
 * Semana corrente, de segunda a domingo, com a altura de cada dia
 * proporcional a meta. E o unico lugar do app que mostra constancia.
 */
export function Habito({ meta, versao, selecionado, onSelecionar }: HabitoProps) {
  const [itens, setItens] = useState<FoodEntry[] | null>(null)
  // Marco recem cruzado, e o reforco menor de quem so manteve a corrente.
  const [festa, setFesta] = useState<number | null>(null)
  const [manteve, setManteve] = useState(false)
  const marcoGuardado = useRef<number | null>(lerMarco())
  const sequenciaAnterior = useRef<number | null>(null)

  useEffect(() => {
    fetchFoodHistory(30)
      .then(setItens)
      .catch(() => setItens([]))
  }, [versao])

  const { dias, sequencia } = useMemo(() => {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    const soma: Record<string, number> = {}
    for (const i of itens ?? []) {
      const d = new Date(i.logged_at)
      d.setHours(0, 0, 0, 0)
      soma[chave(d)] = (soma[chave(d)] ?? 0) + i.kcal
    }

    const segunda = segundaDaSemana(hoje)
    const dias = ROTULOS.map((rotulo, n) => {
      const d = new Date(segunda)
      d.setDate(d.getDate() + n)
      const kcal = soma[chave(d)] ?? 0
      return {
        rotulo,
        data: d,
        kcal,
        registrou: kcal > 0,
        hoje: chave(d) === chave(hoje),
        futuro: d > hoje,
        aberto: chave(d) === chave(selecionado),
      }
    })

    // A sequencia olha o historico inteiro, nao so a semana na tela.
    // O dia de hoje ainda vazio nao quebra nada: o dia nao acabou.
    let sequencia = 0
    const cursor = new Date(hoje)
    if (!soma[chave(cursor)]) cursor.setDate(cursor.getDate() - 1)
    while (soma[chave(cursor)]) {
      sequencia++
      cursor.setDate(cursor.getDate() - 1)
    }

    return { dias, sequencia }
  }, [itens, selecionado])

  // Comemoracao da corrente. Dispara na virada do marco, uma vez por marco, e
  // nunca na primeira carga de um dispositivo que ainda nao conhecia a pessoa.
  useEffect(() => {
    if (itens === null) return

    // Em const, nao lendo o ref direto: o TypeScript nao estreita propriedade
    // mutavel de objeto dentro do ternario.
    const guardado = marcoGuardado.current
    const { marco, guardar } = marcoNovo(
      sequencia,
      guardado === null ? (marcoDaSequencia(sequencia) ?? 0) : guardado,
    )
    marcoGuardado.current = guardar
    try {
      localStorage.setItem(CHAVE_MARCO, String(guardar))
    } catch {
      // navegador sem armazenamento: perde o controle de repeticao, nao quebra
    }

    const cresceu = sequenciaAnterior.current !== null && sequencia > sequenciaAnterior.current
    sequenciaAnterior.current = sequencia

    if (marco) {
      setFesta(marco)
      navigator.vibrate?.([12, 50, 12, 50, 28])
      const t = setTimeout(() => setFesta(null), 2800)
      return () => clearTimeout(t)
    }
    if (cresceu) {
      setManteve(true)
      const t = setTimeout(() => setManteve(false), 2200)
      return () => clearTimeout(t)
    }
  }, [sequencia, itens])

  if (!itens) return <div className="h-14 animate-pulse rounded-lg bg-obliq-surface" />

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-obliq-faint">
          semana
        </span>
        <span
          key={festa ?? 'normal'}
          className={`num flex items-baseline gap-1.5 ${festa ? 'bater' : ''}`}
        >
          {sequencia > 0 ? (
            <>
              <span
                className={`text-lg font-medium leading-none ${
                  festa ? 'text-obliq-red' : 'text-obliq-chalk'
                }`}
              >
                {sequencia}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-obliq-faint">
                {sequencia === 1 ? 'dia' : 'dias seguidos'}
              </span>
            </>
          ) : (
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-obliq-faint">
              comece hoje
            </span>
          )}
        </span>
      </div>

      <ol className="mt-2 flex gap-1">
        {dias.map((d) => (
          <li key={d.rotulo} className="flex-1">
            <button
              type="button"
              disabled={d.futuro}
              aria-pressed={d.aberto}
              aria-label={`${d.rotulo}, ${d.kcal ? `${d.kcal} kcal` : 'sem registro'}`}
              onClick={() => onSelecionar(d.data)}
              title={d.kcal ? `${d.kcal} kcal` : d.futuro ? 'ainda vem' : 'sem registro'}
              className={`block w-full rounded transition-colors duration-200 disabled:cursor-default ${
                d.aberto ? 'ring-1 ring-obliq-chalk' : d.hoje ? 'ring-1 ring-obliq-red/50' : ''
              } enabled:hover:ring-1 enabled:hover:ring-obliq-dim`}
            >
              {/* Mesma barra da coluna da refeicao, mesma regra: o dia e uma
                  refeicao maior. Corpo escuro que cresce com o consumo, ponta
                  arredondada com a cor, e barra inteira vermelha quando estoura.
                  Encostar no teto da caixa quer dizer teto, nao meta. */}
              <span
                className={`flex h-8 items-end overflow-hidden rounded ${
                  d.registrou
                    ? 'bg-obliq-raised'
                    : d.futuro
                      ? 'bg-obliq-surface/50'
                      : 'bg-obliq-surface'
                }`}
              >
                <span
                  className={`relative w-full overflow-hidden rounded-md transition-[height] duration-700 ease-out ${
                    !d.registrou
                      ? ''
                      : d.kcal > meta && meta > 0
                        ? corDoConsumo(d.kcal, meta)
                        : 'bg-obliq-dim'
                  }`}
                  style={{ height: `${preenchimento(d.kcal, meta, 12)}%` }}
                >
                  {d.registrou && !(d.kcal > meta && meta > 0) && (
                    <span
                      className={`absolute inset-x-0 top-0 h-1.5 rounded-t-md ${corDoConsumo(
                        d.kcal,
                        meta,
                      )}`}
                    />
                  )}
                </span>
              </span>
              <span
                className={`mt-0.5 block text-center font-mono text-[10px] ${
                  d.aberto || d.hoje ? 'text-obliq-chalk' : 'text-obliq-faint'
                }`}
              >
                {d.rotulo}
              </span>
            </button>
          </li>
        ))}
      </ol>

      {(festa || manteve) && (
        <p
          key={festa ? `marco-${festa}` : 'manteve'}
          role="status"
          className="rise mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-obliq-red"
        >
          {festa ? `${festa} dias seguidos` : 'corrente mantida'}
        </p>
      )}
    </section>
  )
}
