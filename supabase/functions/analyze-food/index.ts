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

// Teto diario de chamadas a IA por conta. Nao e paywall, e anti abuso/custo.
const AI_CAP = 100

type Nutrition = {
  name: string
  quantity: number
  unit: string
  grams_total: number
  search_term: string
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  confidence: 'high' | 'medium' | 'low'
}

const SYSTEM = `Voce e um interpretador de alimentos. Recebe um alimento em linguagem natural (portugues do Brasil) e devolve JSON.

Regras:
- Se a quantidade nao for dita, assuma uma porcao caseira tipica.
- grams_total: peso total em gramas (ou ml para liquidos) da porcao inteira.
- search_term: nome curto e generico do alimento em ingles, para buscar em base de dados nutricional. Sem marca, sem quantidade. Ex: "white rice", "chicken breast", "coca cola".
- name: nome do alimento em portugues, como o usuario reconheceria.
- Estime kcal e macros da porcao inteira. Nunca recuse, sempre estime.

Responda SOMENTE com JSON neste formato:
{"name":string,"quantity":number,"unit":string,"grams_total":number,"search_term":string,"kcal":number,"protein_g":number,"carbs_g":number,"fat_g":number,"confidence":"high"|"medium"|"low"}`

async function askGroq(foodInput: string, key: string): Promise<Nutrition> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: foodInput },
      ],
    }),
  })
  if (!res.ok) throw new Error(`groq_${res.status}: ${await res.text()}`)
  const data = await res.json()
  const raw = data?.choices?.[0]?.message?.content
  if (!raw) throw new Error('groq_empty')
  return JSON.parse(raw)
}

// Busca valores reais no Open Food Facts. Gratuito, sem chave.
// Retorna nutrientes por 100g do primeiro produto que tenha dados completos.
async function lookupOFF(term: string): Promise<null | {
  kcal100: number
  protein100: number
  carbs100: number
  fat100: number
}> {
  const url =
    'https://world.openfoodfacts.org/cgi/search.pl?search_simple=1&action=process&json=1&page_size=10' +
    `&fields=product_name,nutriments&search_terms=${encodeURIComponent(term)}`

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Obliq/1.0 (calorie tracker)' },
    signal: AbortSignal.timeout(4000),
  })
  if (!res.ok) return null

  const data = await res.json()
  for (const p of data?.products ?? []) {
    const n = p?.nutriments ?? {}
    const kcal = Number(n['energy-kcal_100g'])
    if (!Number.isFinite(kcal) || kcal <= 0) continue
    return {
      kcal100: kcal,
      protein100: Number(n.proteins_100g) || 0,
      carbs100: Number(n.carbohydrates_100g) || 0,
      fat100: Number(n.fat_100g) || 0,
    }
  }
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token!)
    if (authError || !user) return json({ error: 'unauthorized' }, 401)

    const { data: profile } = await supabase
      .from('profiles')
      .select('ai_calls_today, ai_calls_date')
      .eq('id', user.id)
      .single()
    if (!profile) return json({ error: 'profile_not_found' }, 404)

    const { food_input, log = true } = await req.json()
    if (!food_input?.trim()) return json({ error: 'food_input required' }, 400)

    const today = new Date().toISOString().split('T')[0]
    const aiToday = profile.ai_calls_date === today ? (profile.ai_calls_today ?? 0) : 0
    if (aiToday >= AI_CAP) return json({ error: 'ai_daily_cap' }, 429)

    const groqKey = Deno.env.get('GROQ_API_KEY')
    if (!groqKey) return json({ error: 'GROQ_API_KEY nao configurada' }, 500)

    const n = await askGroq(food_input, groqKey)

    // Open Food Facts manda no numero quando encontra. A IA so serve de rede de seguranca.
    let source = 'ai'
    const grams = Number(n.grams_total)
    if (n.search_term && Number.isFinite(grams) && grams > 0) {
      try {
        const off = await lookupOFF(n.search_term)
        if (off) {
          const f = grams / 100
          n.kcal = Math.round(off.kcal100 * f)
          n.protein_g = Math.round(off.protein100 * f)
          n.carbs_g = Math.round(off.carbs100 * f)
          n.fat_g = Math.round(off.fat100 * f)
          n.confidence = 'high'
          source = 'openfoodfacts'
        }
      } catch {
        // OFF fora do ar ou lento: fica a estimativa da IA
      }
    }

    if (log) {
      await supabase.from('food_log').insert({
        user_id: user.id,
        name: n.name,
        quantity: n.quantity,
        unit: n.unit,
        kcal: n.kcal,
        protein_g: n.protein_g,
        carbs_g: n.carbs_g,
        fat_g: n.fat_g,
        confidence: n.confidence,
      })
    }

    await supabase
      .from('profiles')
      .update({ ai_calls_today: aiToday + 1, ai_calls_date: today })
      .eq('id', user.id)

    return json({ ...n, source })
  } catch (err) {
    console.error('analyze-food:', err)
    return json({ error: 'analyze_failed' }, 502)
  }
})
