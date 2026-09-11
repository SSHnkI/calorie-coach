import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { montarRegistro, type ItemDoModelo, type Registro } from './coerencia.ts'

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

const SYSTEM = `Voce e um interpretador de refeicoes. Recebe o que uma pessoa comeu, em portugues do Brasil, e devolve JSON.

REGRA NUMERO UM: UM ITEM POR REFEICAO, NAO POR INGREDIENTE.
"macarrao com creme de leite e queijo" e UMA coisa que a pessoa comeu, e sai como um
item so, com esse nome. Quebrar em macarrao, creme de leite e queijo transforma o
diario dela numa lista de compras, e e o que mais incomoda quem usa o app.

Separe em itens diferentes so quando sao comidas que chegaram separadas no prato e se
comem sozinhas:
  "macarrao com creme de leite e queijo" -> 1 item, o macarrao inteiro
  "strogonoff com arroz e batata palha"  -> 1 item, e um prato montado
  "vitamina de banana com aveia"         -> 1 item
  "arroz, feijao e bife"                 -> 3 itens, prato feito, tres coisas soltas
  "pao com manteiga e um cafe"           -> 2 itens, o pao com manteiga, e o cafe
  "x-burger, fritas e coca"              -> 3 itens, sanduiche, acompanhamento, bebida

Unem num item so: "com", "ao", "de", "recheado", "molho", "gratinado", e qualquer
coisa preparada junto e servida junto.
Sempre item proprio: bebida, sobremesa, e acompanhamento que chegou a parte.
NA DUVIDA, UM ITEM. Poucas linhas com o total certo valem mais que muitas linhas.

Fala longa pode citar mais de uma refeicao ("de manha comi X, no almoco Y"): ai sim
separe, uma por refeicao, e dentro de cada uma vale a mesma regra de cima.

NUMEROS. Nao calcule o total: devolva o peso e a densidade, que a conta e nossa.
- grams_total: peso da porcao INTEIRA em gramas, ou ml se for liquido.
- por_100g: kcal, protein_g, carbs_g, fat_g e alcohol_g de CEM gramas dessa comida.
  Isso e numero de tabela, e voce sabe de cor: arroz cozido 130, feijao cozido 76,
  macarrao cozido 158, peito de frango grelhado 165, contra file 220, pao frances 300,
  mussarela 330, creme de leite 210, coca-cola 42, cerveja 43, whisky 250.
- Prato montado usa a densidade do PRATO PRONTO, nao a media dos ingredientes:
  macarrao ao creme com queijo fica perto de 200 por 100 g, strogonoff com arroz perto
  de 170, feijoada perto de 200, x-burger perto de 260.
- Densidade de coisa simples, pra nao errar o facil: cafe puro 2, cha sem acucar 1,
  agua 0, leite integral 62, suco de laranja 45, banana 90, ovo cozido 155, ovo frito
  195, azeite 880, acucar 400.
- alcohol_g e o etanol puro em 100 ml: cerveja 3,9, vinho 10, destilado 32. Zero em
  tudo que nao e bebida alcoolica. Etanol tem 7 kcal por grama e nao aparece em
  proteina, carboidrato nem gordura, entao destilado puro tem os tres zerados e mesmo
  assim tem caloria.

PESO DA PORCAO. E aqui que erra quem erra:
- quantity e a contagem que a pessoa disse: "bife" e 1, "2 bifes" e 2, "meio pao" 0.5.
- unit e a unidade natural daquela comida, no singular e em portugues: "prato",
  "concha", "colher", "fatia", "bife", "copo", "lata", "dose", "pao de queijo". Nunca
  "porcao" quando existe unidade contavel, e nunca "piece", "cup", "serving", "unit".
- grams_total e o peso de TUDO que ela comeu, nao de uma unidade: 2 bifes de 120 g
  sao 240.
- Referencia caseira brasileira: colher de servir de arroz 60 g, concha de feijao 80 g,
  bife de contra file 120 g, file de frango 130 g, pao frances 50 g, pao de queijo
  30 g, fatia de queijo 20 g, colher de sopa de creme de leite 15 g, prato de macarrao
  300 g, esfiha de padaria 80 g, copo 200 ml, lata 350 ml, dose 50 ml.
- Comida COMO SE COME, pronta no prato, nunca crua: arroz e arroz cozido, macarrao e
  macarrao cozido. 100 g de arroz cru tem quase o triplo do cozido.
- Entre uma porcao modesta e uma generosa, fique com a modesta. Superestimar todo dia
  estraga o saldo mais do que subestimar uma vez.

LITERAL. Nao acrescente nada que a pessoa nao disse, e nao tire nada que ela disse.
"cafe" e cafe puro, coado, sem acucar e sem leite: 2 kcal por 100 ml, e o total de uma
xicara e um numero de um digito. Se ela toma com acucar ou com leite, ela escreve.
"pao" e pao frances: 300 kcal por 100 g. Nao e pao doce, nem pao de leite, nem pao com
manteiga. Se fosse, ela escreveria.
"leite" e leite integral, "iogurte" e o natural, "suco" e o da fruta, "salada" e a
folha sem molho. A pessoa conhece a comida dela e escreve o que comeu.

MESMA ENTRADA, MESMO NUMERO. "cafe" tem que dar hoje o mesmo que deu ontem. Nao varie
a estimativa entre chamadas, nao alterne entre uma leitura generosa e uma modesta: use
sempre o valor de tabela do alimento exatamente como ele foi escrito.

name: o nome da refeicao como a propria pessoa se referiria a ela, em minusculas.

NUNCA devolva lista vazia e NUNCA recuse. Marca, prato regional, doce, suplemento,
bebida alcoolica, remedio com acucar: tudo estima. Nao reconheceu o nome exato? Use o
mais parecido que voce conhece e marque confidence "low".

Responda SOMENTE com JSON neste formato:
{"items":[{"name":string,"quantity":number,"unit":string,"grams_total":number,"por_100g":{"kcal":number,"protein_g":number,"carbs_g":number,"fat_g":number,"alcohol_g":number},"confidence":"high"|"medium"|"low"}]}`

