import type { FoodEntry, UserProfile } from '../../types'
import { metasPorRefeicao } from '../../lib/tdee'
import { Icon } from '../ui/Icon'

// Quatro janelas do dia. O que cria o impulso de registrar tudo nao e
// enfeite: e ver um espaco vazio que voce sabe que deveria estar preenchido.
const JANELAS = [
  { id: 'manha', rotulo: 'manhã', de: 4, ate: 10 },
  { id: 'almoco', rotulo: 'almoço', de: 10, ate: 15 },
  { id: 'tarde', rotulo: 'tarde', de: 15, ate: 19 },
  { id: 'noite', rotulo: 'noite', de: 19, ate: 28 },
] as const

function janelaDe(hora: number) {
  const h = hora < 4 ? hora + 24 : hora
  return JANELAS.find((j) => h >= j.de && h < j.ate)?.id ?? 'noite'
}

export function Refeicoes({
  entries,
  meta,
  perfil,
}: {
  entries: FoodEntry[]
  meta: number
  perfil: UserProfile | null
}) {
  const agora = new Date().getHours()
  const atual = janelaDe(agora)
  const metas = metasPorRefeicao(JANELAS, meta, perfil)

  const porJanela = JANELAS.map((j) => {
    const itens = entries.filter((e) => janelaDe(new Date(e.logged_at).getHours()) === j.id)
    const kcal = itens.reduce((s, e) => s + e.kcal, 0)
    return {
      ...j,
      itens: itens.length,
      kcal,
      alvo: metas[j.id],
      estourou: kcal > metas[j.id],
      fechou: kcal >= metas[j.id] * 0.9 && kcal <= metas[j.id],
      agora: j.id === atual,
    }
  })

  const preenchidas = porJanela.filter((j) => j.itens > 0).length
  const passadas = porJanela.filter((j) => j.ate <= (agora < 4 ? agora + 24 : agora))
  const esquecidas = passadas.filter((j) => j.itens === 0).length

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-obliq-faint">
          refeições
        </span>
        <span className="num text-xs">
          {esquecidas > 0 ? (
            <span className="text-obliq-red">
              {esquecidas} {esquecidas === 1 ? 'em aberto' : 'em aberto'}
            </span>
          ) : preenchidas === 4 ? (
            <span className="text-obliq-chalk">dia completo</span>
          ) : (
            <span className="text-obliq-faint">em dia</span>
          )}
          <span className="ml-2 text-obliq-dim">{preenchidas}/4</span>
        </span>
      </div>

      <ol className="mt-2 grid grid-cols-4 gap-1.5">
        {porJanela.map((j) => (
          <li key={j.id}>
            <div
              className={`rounded-lg px-1 py-2 text-center transition-colors duration-300 ${
                j.itens > 0
                  ? 'bg-obliq-raised ring-1 ring-obliq-border'
                  : j.agora
                    ? 'bg-obliq-surface ring-1 ring-obliq-red/50'
                    : 'bg-obliq-surface ring-1 ring-obliq-border ring-dashed'
              }`}
            >
              <span
                className={`num block text-base font-medium leading-none ${
                  j.itens === 0
                    ? 'text-obliq-faint'
                    : j.estourou
                      ? 'text-obliq-red'
                      : 'text-obliq-chalk'
                }`}
              >
                {j.itens > 0 ? j.kcal : '·'}
              </span>
              {j.fechou ? (
                <Icon
                  name="check"
                  className="bater mx-auto mt-0.5 h-3 w-3 text-obliq-chalk"
                />
              ) : (
                <span className="num mt-0.5 block text-[11px] leading-none text-obliq-faint">
                  /{j.alvo}
                </span>
              )}
              <span className="mt-1 block font-mono text-[11px] text-obliq-faint">
                {j.rotulo}
              </span>
            </div>
          </li>
        ))}
      </ol>

    </section>
  )
}
