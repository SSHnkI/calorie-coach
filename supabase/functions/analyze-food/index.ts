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
// Uma fala solta pode citar muita coisa. Corta pra nao virar insercao em massa.
const MAX_ITENS = 12

type Item = {
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

const SYSTEM = `Voce e um interpretador de alimentos. Recebe o que uma pessoa comeu, em portugues do Brasil, e devolve JSON.

Separe em um item por alimento. "arroz com feijao e bife" sao tres itens.
So junte no mesmo item o que e inseparavel, como "pao de queijo" ou "vitamina de banana".

Para cada item:
- Se a quantidade nao for dita, assuma uma porcao caseira tipica.
- grams_total: peso total em gramas (ou ml para liquidos) daquela porcao.
- search_term: nome curto e generico em ingles, para buscar em base nutricional. Sem marca, sem quantidade. Ex: "white rice", "chicken breast", "coca cola".
- name: nome em portugues, como o usuario reconheceria.
- Estime kcal e macros da porcao inteira. Nunca recuse, sempre estime.

Responda SOMENTE com JSON neste formato:
{"items":[{"name":string,"quantity":number,"unit":string,"grams_total":number,"search_term":string,"kcal":number,"protein_g":number,"carbs_g":number,"fat_g":number,"confidence":"high"|"medium"|"low"}]}`

const EXTRA_FOTO = `
A entrada inclui uma foto. Identifique cada alimento visivel e estime a porcao pelo
tamanho aparente, usando talheres, prato ou embalagem como referencia de escala.
Porcao vinda de foto e estimativa: use confidence "low", ou "medium" quando houver
embalagem legivel.`

// ponytail: a disponibilidade de modelo varia por conta/chave na Groq.
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

const MODELS_AUDIO = ['whisper-large-v3-turbo', 'whisper-large-v3']

function dataUrlParaBlob(dataUrl: string): { blob: Blob; ext: string } {
  const [cabecalho, base64] = dataUrl.split(',')
  const mime = cabecalho.match(/data:([^;]+)/)?.[1] ?? 'audio/webm'
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  const ext = mime.includes('mp4') ? 'mp4' : mime.includes('mpeg') ? 'mp3' : 'webm'
  return { blob: new Blob([bytes], { type: mime }), ext }
}

// Transcreve o audio com Whisper. O texto resultante segue o mesmo caminho da digitacao.
async function transcrever(audio: string, key: string): Promise<string> {
  const { blob, ext } = dataUrlParaBlob(audio)
  let ultimoErro = 'sem modelo de audio'

  for (const model of MODELS_AUDIO) {
    const form = new FormData()
    form.append('file', blob, `fala.${ext}`)
    form.append('model', model)
    form.append('language', 'pt')
    form.append('response_format', 'json')

    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    })

    if (res.ok) {
      const data = await res.json()
      const texto = (data?.text ?? '').trim()
      if (texto) {
        console.log('transcrito com', model)
        return texto
      }
      ultimoErro = `${model} devolveu vazio`
      continue
    }

    ultimoErro = `${model} -> ${res.status}: ${await res.text()}`
    console.warn('whisper falhou:', ultimoErro)
  }

  throw new Error(`transcricao_falhou: ${ultimoErro}`)
}

async function askGroq(foodInput: string, key: string, image?: string): Promise<Item[]> {
  let ultimoErro = 'sem modelo disponivel'
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
      const parsed = JSON.parse(raw)
      // Modelo as vezes devolve um objeto solto em vez da lista.
      const itens: Item[] = Array.isArray(parsed?.items)
        ? parsed.items
        : parsed?.name
          ? [parsed]
          : []
      if (!itens.length) throw new Error('sem_itens')
      console.log('modelo usado:', model, 'itens:', itens.length)
      return itens.slice(0, MAX_ITENS)
    }

    ultimoErro = `${model} -> ${res.status}: ${await res.text()}`
    console.warn('groq falhou:', ultimoErro)
  }

  throw new Error(`groq_indisponivel: ${ultimoErro}`)
}

// Busca valores reais no Open Food Facts. Gratuito, sem chave.
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
    signal: AbortSignal.timeout(3500),
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

