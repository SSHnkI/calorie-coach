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
      .select('subscription_status, analyses_today, analyses_date, daily_kcal, goal')
      .eq('id', user.id)
      .single()

    const today = new Date().toISOString().split('T')[0]
    let analysesToday = profile.analyses_today
    if (profile.analyses_date !== today) {
      analysesToday = 0
      await supabase.from('profiles')
        .update({ analyses_today: 0, analyses_date: today })
        .eq('id', user.id)
    }

    const isPaid = profile.subscription_status === 'active'
    if (!isPaid && analysesToday >= 5) {
      return new Response(
        JSON.stringify({ error: 'limit_reached', analyses_used: analysesToday, limit: 5 }),
        { status: 402, headers: corsHeaders }
      )
    }

    const { food_input } = await req.json()
    if (!food_input?.trim()) {
      return new Response(JSON.stringify({ error: 'food_input required' }), { status: 400, headers: corsHeaders })
    }

    // Chama o Gemini
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${Deno.env.get('GEMINI_API_KEY')}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: `Você é um banco de dados nutricional. Receba um alimento em linguagem natural e retorne APENAS JSON válido, sem texto fora do JSON:
{"name":"string","quantity":number,"unit":"string","kcal":number,"protein_g":number,"carbs_g":number,"fat_g":number,"confidence":"high|medium|low"}
Se a quantidade não for mencionada, assuma porção padrão. Nunca recuse, sempre estime.` }]
          },
          contents: [{ parts: [{ text: food_input }] }]
        })
      }
    )

    const geminiData = await geminiRes.json()
    const rawText = geminiData.candidates[0].content.parts[0].text.trim()
    const nutrition = JSON.parse(rawText)

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

    await supabase.from('profiles')
      .update({ analyses_today: analysesToday + 1 })
      .eq('id', user.id)

    return new Response(
      JSON.stringify({ ...nutrition, analyses_remaining: isPaid ? null : 4 - analysesToday }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders })
  }
})