const EXTRA_FOTO = `
A entrada inclui uma foto. Identifique cada alimento visivel e estime a porcao pelo
tamanho aparente, usando talheres, prato ou embalagem como referencia de escala.
Porcao vinda de foto e estimativa: use confidence "low", ou "medium" quando houver
embalagem legivel.`

// Os modelos que a conta TEM, conferidos em GET /v1/models em 10 de setembro de
// 2026. A lista anterior (llama-3.3-70b-versatile, llama-4-scout, gpt-oss-20b e
// llama-3.1-8b-instant) foi descontinuada pela Groq e passou a devolver 404 em
// todas as chamadas: o app parou de reconhecer qualquer alimento, e o erro
// chegava na tela como "nao entendi". **Antes de mexer num nome aqui, liste os
// modelos da conta.** Nome de modelo nao se adivinha.
//
// Ficaram de fora, testados e reprovados: gpt-oss-20b e qwen3.6-27b devolvem
// `json_validate_failed` com geracao vazia no modo JSON.
//
// `teto` e o max_completion_tokens, e ele nao e economia: a Groq reserva o teto
// PEDIDO contra o limite de saida por minuto da conta, que e 1000 no plano
// gratuito. Pedir 900, como estava, consumia quase a cota inteira numa chamada
// so, e a seguinte tomava 429. 500 cobre tres itens com folga. O gpt-oss-120b
// fica sem teto de proposito: ele gasta ~1000 tokens pensando antes de
// responder, e cortado no meio devolve JSON vazio.
type Modelo = { id: string; teto?: number }

const MODELS: Modelo[] = [
  { id: 'qwen/qwen3.8-27b', teto: 500 },
  { id: 'openai/gpt-oss-120b' },
]

// So o qwen aceita imagem hoje, e mesmo ele anda devolvendo 503 "over capacity"
// nessa rota. Por isso o teto de tempo abaixo: sem ele a foto pendurava 30s
// antes de falhar, e a pessoa ficava olhando pro "calculando".
const MODELS_VISAO: Modelo[] = [{ id: 'qwen/qwen3.8-27b', teto: 500 }]

// Modelo que nao responde nisso e modelo que nao vai responder: cai pro proximo.
const TEMPO_LIMITE = 10_000

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

