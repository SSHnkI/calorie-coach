# Obliq — Calorie Coach · AGENTS.md

Documento de contexto para Codex. Contém tudo que o modelo precisa saber para
trabalhar neste projeto sem perder estado entre sessões.

---

## Visão Geral

Calculadora de calorias e macros. O usuário escreve, fotografa ou fala o que comeu e o
app estima as calorias e os macros do dia contra a meta calculada no onboarding.

**Stack:** React 19 + Vite 8 + TypeScript 6 + Tailwind CSS 4 + Supabase (Auth + PostgreSQL + Edge Functions)
**Deploy:** Vercel (frontend) + Supabase Cloud
**Repo:** github.com/SSHnkI/calorie-coach
**URL prod:** https://obliq-psi.vercel.app

O app já teve treino, dieta, personal e nutricionista. Tudo isso saiu do escopo em
setembro de 2026: código, tabelas e edge functions foram removidos. O dump dos dados de
teste ficou em `dump-app-antigo.json`, e o código segue no histórico do git.

---

## Estrutura do Projeto

```
calorie-coach/
├── frontend/
│   ├── src/
│   │   ├── App.tsx                 # rotas; UsersPage entra por lazy import
│   │   ├── context/AppContext.tsx  # sessão, perfil, log do dia, totais
│   │   ├── routes/
│   │   │   ├── LandingPage.tsx
│   │   │   ├── AuthPage.tsx
│   │   │   ├── OnboardingPage.tsx
│   │   │   ├── DashboardPage.tsx   # a tela do app
│   │   │   ├── ResetPasswordPage.tsx
│   │   │   └── UsersPage.tsx       # /usuarios, só admin
│   │   ├── components/
│   │   │   ├── layout/             # AppShell, Logo, ProtectedRoute, Avisos, TemaSwitcher, LanguageBar
│   │   │   ├── ui/                 # Button, Card, Input, Tabs, Icon
│   │   │   ├── nutrition/          # Composer, Refeicoes, Habito, Gasto, NutritionHistory, NutritionStats
│   │   │   └── admin/              # ApagarHistorico, HistoricoSemanal
│   │   ├── lib/
│   │   │   ├── supabase.ts         # client
│   │   │   ├── analyzeFood.ts      # chama a edge function analyze-food
│   │   │   ├── foodLog.ts          # CRUD do log de refeições
│   │   │   ├── gasto.ts            # gasto extra do dia, digitado à mão
│   │   │   ├── recompensa.ts       # marcos de sequência e desfecho do dia
│   │   │   ├── users.ts            # funções do painel admin
│   │   │   ├── tdee.ts             # meta de kcal do dia
│   │   │   ├── push.ts             # inscrição de web push
│   │   │   ├── audio.ts, imagem.ts # captura de voz e foto
│   │   │   └── format.ts, tema.ts, useCountUp.ts
│   │   ├── types/index.ts
│   │   └── i18n/                   # pt-BR e en-US
│   └── .env.local                  # não commitar
├── supabase/
│   ├── config.toml
│   └── functions/
│       ├── analyze-food/
│       ├── admin-set-password/
│       ├── admin-delete-user/
│       └── push-enviar/
├── dump-app-antigo.json            # dados das tabelas derrubadas em 2 set 2026
└── AGENTS.md
```

---

## Variáveis de Ambiente

```env
# frontend/.env.local
VITE_SUPABASE_URL=https://ucdagoaokdqgkqfprfuv.supabase.co
VITE_SUPABASE_ANON_KEY=<chave anon do projeto>
```

---

## Comandos

```bash
cd frontend
npm run dev       # dev server porta 5173
npm run build     # tsc -b && vite build
npm run lint      # oxlint
npx tsc --noEmit  # checar tipos sem buildar (sem output = zero erros)
```

---

## Banco de Dados (Supabase PostgreSQL)

Seis tabelas, todas com RLS ligado.

**`profiles`** — `id` = `auth.users.id`. NÃO existe coluna `user_id`.

```sql
id                  uuid PRIMARY KEY
email               text
age, weight_kg, height_cm, sex, activity, goal
daily_kcal          int
subscription_status text        -- 'free' | 'active'
subscription_id, subscription_end, stripe_customer_id   -- resíduo do Stripe, sem uso
analyses_today      int         -- teto de 100 análises por dia
analyses_date       date
onboarding_complete boolean
created_at          timestamptz
```

**`food_log`**

```sql
id, user_id, logged_at, name, quantity, unit,
kcal, protein_g, carbs_g, fat_g, confidence
```

