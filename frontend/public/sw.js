// Casca do app em cache: abrir o PWA sem rede mostra a interface,
// nao a tela de dinossauro. Dados continuam vindo da rede.
const CACHE = 'obliq-v4'
const CASCA = '/index.html'

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.add(CASCA)))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

// Celular saindo do background costuma ter rede lenta antes de dormir de novo.
// Esperar a rede indefinidamente e o que deixa o app na tela branca: depois de
// 3s a casca cacheada assume e o React sobe com os dados vindo atras.
function comTeto(promessa, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms)
    promessa.then(
      (v) => {
        clearTimeout(t)
        resolve(v)
      },
      (e) => {
        clearTimeout(t)
        reject(e)
      },
    )
  })
}

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // Navegacao: rede primeiro (com teto), casca cacheada como rede de seguranca.
  if (req.mode === 'navigate') {
    e.respondWith(
      comTeto(fetch(req), 3000)
        .then((res) => {
          const copia = res.clone()
          caches.open(CACHE).then((c) => c.put(CASCA, copia))
          return res
        })
        .catch(async () => {
          const hit = await caches.match(CASCA)
          // Sem cache e sem rede: devolve resposta propria em vez de undefined,
          // que o navegador traduz como erro de rede.
          return (
            hit ??
            new Response('<!doctype html><meta http-equiv="refresh" content="1">', {
              headers: { 'Content-Type': 'text/html; charset=utf-8' },
            })
          )
        }),
    )
    return
  }

  // Bundles com hash no nome nunca mudam de conteudo: cache primeiro.
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ??
          fetch(req).then((res) => {
            const copia = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copia))
            return res
          }),
      ),
    )
  }
})
