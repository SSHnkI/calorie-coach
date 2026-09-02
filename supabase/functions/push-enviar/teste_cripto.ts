// Checagem do que nao da pra testar em producao sem um celular na mao:
// a criptografia do push. Faz o papel do navegador (gera o par de chaves,
// recebe o corpo, decripta) e confere que volta o texto original, alem de
// validar a assinatura do JWT VAPID com a chave publica.
//
//   npx deno run --allow-read supabase/functions/push-enviar/teste_cripto.ts
//
// ponytail: importa o index.ts como modulo em memoria (sem o Deno.serve e sem
// o import de npm) pra nao duplicar o codigo criptografico no teste.
const fonte = await Deno.readTextFile(
  new URL('./index.ts', import.meta.url),
)
const semServidor =
  fonte
    .replace(/^import .*$/m, '')
    .replace(/Deno\.serve\([\s\S]*$/, '') +
  '\nexport { encriptar, vapid, mensagem }\n'

const mod = await import(
  'data:application/typescript;charset=utf-8,' + encodeURIComponent(semServidor)
)

const enc = (s: string) => new TextEncoder().encode(s)
const paraB64u = (b: Uint8Array) =>
  btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

function juntar(...partes: Uint8Array[]) {
  const saida = new Uint8Array(partes.reduce((n, p) => n + p.length, 0))
  let i = 0
  for (const p of partes) {
    saida.set(p, i)
    i += p.length
  }
  return saida
}

async function hkdf(ikm: Uint8Array, salt: Uint8Array, info: Uint8Array, bytes: number) {
  const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  return new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, bytes * 8),
  )
}

// --- papel do navegador: assina, recebe, decripta ---
const cliente = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
  'deriveBits',
])
const clientePub = new Uint8Array(await crypto.subtle.exportKey('raw', cliente.publicKey))
const authSecret = crypto.getRandomValues(new Uint8Array(16))

const original = JSON.stringify({
  title: 'Meta do dia batida',
  body: '2.303 de 2.303 kcal. Dia fechado.',
  tag: 'meta',
})

const corpo: Uint8Array = await mod.encriptar(
  original,
  paraB64u(clientePub),
  paraB64u(authSecret),
)

const salt = corpo.slice(0, 16)
const idlen = corpo[20]
const servidorPub = corpo.slice(21, 21 + idlen)
const cifrado = corpo.slice(21 + idlen)

const servidorKey = await crypto.subtle.importKey(
  'raw',
  servidorPub,
  { name: 'ECDH', namedCurve: 'P-256' },
  false,
  [],
)
const compartilhado = new Uint8Array(
  await crypto.subtle.deriveBits({ name: 'ECDH', public: servidorKey }, cliente.privateKey, 256),
)

const ikm = await hkdf(
  compartilhado,
  authSecret,
  juntar(enc('WebPush: info'), new Uint8Array([0]), clientePub, servidorPub),
  32,
)
const cek = await hkdf(
  ikm,
  salt,
  juntar(enc('Content-Encoding: aes128gcm'), new Uint8Array([0])),
  16,
)
const nonce = await hkdf(
  ikm,
  salt,
  juntar(enc('Content-Encoding: nonce'), new Uint8Array([0])),
  12,
)

const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt'])
const aberto = new Uint8Array(
  await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, aes, cifrado),
)

const delimitador = aberto[aberto.length - 1]
const texto = new TextDecoder().decode(aberto.slice(0, -1))

if (idlen !== 65) throw new Error('tamanho da chave efemera errado: ' + idlen)
if (delimitador !== 2) throw new Error('delimitador de registro errado: ' + delimitador)
if (texto !== original) throw new Error('texto decriptado diferente: ' + texto)

// --- VAPID: a assinatura tem que fechar com a chave publica publicada ---
const par = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
  'sign',
  'verify',
])
const jwk = await crypto.subtle.exportKey('jwk', par.privateKey)
const jwt: string = await mod.vapid('https://fcm.googleapis.com', 'mailto:a@b.c', jwk)
const [cab, payload, assinatura] = jwt.split('.')
const ok = await crypto.subtle.verify(
  { name: 'ECDSA', hash: 'SHA-256' },
  par.publicKey,
  Uint8Array.from(
    atob(assinatura.replace(/-/g, '+').replace(/_/g, '/')),
    (c) => c.charCodeAt(0),
  ),
  enc(cab + '.' + payload),
)
if (!ok) throw new Error('assinatura VAPID nao confere')

const aud = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
if (aud.aud !== 'https://fcm.googleapis.com') throw new Error('aud errado')

// --- mensagens: o saldo muda de texto conforme o objetivo ---
const perfil = {
  id: 'x',
  daily_kcal: 2000,
  goal: 'lose',
  age: 30,
  weight_kg: 80,
  height_cm: 180,
  sex: 'male',
  activity: 'moderate',
}
const semZero = { dias: 0, soma: 0 }
const saldoEmagrecer = mod.mensagem('saldo', perfil, 1500, semZero)
if (!saldoEmagrecer.title.includes('500')) throw new Error('saldo errado: ' + saldoEmagrecer.title)

const saldoGanhar = mod.mensagem('saldo', { ...perfil, goal: 'gain', daily_kcal: 3000 }, 2500, semZero)
if (!saldoGanhar.title.includes('Faltam 500')) throw new Error('ganho errado: ' + saldoGanhar.title)

const acima = mod.mensagem('saldo', perfil, 2400, semZero)
if (!acima.title.includes('400 kcal acima')) throw new Error('estouro errado: ' + acima.title)

const dentro = mod.mensagem('saldo', perfil, 1980, semZero)
if (dentro !== null) throw new Error('quem esta na meta nao devia receber saldo')

const semana = mod.mensagem('semana', perfil, 0, { dias: 7, soma: 14000 })
if (!semana.body.includes('Déficit')) throw new Error('semana errada: ' + semana.body)

console.log('ok: cripto, vapid e mensagens')
console.log(' saldo emagrecer:', saldoEmagrecer.title, '|', saldoEmagrecer.body)
console.log(' saldo ganhar:   ', saldoGanhar.title, '|', saldoGanhar.body)
console.log(' semana:         ', semana.title, '|', semana.body)
