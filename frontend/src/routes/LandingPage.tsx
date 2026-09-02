import { Button } from '../components/ui/Button'
import { Logo } from '../components/layout/Logo'
import { useI18n } from '../i18n/I18nContext'

// Amostra do proprio registro do app como heroi da pagina:
// mostra o produto funcionando em vez de descrever o produto.
const LEDGER = [
  { food: 'pão de queijo', qty: '2 un', kcal: 160 },
  { food: 'café com leite', qty: '200 ml', kcal: 87 },
  { food: 'arroz, feijão e frango', qty: '1 prato', kcal: 612 },
  { food: 'banana', qty: '1 un', kcal: 105 },
]

export function LandingPage() {
  const { t } = useI18n()
  const total = LEDGER.reduce((s, l) => s + l.kcal, 0)

  const steps = [
    { n: 'um', title: t.landing.feature1Title, body: t.landing.feature1Desc },
    { n: 'dois', title: t.landing.feature2Title, body: t.landing.feature2Desc },
    { n: 'três', title: t.landing.feature3Title, body: t.landing.feature3Desc },
  ]

  return (
    <div className="min-h-dvh bg-obliq-black">
      <header className="mx-auto flex max-w-5xl items-center px-5 pt-6">
        <Logo size="sm" />
      </header>

      <main id="conteudo">
        {/* Heroi assimetrico: texto a esquerda, registro real a direita. */}
        <section className="mx-auto grid max-w-5xl gap-12 px-5 pt-14 pb-20 md:grid-cols-[1.05fr_1fr] md:items-center md:gap-16 md:pt-24 md:pb-28">
          <div>
            <h1 className="font-display text-[clamp(2.75rem,9vw,4.5rem)] font-extrabold leading-[0.92]">
              {t.landing.tagline1}
              <br />
              {t.landing.tagline2}
              <br />
              <span className="text-obliq-red">{t.landing.tagline3}</span>
            </h1>
            <p className="mt-6 max-w-[38ch] text-base leading-relaxed text-obliq-dim">
              {t.landing.subtitle}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Button to="/auth?mode=signup">{t.landing.startFree}</Button>
              <Button to="/auth" variant="ghost">
                {t.auth.login}
              </Button>
            </div>
          </div>

          {/* Assinatura da marca: o livro-caixa do dia. */}
          <div className="rounded-xl bg-obliq-surface p-5 shadow-lift ring-1 ring-obliq-border sm:p-6">
            <div className="flex items-baseline justify-between border-b border-obliq-border pb-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-obliq-faint">
                terça-feira
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-obliq-faint">
                registro
              </span>
            </div>

            <ul className="py-2">
              {LEDGER.map((l, i) => (
                <li
                  key={l.food}
                  className="rise flex items-baseline py-2.5 text-sm"
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  <span className="text-obliq-chalk">{l.food}</span>
                  <span className="leader" aria-hidden="true" />
                  <span className="num shrink-0 text-obliq-dim">{l.kcal}</span>
                </li>
              ))}
            </ul>

            <div className="flex items-baseline justify-between border-t border-obliq-border pt-4">
              <span className="text-sm text-obliq-dim">total do dia</span>
              <span className="num text-3xl font-medium text-obliq-red">{total}</span>
            </div>
          </div>
        </section>

        {/* Passos numerados por extenso: e uma sequencia de verdade. */}
        <section className="border-t border-obliq-border">
          <div className="mx-auto max-w-5xl px-5 py-20 md:py-24">
            <h2 className="font-display text-2xl font-bold md:text-3xl">
              {t.landing.featuresTitle}
            </h2>

            <div className="mt-10 flex flex-col gap-px bg-obliq-border">
              {steps.map((s) => (
                <article
                  key={s.title}
                  className="grid gap-2 bg-obliq-black py-7 md:grid-cols-[7rem_1fr] md:gap-8"
                >
                  <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-obliq-faint">
                    {s.n}
                  </span>
                  <div className="max-w-[62ch]">
                    <h3 className="font-display text-lg font-bold">{s.title}</h3>
                    <p className="mt-1.5 leading-relaxed text-obliq-dim">{s.body}</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-14">
              <Button to="/auth?mode=signup">{t.landing.startFree}</Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-obliq-border">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-xs text-obliq-faint">
          <Logo size="sm" />
          <p>{t.landing.footer}</p>
        </div>
      </footer>
    </div>
  )
}
