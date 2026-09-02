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

// Unico dono desta funcao. Confere contra o e-mail do token, nunca contra o corpo.
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

    // Chave de servico da acesso total: so o admin master passa daqui.
    if (user.email !== ADMIN_EMAIL) return json({ error: 'forbidden' }, 403)

    const { email, redirect_to } = await req.json()
    if (typeof email !== 'string' || !email.includes('@')) {
      return json({ error: 'email invalido' }, 400)
    }

    // generateLink cria o link de recuperacao sem disparar e-mail,
    // entao o limite de SMTP do projeto nao entra na conta.
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: redirect_to },
    })
    if (error) {
      console.error('generateLink:', error)
      return json({ error: 'nao_gerou' }, 502)
    }

    console.log('link de senha gerado para', email, 'por', user.email)
    return json({ link: data.properties?.action_link ?? null })
  } catch (err) {
    console.error('admin-reset-link:', err)
    return json({ error: 'falhou' }, 500)
  }
})
