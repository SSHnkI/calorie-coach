// Web push do Obliq. Assina VAPID (RFC 8292) e encripta o payload em
// aes128gcm (RFC 8291) com WebCrypto puro: nenhuma dependencia de npm que
// possa quebrar no runtime da Edge Function.
//
// Quem chama e o pg_cron (uma vez por hora) e o trigger de meta batida.
// A prova de identidade e o header x-obliq-cron, comparado com o segredo
// guardado em push_cfg (tabela sem policy: so a service role le).
import { createClient } from 'npm:@supabase/supabase-js@2'

const enc = (s: string) => new TextEncoder().encode(s)

function juntar(...partes: Uint8Array[]) {
  const total = partes.reduce((n, p) => n + p.length, 0)
  const saida = new Uint8Array(total)
  let i = 0
  for (const p of partes) {
    saida.set(p, i)
    i += p.length
  }
  return saida
}

function deB64u(s: string) {
  const b = s.replace(/-/g, '+').replace(/_/g, '/')
  const pad = b + '='.repeat((4 - (b.length % 4)) % 4)
  return Uint8Array.from(atob(pad), (c) => c.charCodeAt(0))
}

function paraB64u(b: Uint8Array) {
  let s = ''
  for (const byte of b) s += String.fromCharCode(byte)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function hkdf(ikm: Uint8Array, salt: Uint8Array, info: Uint8Array, bytes: number) {
  const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    k,
    bytes * 8,
  )
  return new Uint8Array(bits)
}

// Corpo do push: salt | rs | tamanho da chave | chave efemera | ciphertext.
async function encriptar(texto: string, p256dh: string, authSecret: string) {
  const clientePub = deB64u(p256dh)
  const auth = deB64u(authSecret)

  const efemera = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits'],
  )
  const servidorPub = new Uint8Array(
    await crypto.subtle.exportKey('raw', efemera.publicKey),
  )
  const clienteKey = await crypto.subtle.importKey(
    'raw',
    clientePub,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  )
  const compartilhado = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: clienteKey },
      efemera.privateKey,
      256,
    ),
  )

  const infoChave = juntar(
    enc('WebPush: info'),
    new Uint8Array([0]),
    clientePub,
    servidorPub,
  )
  const ikm = await hkdf(compartilhado, auth, infoChave, 32)

  const salt = crypto.getRandomValues(new Uint8Array(16))
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

  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  const cifrado = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce },
      aes,
      juntar(enc(texto), new Uint8Array([2])),
    ),
  )

  const rs = new Uint8Array(4)
  new DataView(rs.buffer).setUint32(0, 4096)
  return juntar(salt, rs, new Uint8Array([servidorPub.length]), servidorPub, cifrado)
}

async function vapid(aud: string, subject: string, jwk: JsonWebKey) {
  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )
  const cabecalho = paraB64u(enc(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const corpo = paraB64u(
    enc(
      JSON.stringify({
        aud,
        exp: Math.floor(Date.now() / 1000) + 12 * 3600,
        sub: subject,
      }),
    ),
  )
  const assinatura = new Uint8Array(
    await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      enc(cabecalho + '.' + corpo),
    ),
  )
  return cabecalho + '.' + corpo + '.' + paraB64u(assinatura)
}

type Cfg = { vapid_private: JsonWebKey; vapid_public: string; subject: string }
type Sub = { endpoint: string; user_id: string; p256dh: string; auth: string; tz: string }
type Aviso = { title: string; body: string; tag: string }

async function entregar(sub: Sub, aviso: Aviso, cfg: Cfg) {
  const corpo = await encriptar(JSON.stringify(aviso), sub.p256dh, sub.auth)
  const jwt = await vapid(new URL(sub.endpoint).origin, cfg.subject, cfg.vapid_private)
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '86400',
      Authorization: 'vapid t=' + jwt + ', k=' + cfg.vapid_public,
    },
    body: corpo,
  })
  return res.status
}

// --- calculo, o mesmo do frontend (lib/tdee.ts) ---
const MULT: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

