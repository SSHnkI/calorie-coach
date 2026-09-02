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

// ponytail: a disponibilidade de modelo varia por conta/chave na Groq.
// Tenta em ordem e fica no primeiro que a chave puder usar.
const MODELS = [
  'llama-3.3-70b-versatile',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'openai/gpt-oss-20b',
  'llama-3.1-8b-instant',
]

// So os multimodais aceitam imagem.
const MODELS_VISAO = [
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'meta-llama/llama-4-maverick-17b-128e-instruct',
]

const EXTRA_FOTO = `
A entrada e uma foto de comida. Identifique o que esta no prato e estime a porcao
pelo tamanho aparente, usando talheres, prato ou embalagem como referencia de escala.
Se houver varios alimentos, some tudo em um unico registro e descreva no name.
Porcao vinda de foto e sempre estimativa: use confidence "low", ou "medium" so quando
houver embalagem legivel.`

async function askGroq(
  foodInput: string,
  key: string,
  image?: string,
): Promise<Nutrition> {
  let lastErr = 'sem modelo disponivel'
  const modelos = image ? MODELS_VISAO : MODELS

  const conteudoUsuario = image
    ? [
        { type: 'text', text: foodInput?.trim() || 'O que tem neste prato?' },
        { type: 'image_url', image_url: { url: image } },
      ]
    : foodInput

  for (const model of modelos) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: image ? SYSTEM + EXTRA_FOTO : SYSTEM },
          { role: 'user', content: conteudoUsuario },
        ],
      }),
    })

    if (res.ok) {
      const data = await res.json()
      const raw = data?.choices?.[0]?.message?.content
      if (!raw) throw new Error('groq_empty')
      console.log('modelo usado:', model)
      return JSON.parse(raw)
    }

    lastErr = `${model} -> ${res.status}: ${await res.text()}`
    // 404/400 costuma ser modelo indisponivel; qualquer outro erro tambem vale tentar o proximo
    console.warn('groq falhou:', lastErr)
  }

  throw new Error(`groq_indisponivel: ${lastErr}`)
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
      .select('analyses_today, analyses_date')
      .eq('id', user.id)
      .single()
    if (!profile) return json({ error: 'profile_not_found' }, 404)

    const { food_input, image, log = true } = await req.json()
    if (!food_input?.trim() && !image) {
      return json({ error: 'food_input required' }, 400)
    }
    // A foto e usada e descartada: nao gravamos imagem em lugar nenhum.
    if (image && (typeof image !== 'string' || !image.startsWith('data:image/'))) {
      return json({ error: 'imagem invalida' }, 400)
    }
    if (image && image.length > 6_000_000) {
      return json({ error: 'imagem grande demais' }, 413)
    }

    const today = new Date().toISOString().split('T')[0]
    const aiToday = profile.analyses_date === today ? (profile.analyses_today ?? 0) : 0
    if (aiToday >= AI_CAP) return json({ error: 'ai_daily_cap' }, 429)

    const groqKey = Deno.env.get('GROQ_API_KEY')
    if (!groqKey) return json({ error: 'GROQ_API_KEY nao configurada' }, 500)

    const n = await askGroq(food_input ?? '', groqKey, image)

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
      .update({ analyses_today: aiToday + 1, analyses_date: today })
      .eq('id', user.id)

    return json({ ...n, source })
  } catch (err) {
    console.error('analyze-food:', err)
    return json({ error: 'analyze_failed' }, 502)
  }
})
