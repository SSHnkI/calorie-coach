// Toast minimalista (sem libs/estado) — estilos inline pra não depender do purge do Tailwind.
export function toast(message: string) {
  const el = document.createElement('div')
  el.textContent = message
  el.style.cssText =
    'position:fixed;left:50%;bottom:96px;transform:translateX(-50%) translateY(8px);z-index:200;' +
    'background:#161616;border:1px solid #2a2a2a;color:#fff;padding:11px 18px;border-radius:14px;' +
    'font:700 13px/1.3 system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.5),0 0 18px rgba(232,0,13,.25);' +
    'max-width:88%;text-align:center;opacity:0;transition:opacity .2s,transform .2s'
  document.body.appendChild(el)
  requestAnimationFrame(() => {
    el.style.opacity = '1'
    el.style.transform = 'translateX(-50%) translateY(0)'
  })
  setTimeout(() => {
    el.style.opacity = '0'
    el.style.transform = 'translateX(-50%) translateY(8px)'
    setTimeout(() => el.remove(), 250)
  }, 2400)
}
