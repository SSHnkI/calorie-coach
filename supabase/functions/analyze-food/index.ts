import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token!)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status, analyses_today, analyses_date, ai_calls_today, ai_calls_date, daily_kcal, goal')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return new Response(JSON.stringify({ error: 'profile_not_found' }), { status: 404, headers: corsHeaders })
    }

    const { food_input, log = true } = await req.json()
    if (!food_input?.trim()) {
      return new Response(JSON.stringify({ error: 'food_input required' }), { status: 400, headers: corsHeaders })
    }

    const today = new Date().toISOString().split('T')[0]
    let analysesToday = profile.analyses_today
    if (profile.analyses_date !== today) {
      analysesToday = 0
      await supabase.from('profiles')
        .update({ analyses_today: 0, analyses_date: today })
        .eq('id', user.id)
    }

    // Teto diário de chamadas à IA (todas, log ou não) — anti-sobrecarga/custo
    const AI_CAP = 100
    let aiToday = profile.ai_calls_date === today ? (profile.ai_calls_today ?? 0) : 0
    if (aiToday >= AI_CAP) {
      return new Response(JSON.stringify({ error: 'ai_daily_cap' }), { status: 429, headers: corsHeaders })
    }

    const isPaid = profile.subscription_status === 'active'
    // Cálculo sem registrar (edição de dieta) é exclusivo Pro — evita abuso da IA por contas free
    if (!log && !isPaid) {
      return new Response(JSON.stringify({ error: 'pro_required' }), { status: 402, headers: corsHeaders })
    }
    if (log && !isPaid && analysesToday >= 5) {
      return new Response(
        JSON.stringify({ error: 'limit_reached', analyses_used: analysesToday, limit: 5 }),
        { status: 402, headers: corsHeaders }
      )
    }

    // Chama o Gemini — responseSchema força JSON puro (sem cercas ```json)
    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY não configurada' }), { status: 500, headers: corsHeaders })
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: `Você é um banco de dados nutricional. Receba um alimento em linguagem natural e estime os valores nutricionais. Se a quantidade não for mencionada, assuma uma porção padrão. Nunca recuse, sempre estime.` }]
          },
          contents: [{ parts: [{ text: food_input }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                name: { type: 'STRING' },
                quantity: { type: 'NUMBER' },
                unit: { type: 'STRING' },
                kcal: { type: 'NUMBER' },
                protein_g: { type: 'NUMBER' },
                carbs_g: { type: 'NUMBER' },
                fat_g: { type: 'NUMBER' },
                confidence: { type: 'STRING', enum: ['high', 'medium', 'low'] },
              },
              required: ['name', 'quantity', 'unit', 'kcal', 'protein_g', 'carbs_g', 'fat_g', 'confidence'],
            },
          },
        })
      }
    )

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text()
      console.error('Erro Gemini:', geminiRes.status, errBody)
      return new Response(JSON.stringify({ error: 'gemini_error' }), { status: 502, headers: corsHeaders })
    }

    const geminiData = await geminiRes.json()
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!rawText) {
      console.error('Resposta Gemini sem texto:', JSON.stringify(geminiData))
      return new Response(JSON.stringify({ error: 'gemini_empty' }), { status: 502, headers: corsHeaders })
    }
    const nutrition = JSON.parse(rawText.trim())

    if (log) {
      await supabase.from('food_log').insert({
        user_id: user.id,
        name: nutrition.name,
        quantity: nutrition.quantity,
        unit: nutrition.unit,
        kcal: nutrition.kcal,
        protein_g: nutrition.protein_g,
        carbs_g: nutrition.carbs_g,
        fat_g: nutrition.fat_g,
        confidence: nutrition.confidence
      })
    }

    // contabiliza a chamada de IA (sempre) + análise registrada (quando log)
    const upd: Record<string, unknown> = { ai_calls_today: aiToday + 1, ai_calls_date: today }
    if (log) upd.analyses_today = analysesToday + 1
    await supabase.from('profiles').update(upd).eq('id', user.id)

    return new Response(
      JSON.stringify({ ...nutrition, analyses_remaining: isPaid ? null : 4 - analysesToday }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders })
  }
})