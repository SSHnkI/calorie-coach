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
    { title: t.landing.feature1Title, body: t.landing.feature1Desc, art: <ArtCampo /> },
    { title: t.landing.feature2Title, body: t.landing.feature2Desc, art: <ArtBase /> },
    { title: t.landing.feature3Title, body: t.landing.feature3Desc, art: <ArtMeta /> },
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

        {/* Cada passo mostra o artefato real do produto, nao so a descricao. */}
        <section className="border-t border-obliq-border">
          <div className="mx-auto max-w-5xl px-5 py-20 md:py-28">
            <h2 className="font-display text-3xl font-bold md:text-4xl">
              {t.landing.featuresTitle}
            </h2>

            <div className="mt-12 flex flex-col">
              {steps.map((s, i) => (
                <article
                  key={s.title}
                  className="grid items-center gap-6 border-t border-obliq-border py-10 md:grid-cols-2 md:gap-14 md:py-12"
                >
                  <div className={i % 2 ? 'md:order-2' : ''}>
                    <h3 className="font-display text-xl font-bold md:text-2xl">
                      {s.title}
                    </h3>
                    <p className="mt-2 max-w-[46ch] leading-relaxed text-obliq-dim">
                      {s.body}
                    </p>
                  </div>
                  <div className={i % 2 ? 'md:order-1' : ''}>{s.art}</div>
                </article>
              ))}
            </div>

            <div className="border-t border-obliq-border pt-12">
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

// Passo 1: o campo de registro, do jeito que o usuario ve.
function ArtCampo() {
  return (
    <div className="rounded-xl bg-obliq-surface p-5 ring-1 ring-obliq-border">
      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-obliq-faint">
        registrar alimento
      </span>
      <div className="mt-3 flex items-center rounded-lg bg-obliq-black px-3.5 py-3 ring-1 ring-obliq-dim">
        <span className="text-obliq-chalk">2 pães de queijo</span>
        <span className="ml-0.5 inline-block h-5 w-px animate-pulse bg-obliq-red" />
      </div>
    </div>
  )
}

// Passo 2: de onde vem o numero.
function ArtBase() {
  return (
    <div className="rounded-xl bg-obliq-surface p-5 ring-1 ring-obliq-border">
      <div className="flex items-baseline justify-between border-b border-obliq-border pb-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-obliq-faint">
          open food facts
        </span>
        <span className="font-mono text-[11px] text-obliq-faint">100 g</span>
      </div>
      <dl className="divide-y divide-obliq-border">
        {[
          ['energia', '320 kcal'],
          ['proteína', '12 g'],
          ['carboidrato', '32 g'],
          ['gordura', '16 g'],
        ].map(([k, v]) => (
          <div key={k} className="flex items-baseline py-2.5 text-sm">
            <dt className="text-obliq-dim">{k}</dt>
            <span className="leader" aria-hidden="true" />
            <dd className="num shrink-0 text-obliq-chalk">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

// Passo 3: a meta calculada, o numero que o app entrega.
function ArtMeta() {
  return (
    <div className="rounded-xl bg-obliq-surface p-5 ring-1 ring-obliq-border">
      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-obliq-faint">
        sua meta
      </span>
      <p className="num mt-2 text-5xl font-medium leading-none text-obliq-red">2.303</p>
      <p className="mt-2 text-sm text-obliq-dim">kcal por dia</p>
      <div className="mt-5 space-y-2 border-t border-obliq-border pt-4 font-mono text-[11px] text-obliq-faint">
        <p>32 anos · 78 kg · 1,79 m</p>
        <p>ativo · perder peso</p>
      </div>
    </div>
  )
}
