import type { FoodEntry } from '../../types'
import { metasPorRefeicao } from '../../lib/tdee'
import { PERIODOS, horaContinua, periodoDe, type PeriodoId } from '../../lib/periodos'
import { corDoConsumo, preenchimento } from '../../lib/semaforo'
import { Icon } from '../ui/Icon'

// As quatro janelas do dia. O que cria o impulso de registrar tudo nao e
// enfeite: e ver um espaco vazio que voce sabe que deveria estar preenchido.
// A lista mora em lib/periodos.ts, porque a hora carimbada no registro e o
// agrupamento do diario tem que ler exatamente a mesma coisa.

export function Refeicoes({
  entries,
  meta,
  selecionado,
  onSelecionar,
}: {
  entries: FoodEntry[]
  meta: number
  // Qual janela recebe o proximo registro. Sem isso a pessoa nao consegue
  // anotar o cafe da manha depois do almoco.
  selecionado: PeriodoId
  onSelecionar: (p: PeriodoId) => void
}) {
  const agora = new Date().getHours()
  const metas = metasPorRefeicao(PERIODOS, meta)

  const porJanela = PERIODOS.map((j) => {
    const itens = entries.filter((e) => periodoDe(new Date(e.logged_at)) === j.id)
    const kcal = itens.reduce((s, e) => s + e.kcal, 0)
    return {
      ...j,
      itens: itens.length,
      kcal,
      alvo: metas[j.id],
      preenchido: preenchimento(kcal, metas[j.id], 6),
      estourou: kcal > metas[j.id],
      fechou: kcal >= metas[j.id] * 0.9 && kcal <= metas[j.id],
      alvoDoRegistro: j.id === selecionado,
    }
  })

  const preenchidas = porJanela.filter((j) => j.itens > 0).length
  const passadas = porJanela.filter((j) => j.ate <= horaContinua(agora))
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
            <button
              type="button"
              onClick={() => onSelecionar(j.id)}
              aria-pressed={j.alvoDoRegistro}
              aria-label={`Registrar na ${j.rotulo}, ${j.kcal} de ${j.alvo} kcal`}
              className={`w-full rounded-lg px-1.5 py-2 text-center transition-colors duration-300 ${
                j.estourou
                  ? 'bg-obliq-red/10 ring-1 ring-obliq-red/40'
                  : j.itens > 0
                    ? 'bg-obliq-raised ring-1 ring-obliq-border'
                    : 'bg-obliq-surface ring-1 ring-obliq-border ring-dashed'
              } ${
                // Selecao em cinza claro, nao em vermelho: aqui o vermelho ja
                // significa "passou da meta", e duas coisas na mesma cor viram
                // uma coisa so.
                j.alvoDoRegistro ? 'ring-2 ring-obliq-line' : ''
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
              <span
                className={`mt-1 block font-mono text-[11px] ${
                  j.alvoDoRegistro ? 'text-obliq-chalk' : 'text-obliq-faint'
                }`}
              >
                {j.rotulo}
              </span>

              {/* O trilho e neutro e mede o quanto entrou. A cor vive so no
                  marcador de 2px na ponta do preenchimento: ele anda com o
                  consumo, e so encosta no fim quando bate o teto, que fica um
                  quarto acima da meta. Preenchimento colorido inteiro pintava
                  a tela de verde sem dizer nada a mais. */}
              <span className="relative mt-1.5 block h-1 rounded-full bg-obliq-border">
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-obliq-dim transition-[width] duration-500 ease-out"
                  style={{ width: `${j.preenchido}%` }}
                />
                {j.preenchido > 0 && (
                  <span
                    className={`absolute top-1/2 h-2 w-0.5 -translate-y-1/2 rounded-full transition-[left] duration-500 ease-out ${corDoConsumo(
                      j.kcal,
                      j.alvo,
                    )}`}
                    style={{ left: `calc(${j.preenchido}% - 2px)` }}
                  />
                )}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}