**`gasto_diario`** — gasto extra digitado à mão, uma linha por usuário por dia.

```sql
user_id, dia date, kcal int, atualizado_em     -- PK (user_id, dia)
```

Zero apaga a linha em vez de gravar zero: dia sem gasto é dia sem linha.

**`push_subs`**, **`push_log`**, **`push_cfg`** — ver a seção de Web Push.

### RLS

Uma política por tabela, cobrindo dono e admin de uma vez. O admin master é reconhecido
pelo e-mail dentro do token, no banco, nunca pelo frontend:

```sql
-- profiles
using ((select auth.uid()) = id or (select auth.jwt()) ->> 'email' = 'victorguilhermevg3@gmail.com')

-- food_log: o admin lê e apaga tudo, mas só insere e edita comida da própria conta
using ((select auth.uid()) = user_id or (select auth.jwt()) ->> 'email' = 'victorguilhermevg3@gmail.com')
with check ((select auth.uid()) = user_id)
```

O `(select ...)` não é enfeite: sem ele o Postgres reavalia `auth.uid()` linha a linha.

### Funções

Só duas sobraram, ambas `SECURITY DEFINER` com `search_path` fixo e sem `execute` para
`anon` e `authenticated`:

- `handle_new_user()` — cria o profile no signup
- `push_meta_batida()` — trigger em `food_log`, dispara o push de meta batida

---

## Sistema de Roles

Só existem duas figuras: usuário e admin master (`victorguilhermevg3@gmail.com`).

- `/dashboard` — qualquer usuário autenticado
- `/usuarios` — o admin; a restrição mora na RLS e nas edge functions, não na rota

---

## AppContext — O que expõe

```typescript
user: UserProfile | null
foodLog: FoodEntry[]
isAuthenticated: boolean
isPro: boolean               // subscription_status === 'active'
loading: boolean
login(email, password) / signup(email, password)
loginWithGoogle() / loginWithApple() / logout()
completeOnboarding(data)
addFoodEntry(entry)
refreshUser()                // recarrega o profile sem reload de página
totals: { kcal, protein_g, carbs_g, fat_g }
```

---

## Web Push (notificações)

Tudo dentro do Supabase, sem Firebase e sem serviço externo.

| peça | onde |
|---|---|
| `push_subs` | assinatura por dispositivo: endpoint (PK), user_id, p256dh, auth, tz. RLS: só o dono |
| `push_log` | trava de repetição: PK (user_id, dia, tipo). Sem policy: só service role |
| `push_cfg` | chave VAPID privada, pública, subject e `cron_secret`. Sem policy: só service role |
| `push-enviar` | Edge Function: VAPID (RFC 8292) + aes128gcm (RFC 8291) em WebCrypto puro, sem npm |
| `push_meta_batida()` | trigger em `food_log` que chama a função via pg_net quando entra comida |
| `obliq-push-horario` | job pg_cron de hora em hora: `select net.http_post(...)` com o segredo |

Autenticação da função: header `x-obliq-cron` comparado com `push_cfg.cron_secret`
(`verify_jwt` está desligado porque quem chama é o Postgres, não um usuário).

Horários, decididos por usuário no fuso dele (`push_subs.tz`), não no do servidor:

- 12h: nada registrado, lembrete de registro
- 20h: saldo do dia (texto muda se o objetivo é `gain`)
- domingo 21h: resumo semanal com déficit ou superávit vs manutenção
- meta batida: na hora, pelo trigger

Chave pública VAPID vive em `src/lib/push.ts` (é pública por design). A privada só
existe em `push_cfg`, não há cópia em lugar nenhum.

Teste da criptografia sem celular:

```bash
npx deno run --allow-read supabase/functions/push-enviar/teste_cripto.ts
```

iOS só entrega push se o PWA estiver instalado na tela inicial (16.4+).

---

## Edge Functions (Supabase Deno)

- `analyze-food` — texto, foto ou áudio da refeição, devolve macros estimados
- `admin-set-password` — define a senha de um usuário; confere o e-mail contra o token
- `admin-delete-user` — apaga a conta; mesma verificação
- `push-enviar` — ver a seção de Web Push

A chave de serviço só existe dentro das edge functions. Nunca no bundle.

---

## Design System

Classes Tailwind customizadas usadas em todo o projeto:

- `bg-obliq-black` — fundo principal
- `bg-obliq-surface` — fundo de cards e inputs
- `border-obliq-border` — bordas
- `text-obliq-red` — cor de destaque
- `shadow-red-glow` — sombra vermelha

