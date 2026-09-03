import { useEffect, useRef, useState } from 'react'

// Pagina de diagnostico do teclado. Existe porque nao da pra abrir um iPhone
// daqui, e duas correcoes ja foram entregues erradas por chute. Ela mostra, em
// numeros grandes e legiveis numa foto, o que o navegador realmente reporta com
// o teclado aberto. Some assim que o teclado estiver resolvido.
type Leitura = Record<string, string | number | boolean>

function ler(barra: HTMLElement | null): Leitura {
  const vv = window.visualViewport
  const r = barra?.getBoundingClientRect()
  return {
    innerHeight: window.innerHeight,
    innerWidth: window.innerWidth,
    'vv.height': vv ? Math.round(vv.height) : 'sem vv',
    'vv.offsetTop': vv ? Math.round(vv.offsetTop) : 'sem vv',
    'vv.pageTop': vv ? Math.round(vv.pageTop) : 'sem vv',
    'vv.scale': vv ? Number(vv.scale.toFixed(2)) : 'sem vv',
    scrollY: Math.round(window.scrollY),
    'doc.clientHeight': document.documentElement.clientHeight,
    'doc.scrollHeight': document.documentElement.scrollHeight,
    'barra.top': r ? Math.round(r.top) : '-',
    'barra.bottom': r ? Math.round(r.bottom) : '-',
    'barra.height': r ? Math.round(r.height) : '-',
    standalone: window.matchMedia('(display-mode: standalone)').matches,
    'safe-bottom': getComputedStyle(document.documentElement)
      .getPropertyValue('--probe-safe-bottom')
      .trim(),
    dvh: Math.round(
      Number(getComputedStyle(document.documentElement).getPropertyValue('--probe-dvh').replace('px', '')) || 0,
    ),
    ua: navigator.userAgent.slice(-42),
  }
}

export function DiagPage() {
  const barraRef = useRef<HTMLDivElement>(null)
  const [leitura, setLeitura] = useState<Leitura>({})
  const [foco, setFoco] = useState(false)

  useEffect(() => {
    const atualizar = () => setLeitura(ler(barraRef.current))
    atualizar()
    const t = setInterval(atualizar, 250)
    const vv = window.visualViewport
    vv?.addEventListener('resize', atualizar)
    vv?.addEventListener('scroll', atualizar)
    window.addEventListener('scroll', atualizar, { passive: true })
    return () => {
      clearInterval(t)
      vv?.removeEventListener('resize', atualizar)
      vv?.removeEventListener('scroll', atualizar)
      window.removeEventListener('scroll', atualizar)
    }
  }, [])

  // Sondas em CSS puro, para saber o que o navegador acha que sao dvh e a area
  // segura. Lidas pelo getComputedStyle acima.
  const sondas = `:root { --probe-dvh: 100dvh; --probe-safe-bottom: env(safe-area-inset-bottom, 0px); }`

  return (
    <div className="min-h-[200vh] bg-obliq-black p-4 text-obliq-chalk">
      <style>{sondas}</style>

      <h1 className="font-mono text-sm uppercase tracking-[0.14em] text-obliq-faint">
        diagnóstico do teclado
      </h1>
      <p className="mt-2 max-w-[40ch] font-mono text-[13px] leading-relaxed text-obliq-dim">
        1. toque no campo lá embaixo para abrir o teclado
        <br />
        2. tire o print com o teclado aberto
        <br />
        3. role um pouco e tire outro
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[15px]">
        {Object.entries(leitura).map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="truncate text-obliq-faint">{k}</dt>
            <dd className="num text-obliq-chalk">{String(v)}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 font-mono text-[15px]">
        foco: <span className="text-obliq-red">{foco ? 'SIM' : 'não'}</span>
      </p>

      <p className="mt-8 font-mono text-[13px] text-obliq-faint">
        conteúdo longo abaixo, para a página poder rolar
      </p>

      <div
        ref={barraRef}
        className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-obliq-red bg-obliq-surface p-3"
      >
        <input
          onFocus={() => setFoco(true)}
          onBlur={() => setFoco(false)}
          placeholder="toque aqui"
          aria-label="Campo de teste do teclado"
          className="h-12 w-full rounded-xl bg-obliq-black px-4 text-base text-obliq-chalk ring-1 ring-obliq-border outline-none"
        />
        <p className="mt-1 text-center font-mono text-[12px] text-obliq-faint">
          esta é a barra medida
        </p>
      </div>
    </div>
  )
}