type Perfil = {
  id: string
  daily_kcal: number | null
  goal: string | null
  age: number | null
  weight_kg: number | null
  height_cm: number | null
  sex: string | null
  activity: string | null
}

function manutencao(p: Perfil) {
  if (!p.weight_kg || !p.height_cm || !p.age || !p.sex || !p.activity) return null
  const bmr =
    p.sex === 'male'
      ? 10 * +p.weight_kg + 6.25 * +p.height_cm - 5 * p.age + 5
      : 10 * +p.weight_kg + 6.25 * +p.height_cm - 5 * p.age - 161
  return Math.round(bmr * (MULT[p.activity] ?? 1.2))
}

const nUm = (n: number) => Math.round(n).toLocaleString('pt-BR')
const nKg = (n: number) => Math.abs(n).toFixed(1).replace('.', ',')

// Data local (YYYY-MM-DD), hora local e dia da semana de um fuso.
function diaLocal(ts: string | Date, tz: string) {
  return new Date(ts).toLocaleDateString('en-CA', { timeZone: tz })
}

function horaLocal(tz: string) {
  const h = Number(
    new Date().toLocaleString('en-US', { timeZone: tz, hour12: false, hour: '2-digit' }),
  )
  return h % 24
}

function ehDomingo(tz: string) {
  return new Date().toLocaleDateString('en-US', { timeZone: tz, weekday: 'short' }) === 'Sun'
}

function mensagem(
  tipo: string,
  p: Perfil,
  total: number,
  semana: { dias: number; soma: number },
): Aviso | null {
  const meta = p.daily_kcal ?? 0
  const ganhar = p.goal === 'gain'

  if (tipo === 'registro') {
    return {
      title: 'Nada anotado hoje',
      body: 'Registre o que você comeu pra não perder a sequência.',
      tag: 'registro',
    }
  }

  if (tipo === 'meta') {
    return {
      title: 'Meta do dia batida',
      body: nUm(total) + ' de ' + nUm(meta) + ' kcal. Dia fechado.',
      tag: 'meta',
    }
  }

  if (tipo === 'saldo') {
    if (!meta) return null
    const falta = meta - total

    if (total === 0) {
      return {
        title: 'O dia inteiro sem registro',
        body: 'Sua meta é ' + nUm(meta) + ' kcal. Anote antes de dormir.',
        tag: 'saldo',
      }
    }
    if (falta >= 50) {
      return ganhar
        ? {
            title: 'Faltam ' + nUm(falta) + ' kcal',
            body:
              'Você está em ' +
              nUm(total) +
              ' de ' +
              nUm(meta) +
              '. Coma mais um pouco pra fechar a meta de ganho.',
            tag: 'saldo',
          }
        : {
            title: nUm(falta) + ' kcal de saldo',
            body:
              'Você está em ' + nUm(total) + ' de ' + nUm(meta) + ' kcal. Ainda cabe.',
            tag: 'saldo',
          }
    }
    if (falta <= -50) {
      return {
        title: nUm(-falta) + ' kcal acima da meta',
        body: 'Fechou em ' + nUm(total) + ' de ' + nUm(meta) + '. Amanhã é outro dia.',
        tag: 'saldo',
      }
    }
    return null
  }

  if (tipo === 'semana') {
    if (!semana.dias) {
      return {
        title: 'Semana sem registro',
        body: 'Nenhum dia anotado. Comece amanhã com uma refeição só.',
        tag: 'semana',
      }
    }
    const media = semana.soma / semana.dias
    const manut = manutencao(p)
    const saldo = manut ? manut * semana.dias - semana.soma : null
    const cauda =
      saldo === null
        ? ''
        : saldo > 0
          ? ' Déficit de ' + nUm(saldo) + ' kcal, cerca de ' + nKg(saldo / 7700) + ' kg.'
          : ' Superávit de ' + nUm(-saldo) + ' kcal, cerca de ' + nKg(saldo / 7700) + ' kg.'
    return {
      title: 'Semana: ' + semana.dias + (semana.dias === 1 ? ' dia' : ' dias') + ' registrados',
      body: 'Média de ' + nUm(media) + ' kcal por dia.' + cauda,
      tag: 'semana',
    }
  }

  return null
}

