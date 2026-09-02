import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const ADMIN_EMAIL = 'victorguilhermevg3@gmail.com'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return json({ error: 'unauthorized' }, 401)

    const {
      data: { user },
      error: authError,
    } = await admin.auth.getUser(token)
    if (authError || !user) return json({ error: 'unauthorized' }, 401)
    if (user.email !== ADMIN_EMAIL) return json({ error: 'forbidden' }, 403)

    const { user_id } = await req.json()
    if (typeof user_id !== 'string' || user_id.length < 10) {
      return json({ error: 'user_id invalido' }, 400)
    }
    // Trava contra tiro no pe: o admin nao apaga a propria conta por aqui.
    if (user_id === user.id) return json({ error: 'nao_apaga_a_si' }, 400)

    const { data: alvo } = await admin
      .from('profiles')
      .select('email')
      .eq('id', user_id)
      .single()

    // Ordem importa: filhos antes do dono, senao a FK reclama.
    await admin.from('food_log').delete().eq('user_id', user_id)
    await admin.from('profiles').delete().eq('id', user_id)

    const { error } = await admin.auth.admin.deleteUser(user_id)
    if (error) {
      console.error('deleteUser:', error.message)
      return json({ error: 'nao_apagou' }, 502)
    }

    console.log(`conta apagada: alvo=${alvo?.email ?? user_id} por=${user.email}`)
    return json({ ok: true, email: alvo?.email ?? null })
  } catch (err) {
    console.error('admin-delete-user:', err)
    return json({ error: 'falhou' }, 500)
  }
})