// Troca a estimativa da IA pelo valor de base sempre que houver correspondencia.
async function refinar(item: Item, veioDeFoto: boolean): Promise<Item & { source: string }> {
  const gramas = Number(item.grams_total)
  if (!item.search_term || !Number.isFinite(gramas) || gramas <= 0) {
    return { ...item, source: 'ai' }
  }
  try {
    const off = await lookupOFF(item.search_term)
    if (!off) return { ...item, source: 'ai' }
    const f = gramas / 100
    return {
      ...item,
      kcal: Math.round(off.kcal100 * f),
      protein_g: Math.round(off.protein100 * f),
      carbs_g: Math.round(off.carbs100 * f),
      fat_g: Math.round(off.fat100 * f),
      confidence: veioDeFoto ? 'medium' : 'high',
      source: 'openfoodfacts',
    }
  } catch {
    return { ...item, source: 'ai' }
  }
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

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('analyses_today, analyses_date')
      .eq('id', user.id)
      .single()
    if (profileError || !profile) {
      console.error('perfil:', profileError)
      return json({ error: 'profile_not_found' }, 404)
    }

    const { food_input, image, audio, log = true, logged_at } = await req.json()
    if (!food_input?.trim() && !image && !audio) {
      return json({ error: 'food_input required' }, 400)
    }
    // Foto e audio sao usados e descartados: nada de midia e gravado.
    if (image && (typeof image !== 'string' || !image.startsWith('data:image/'))) {
      return json({ error: 'imagem invalida' }, 400)
    }
    if (image && image.length > 6_000_000) {
      return json({ error: 'imagem grande demais' }, 413)
    }
    if (audio && (typeof audio !== 'string' || !audio.startsWith('data:audio/'))) {
      return json({ error: 'audio invalido' }, 400)
    }
    if (audio && audio.length > 8_000_000) {
      return json({ error: 'audio grande demais' }, 413)
    }

    // Registro retroativo: quem esqueceu de anotar precisa poder anotar depois.
    // A data vem do cliente, entao e conferida aqui: nada no futuro e nada
    // alem da janela que o proprio historico mostra.
    const JANELA_DIAS = 30
    let quando: string | null = null
    if (logged_at !== undefined) {
      const d = new Date(logged_at)
      if (Number.isNaN(d.getTime())) return json({ error: 'logged_at invalido' }, 400)
      const agora = Date.now()
      if (d.getTime() > agora + 5 * 60_000) return json({ error: 'logged_at no futuro' }, 400)
      if (d.getTime() < agora - JANELA_DIAS * 86_400_000) {
        return json({ error: 'logged_at fora da janela' }, 400)
      }
      quando = d.toISOString()
    }

    const today = new Date().toISOString().split('T')[0]
    const aiToday = profile.analyses_date === today ? (profile.analyses_today ?? 0) : 0
    if (aiToday >= AI_CAP) return json({ error: 'ai_daily_cap' }, 429)

    const groqKey = Deno.env.get('GROQ_API_KEY')
    if (!groqKey) return json({ error: 'GROQ_API_KEY nao configurada' }, 500)

    let texto = (food_input ?? '').trim()
    let transcricao: string | null = null
    if (audio) {
      transcricao = await transcrever(audio, groqKey)
      texto = [texto, transcricao].filter(Boolean).join('. ')
    }

    const brutos = await askGroq(texto, groqKey, image)
    const itens = await Promise.all(brutos.map((i) => refinar(i, !!image)))

    if (log) {
      await supabase.from('food_log').insert(
        itens.map((n) => ({
          user_id: user.id,
          name: n.name,
          quantity: n.quantity,
          unit: n.unit,
          kcal: n.kcal,
          protein_g: n.protein_g,
          carbs_g: n.carbs_g,
          fat_g: n.fat_g,
          confidence: n.confidence,
          ...(quando ? { logged_at: quando } : {}),
        })),
      )
    }

    await supabase
      .from('profiles')
      .update({ analyses_today: aiToday + 1, analyses_date: today })
      .eq('id', user.id)

    // Compatibilidade: quem le um item so continua funcionando.
    return json({ ...itens[0], items: itens, transcricao })
  } catch (err) {
    console.error('analyze-food:', err)
    return json({ error: 'analyze_failed' }, 502)
  }
})
