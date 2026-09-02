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

// Dono unico desta funcao. Conferido contra o e-mail do token, nunca contra o corpo.
const ADMIN_EMAIL = 'victorguilhermevg3@gmail.com'
const MIN_SENHA = 8

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

    // A chave de servico ignora RLS: so o admin master passa daqui.
    if (user.email !== ADMIN_EMAIL) return json({ error: 'forbidden' }, 403)

    const { user_id, password } = await req.json()

    if (typeof user_id !== 'string' || user_id.length < 10) {
      return json({ error: 'user_id invalido' }, 400)
    }
    if (typeof password !== 'string' || password.length < MIN_SENHA) {
      return json({ error: 'senha_curta', min: MIN_SENHA }, 400)
    }

    const { data, error } = await admin.auth.admin.updateUserById(user_id, { password })
    if (error) {
      // Loga o motivo, nunca a senha.
      console.error('updateUserById:', error.message)
      return json({ error: 'nao_alterou' }, 502)
    }

    // Trilha de auditoria: quem mudou a senha de quem e quando. Sem o valor.
    console.log(`senha alterada: alvo=${data.user?.email} por=${user.email}`)
    return json({ ok: true, email: data.user?.email ?? null })
  } catch (err) {
    console.error('admin-set-password:', err)
    return json({ error: 'falhou' }, 500)
  }
})