async function askGroq(
  foodInput: string,
  key: string,
  image?: string,
): Promise<ItemDoModelo[]> {
  let ultimoErro = 'sem modelo disponivel'
  const modelos = image ? MODELS_VISAO : MODELS

  const conteudoUsuario = image
    ? [
        { type: 'text', text: foodInput?.trim() || 'O que tem neste prato?' },
        { type: 'image_url', image_url: { url: image } },
      ]
    : foodInput

  for (const modelo of modelos) {
    let res: Response
    try {
      res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(TEMPO_LIMITE),
        body: JSON.stringify({
          model: modelo.id,
          // Zero, nao 0.2: "cafe" dava 2 kcal numa chamada e 50 na seguinte, e
          // numero de diario que muda sozinho destroi a confianca na conta toda.
          temperature: 0,
          ...(modelo.teto ? { max_completion_tokens: modelo.teto } : {}),
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: image ? SYSTEM + EXTRA_FOTO : SYSTEM },
            { role: 'user', content: conteudoUsuario },
          ],
        }),
      })
    } catch (e) {
      ultimoErro = `${modelo.id} nao respondeu em ${TEMPO_LIMITE}ms: ${e}`
      console.warn('groq:', ultimoErro)
      continue
    }

    if (res.ok) {
      // Resposta vazia, JSON quebrado ou recusa do modelo NAO encerram a
      // chamada: cai pro proximo modelo da lista. Era isto que fazia "whisky"
      // nao ser reconhecido, e e o que segura o 503 "over capacity" e o 429 de
      // limite por minuto, que sao por modelo e nao pela conta inteira.
      let itens: ItemDoModelo[] = []
      try {
        const data = await res.json()
        const raw = data?.choices?.[0]?.message?.content
        const parsed = raw ? JSON.parse(raw) : null
        // Modelo as vezes devolve um objeto solto em vez da lista.
        itens = Array.isArray(parsed?.items) ? parsed.items : parsed?.name ? [parsed] : []
      } catch (e) {
        ultimoErro = `${modelo.id} devolveu resposta ilegivel: ${e}`
        console.warn('groq:', ultimoErro)
        continue
      }

      if (!itens.length) {
        ultimoErro = `${modelo.id} devolveu lista vazia`
        console.warn('groq:', ultimoErro)
        continue
      }

      console.log('modelo usado:', modelo.id, 'itens:', itens.length)
      return itens.slice(0, MAX_ITENS)
    }

    ultimoErro = `${modelo.id} -> ${res.status}: ${await res.text()}`
    console.warn('groq falhou:', ultimoErro)
  }

  throw new Error(`groq_indisponivel: ${ultimoErro}`)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  let comFoto = false

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
    comFoto = !!image
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
    const itens: Registro[] = brutos.map(montarRegistro)
    const ajustados = itens.filter((i) => i.ajuste !== 'nenhum')
    if (ajustados.length) {
      console.log('coerencia ajustou:', ajustados.map((i) => `${i.name}:${i.ajuste}`).join(', '))
    }

    // Devolve as linhas gravadas, com id e hora, pra tela poder mostrar o item
    // na hora em vez de recarregar o dia inteiro numa segunda ida de rede.
    //
    // E confere o erro do insert: antes ele era ignorado, entao falha de gravacao
    // respondia sucesso e a comida simplesmente nao aparecia. Quem usa o app
    // chamava isso de "deu erro, tive que inserir de novo".
    const COLS = 'id, name, quantity, unit, kcal, protein_g, carbs_g, fat_g, confidence, logged_at'
    let gravados: Record<string, unknown>[] = []

    if (log) {
      const { data: linhas, error: erroInsert } = await supabase
        .from('food_log')
        .insert(
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
        .select(COLS)

      if (erroInsert || !linhas?.length) {
        console.error('food_log insert:', erroInsert)
        return json({ error: 'nao_gravou' }, 502)
      }
      gravados = linhas as Record<string, unknown>[]
    }

    await supabase
      .from('profiles')
      .update({ analyses_today: aiToday + 1, analyses_date: today })
      .eq('id', user.id)

    // `ajuste` e diagnostico de servidor, nao sai na resposta.
    const semAjuste = itens.map(({ ajuste: _ajuste, ...resto }) => resto)
    const resposta = gravados.length ? gravados : semAjuste

    // Compatibilidade: quem le um item so continua funcionando.
    return json({ ...resposta[0], items: resposta, transcricao })
  } catch (err) {
    console.error('analyze-food:', err)
    // Foto que nao volta de nenhum modelo tem nome proprio: hoje nao ha modelo
    // de visao respondendo nesta conta, e mandar "nao entendi" faz a pessoa
    // tentar de novo pra sempre por uma coisa que nao vai funcionar.
    const semVisao = comFoto && String(err).includes('groq_indisponivel')
    return json({ error: semVisao ? 'sem_visao' : 'analyze_failed' }, 502)
  }
})
