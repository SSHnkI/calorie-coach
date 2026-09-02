import { supabase } from './supabase'

// Chave publica VAPID: e publica por definicao, pode viver no bundle.
// A privada mora na tabela push_cfg, que so a service role enxerga.
const VAPID = 'BBLwEkDPrBvwskHPr55OdZj8gfsZRxX0pJXDTsCkjJXxHzyxxEVuOetr4jC4kkz4AXaYMuP-HnRziI7NqpFSqpc'

export type EstadoPush = 'sem-suporte' | 'negado' | 'ligado' | 'desligado'

export function pushSuportado() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

function bytes(b64u: string) {
  const b = b64u.replace(/-/g, '+').replace(/_/g, '/')
  const cru = atob(b + '='.repeat((4 - (b.length % 4)) % 4))
  return Uint8Array.from(cru, (c) => c.charCodeAt(0))
}

async function assinatura() {
  const reg = await navigator.serviceWorker.ready
  return { reg, sub: await reg.pushManager.getSubscription() }
}

export async function estadoPush(): Promise<EstadoPush> {
  if (!pushSuportado()) return 'sem-suporte'
  if (Notification.permission === 'denied') return 'negado'
  const { sub } = await assinatura()
  return sub ? 'ligado' : 'desligado'
}

export async function ativarPush(): Promise<EstadoPush | 'erro'> {
  if (!pushSuportado()) return 'sem-suporte'

  // A permissao so e concedida em resposta a um toque, por isso isto mora
  // dentro do onClick e nao num efeito de carregamento.
  if ((await Notification.requestPermission()) !== 'granted') return 'negado'

  const { reg, sub: existente } = await assinatura()
  const sub =
    existente ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: bytes(VAPID),
    }))

  const chaves = sub.toJSON().keys
  const { data } = await supabase.auth.getUser()
  if (!data.user || !chaves?.p256dh || !chaves?.auth) return 'erro'

  const { error } = await supabase.from('push_subs').upsert({
    endpoint: sub.endpoint,
    user_id: data.user.id,
    p256dh: chaves.p256dh,
    auth: chaves.auth,
    // O fuso do aparelho e o que faz o lembrete das 20h cair as 20h daqui.
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo',
  })
  if (error) return 'erro'

  // Prova imediata de que o caminho todo funciona, sem depender do servidor.
  await reg.showNotification('Avisos ligados', {
    body: 'É assim que os lembretes vão chegar.',
    tag: 'obliq-teste',
    icon: '/web-app-manifest-192x192.png',
    badge: '/web-app-manifest-192x192.png',
  })

  return 'ligado'
}

export async function desligarPush() {
  if (!pushSuportado()) return
  const { sub } = await assinatura()
  if (!sub) return
  await supabase.from('push_subs').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}
