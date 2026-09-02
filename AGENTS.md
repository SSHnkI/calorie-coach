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
│   │   │   ├── nutrition/          # Composer, Refeicoes, Habito, NutritionHistory, NutritionStats
│   │   │   └── admin/              # ApagarHistorico
│   │   ├── lib/
│   │   │   ├── supabase.ts         # client
│   │   │   ├── analyzeFood.ts      # chama a edge function analyze-food
│   │   │   ├── foodLog.ts          # CRUD do log de refeições
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

Cinco tabelas, todas com RLS ligado.

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

## Verificação Rápida

```bash
cd frontend
npx tsc --noEmit   # sem output = ok
npm run build      # deve completar sem erros
```