Componentes UI em `src/components/ui/`:
`<Button variant="secondary">`, `<Card glow>`, `<Input label="">`, `<Tabs>`, `<Icon>`

---

## Gotchas Conhecidos

### 1. Arquivos truncados

A escrita de arquivo trunca arquivos silenciosamente quando o conteúdo é longo. Para qualquer
arquivo com mais de 80 linhas, usar Python ou bash com delimitador sem backticks.

### 2. profiles.id vs user_id

A tabela `profiles` usa `id` como FK para `auth.users`. NÃO existe coluna `user_id`.
Qualquer `.eq('user_id', x)` em queries de profiles está errado.

### 3. Null bytes em arquivos

```bash
tr -d '\0' < arquivo.tsx > tmp.tsx && mv tmp.tsx arquivo.tsx
```

### 4. RLS e auth.uid()

Sempre `(select auth.uid())`, nunca `auth.uid()` solto: o segundo roda por linha.

### 5. TSC sem output = sucesso

`npx tsc --noEmit` sem nenhuma linha de saída significa zero erros de compilação.

### 6. SMTP

O SMTP embutido do Supabase é só para teste e entrega pouquíssimas mensagens por hora.
Enquanto não houver um provedor plugado, confirmação de cadastro e recuperação de senha
não chegam de forma confiável.

---

## Teclado e a Barra Fixa

**Não reposicionar a barra do composer quando o teclado abre.** O Safari já
desloca o layout para manter o campo focado visível, e o campo mora dentro da
barra, então ela sobe junto sozinha.

Duas tentativas de ajudar o navegador, ambas piores que não fazer nada:

1. somar a altura do teclado (`innerHeight - visualViewport.height`) e subir a
   barra: virou deslocamento em dobro e ela parou no meio da tela
2. medir `getBoundingClientRect().bottom` e corrigir contra
   `visualViewport.height + offsetTop`: no Safari real ficou oscilando entre
   alta demais e fora da tela, porque o iOS mistura espaço de coordenadas de
   layout e visual sem avisar

O que de fato estava errado era só a faixa morta embaixo da barra: o espaço
reservado para o indicador do iPhone, que com o teclado aberto está coberto.
Hoje isso é um booleano vindo do `onFocus`/`onBlur` do campo, sem nenhuma conta
de viewport, e um booleano não tem como deslocar nada.

---

## Fidelidade do Cálculo de Calorias

**Não voltar a plugar o Open Food Facts.** Ele era usado para "refinar" a estimativa do
modelo, e era a maior fonte de erro do app. É um banco de **produtos embalados**
pesquisado por texto livre:

| busca | o que o OFF devolvia | valor real |
|---|---|---|
| `white rice` | Tortitas de arroz con chocolate blanco, 467 kcal/100g | 130 (arroz cozido) |
| `rice` | 1900 kcal/100g, acima do limite físico | 130 |

O código aceitava qualquer número maior que zero e ainda marcava o item como confiança
**alta**, justamente quando era menos confiável. Um prato comum saía 1,5x inflado.

Hoje o modelo é a única fonte, com duas travas em `analyze-food/coerencia.ts`:

1. **os macros mandam.** Se `4P + 4C + 9G` discorda do kcal declarado em mais de 25%, o
   modelo se contradisse e vale a soma dos macros, que é o que sustenta as barras da tela
2. **densidade.** kcal por grama não passa de 9, que é gordura pura

Item ajustado por qualquer uma das travas cai para confiança `low`, e a tela mostra
"estimado" nele. É o sinal visível de que o número é fraco.

---

## Onde a Recompensa Aponta

`lib/recompensa.ts` decide o que o app comemora, e existe porque a versão antiga
comemorava a coisa errada: a festa disparava quando o consumo alcançava a meta,
ou seja, quando quem quer emagrecer deveria parar de comer.

- objetivo `gain`: a meta é alvo, e alcançar comemora
- objetivo `lose` e `maintain`: o momento bom é **fechar o dia dentro da meta**,
  contado como fechado em dia passado ou depois das 20h
- a sequência de dias registrados tem marcos em 3, 7, 14, 30, 60, 100, 200 e 365,
  cada um comemorado uma vez; o último comemorado fica no `localStorage`

---

## Verificação Rápida

```bash
cd frontend
npm run build      # tsc -b + vite build, deve completar sem erros
npm run lint       # 3 avisos de fast refresh em dev são esperados
node --test src/lib/*.test.ts src/components/layout/*.test.ts
```

`npx tsc --noEmit` sozinho não cobre tudo que `npm run build` cobre: use o build
como o teste de tipo de verdade.
