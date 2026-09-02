import type { FoodEntry } from '../../types'

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

export function Refeicoes({ entries }: { entries: FoodEntry[] }) {
  const agora = new Date().getHours()
  const atual = janelaDe(agora)

  const porJanela = JANELAS.map((j) => {
    const itens = entries.filter((e) => janelaDe(new Date(e.logged_at).getHours()) === j.id)
    return {
      ...j,
      itens: itens.length,
      kcal: itens.reduce((s, e) => s + e.kcal, 0),
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
          refeições do dia
        </span>
        <span className="num text-sm">
          {preenchidas}
          <span className="text-obliq-faint">/4</span>
        </span>
      </div>

      <ol className="mt-3 grid grid-cols-4 gap-1.5">
        {porJanela.map((j) => (
          <li key={j.id}>
            <div
              className={`rounded-lg px-2 py-3 text-center transition-colors duration-300 ${
                j.itens > 0
                  ? 'bg-obliq-raised ring-1 ring-obliq-border'
                  : j.agora
                    ? 'bg-obliq-surface ring-1 ring-obliq-red/50'
                    : 'bg-obliq-surface ring-1 ring-obliq-border ring-dashed'
              }`}
            >
              <span
                className={`num block text-lg font-medium leading-none ${
                  j.itens > 0 ? 'text-obliq-chalk' : 'text-obliq-faint'
                }`}
              >
                {j.itens > 0 ? j.kcal : '·'}
              </span>
              <span className="mt-1 block font-mono text-[10px] text-obliq-faint">
                {j.rotulo}
              </span>
            </div>
          </li>
        ))}
      </ol>

      {esquecidas > 0 && (
        <p className="mt-2.5 font-mono text-[11px] text-obliq-faint">
          {esquecidas === 1
            ? 'falta 1 refeição de hoje sem registro'
            : `faltam ${esquecidas} refeições de hoje sem registro`}
        </p>
      )}
      {esquecidas === 0 && preenchidas === 4 && (
        <p className="mt-2.5 font-mono text-[11px] text-obliq-chalk">
          dia inteiro registrado
        </p>
      )}
    </section>
  )
}
