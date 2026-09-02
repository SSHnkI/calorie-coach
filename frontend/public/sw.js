// Casca do app em cache: abrir o PWA sem rede mostra a interface,
// nao a tela de dinossauro. Dados continuam vindo da rede.
const CACHE = 'obliq-v3'
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

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // Navegacao: rede primeiro, casca cacheada como rede de seguranca.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          caches.open(CACHE).then((c) => c.put(CASCA, res.clone()))
          return res
        })
        .catch(() => caches.match(CASCA)),
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