Deno.serve(async (req) => {
  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: cfg } = await db
    .from('push_cfg')
    .select('vapid_private, vapid_public, subject, cron_secret')
    .eq('id', 1)
    .single()

  if (!cfg) return new Response('sem configuração', { status: 500 })
  if (req.headers.get('x-obliq-cron') !== cfg.cron_secret) {
    return new Response('não autorizado', { status: 401 })
  }

  const pedido = await req.json().catch(() => ({}))
  const alvo: string | undefined = pedido.user_id
  const forcar = pedido.tipo === 'meta' ? 'meta' : undefined

  let q = db.from('push_subs').select('endpoint, user_id, p256dh, auth, tz')
  if (alvo) q = q.eq('user_id', alvo)
  const { data: subs } = await q
  if (!subs?.length) return Response.json({ enviados: 0, motivo: 'sem assinaturas' })

  const usuarios = [...new Set(subs.map((s) => s.user_id))]

  const { data: perfis } = await db
    .from('profiles')
    .select('id, daily_kcal, goal, age, weight_kg, height_cm, sex, activity')
    .in('id', usuarios)

  const desde = new Date(Date.now() - 9 * 864e5).toISOString()
  const { data: comida } = await db
    .from('food_log')
    .select('user_id, kcal, logged_at')
    .in('user_id', usuarios)
    .gte('logged_at', desde)

  let enviados = 0
  const detalhe: Record<string, string> = {}

  for (const uid of usuarios) {
    const meus = subs.filter((s) => s.user_id === uid) as Sub[]
    const perfil = perfis?.find((p) => p.id === uid) as Perfil | undefined
    if (!perfil) continue

    const tz = meus[0].tz
    const hoje = diaLocal(new Date(), tz)
    const hora = horaLocal(tz)

    const porDia: Record<string, number> = {}
    for (const c of comida ?? []) {
      if (c.user_id !== uid) continue
      const d = diaLocal(c.logged_at, tz)
      porDia[d] = (porDia[d] ?? 0) + (c.kcal ?? 0)
    }
    const total = porDia[hoje] ?? 0

    // Ultimos 7 dias locais, hoje incluido.
    const dias7: string[] = []
    for (let i = 0; i < 7; i++) {
      dias7.push(diaLocal(new Date(Date.now() - i * 864e5), tz))
    }
    const registrados = dias7.filter((d) => (porDia[d] ?? 0) > 0)
    const semana = {
      dias: registrados.length,
      soma: registrados.reduce((s, d) => s + porDia[d], 0),
    }

    const tipos: string[] = []
    if (forcar === 'meta') {
      if (perfil.daily_kcal && total >= perfil.daily_kcal) tipos.push('meta')
    } else {
      if (hora === 12 && total === 0) tipos.push('registro')
      if (hora === 20) tipos.push('saldo')
      if (hora === 21 && ehDomingo(tz)) tipos.push('semana')
    }

    for (const tipo of tipos) {
      const aviso = mensagem(tipo, perfil, total, semana)
      if (!aviso) continue

      // push_log e a trava: um aviso por tipo por dia, o cron repetindo ou nao.
      const { data: marcado } = await db
        .from('push_log')
        .upsert(
          { user_id: uid, dia: hoje, tipo },
          { onConflict: 'user_id,dia,tipo', ignoreDuplicates: true },
        )
        .select()
      if (!marcado?.length) continue

      for (const sub of meus) {
        try {
          const status = await entregar(sub, aviso, cfg as Cfg)
          detalhe[sub.endpoint.slice(-12)] = tipo + ':' + status
          if (status === 404 || status === 410) {
            await db.from('push_subs').delete().eq('endpoint', sub.endpoint)
          } else if (status < 300) {
            enviados++
          }
        } catch (e) {
          detalhe[sub.endpoint.slice(-12)] = tipo + ':erro ' + String(e)
        }
      }
    }
  }

  return Response.json({ enviados, detalhe })
})
