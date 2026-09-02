# Obliq — Calorie Coach · AGENTS.md

Documento de contexto para Codex. Contém tudo que o modelo precisa saber para trabalhar neste projeto sem perder estado entre sessões.

---

## Visão Geral

App de treino e nutrição com sistema multi-tier de treinadores.

**Stack:** React 19 + Vite 8 + TypeScript 6 + Tailwind CSS 4 + Supabase (Auth + PostgreSQL + Storage + Edge Functions)
**Deploy:** Vercel (frontend) + Supabase Cloud
**Repo:** github.com/SSHnkI/calorie-coach
**URL prod:** https://obliq-psi.vercel.app

---

## Estrutura do Projeto

```
calorie-coach/
├── frontend/                   # App React/Vite
│   ├── src/
│   │   ├── App.tsx             # Roteamento principal
│   │   ├── context/
│   │   │   └── AppContext.tsx  # Auth + estado global + detecção de role
│   │   ├── routes/
│   │   │   ├── AdminPage.tsx   # /admin — painel admin master
│   │   │   ├── TrainerPage.tsx # /trainer — painel do treinador
│   │   │   ├── PricingPage.tsx # /pricing — planos + campo código treinador
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── WorkoutPage.tsx
│   │   │   ├── AuthPage.tsx
│   │   │   ├── OnboardingPage.tsx
│   │   │   └── LandingPage.tsx
│   │   ├── components/
│   │   │   ├── layout/         # AppShell, BottomNav, ProtectedRoute, etc.
│   │   │   ├── ui/             # Button, Card, Input, Badge, etc.
│   │   │   ├── workout/        # WorkoutBuilder, ExerciseCatalog, MyWorkouts, etc.
│   │   │   └── nutrition/      # NutritionHistory, NutritionStats
│   │   ├── lib/
│   │   │   ├── admin.ts        # Funções admin: users, trainers, plans
│   │   │   ├── workouts.ts     # CRUD de planos e sessões
│   │   │   ├── exercises.ts    # Fetch do catálogo de exercícios
│   │   │   ├── supabase.ts     # Client Supabase
│   │   │   ├── tdee.ts         # Cálculo de kcal diária
│   │   │   ├── foodLog.ts      # Log de refeições
│   │   │   └── analyzeFood.ts  # Edge Function analyze-food
│   │   ├── types/index.ts      # Todos os tipos TypeScript
│   │   └── i18n/               # pt-BR e en-US
│   ├── .env.local              # Variáveis de ambiente (não commitar)
│   └── package.json
├── supabase/
│   ├── config.toml
│   └── functions/
│       ├── analyze-food/       # Análise nutricional via IA
│       ├── create-checkout/    # Checkout Stripe
│       └── stripe-webhook/     # Webhook Stripe
├── import-exercisedb.mjs       # Script de importação em massa de exercícios
└── AGENTS.md                   # Este arquivo
```

---

## Variáveis de Ambiente

```env
# frontend/.env.local
VITE_SUPABASE_URL=https://ucdagoaokdqgkqfprfuv.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjZGFnb2Fva2RxZ2txZnByZnV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxODI4NDAsImV4cCI6MjA5Nzc1ODg0MH0.4vg_LtAL68Cv3RK_PcpZlMVgsCEMxoxZDiqG3UtRQvQ
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

### Tabelas principais

**`profiles`** — id = auth.users.id. NAO existe coluna user_id separada.
```sql
id                  uuid PRIMARY KEY  -- = auth.users.id
email               text
full_name           text
age, weight_kg, height_cm, sex, activity, goal
daily_kcal          int
subscription_status text  -- 'free' | 'active'
onboarding_complete boolean
trainer_id          uuid REFERENCES trainers(id)  -- nullable
created_at          timestamptz
```

**`trainers`**
```sql
id         uuid PRIMARY KEY
user_id    uuid REFERENCES auth.users(id)  -- preenchido pelo trigger ao criar conta
name       text
email      text UNIQUE                     -- salvo em lowercase
code       text UNIQUE                     -- código que o usuário digita em /pricing
created_at timestamptz
```

**`workout_plans`**
```sql
id, user_id (ref auth.users), name, goal, created_at
-- goal: 'hipertrofia' | 'emagrecimento' | 'condicionamento'
```

**`workout_exercises`**
```sql
id, plan_id, exercise_id, sets, reps, rest_seconds, target_weight_kg, notes, order_index
```

**`exercises`** — catálogo com ~1300 exercícios importados do ExerciseDB
```sql
id, name, muscle_group, difficulty, description, muscles_worked, image_url, video_url
-- muscle_group: 'peito' | 'costas' | 'ombro' | 'biceps' | 'triceps' | 'pernas' | 'abdomen'
-- difficulty: 'iniciante' | 'intermediario' | 'avancado'
```

**`workout_logs`** — sessões realizadas
```sql
id, user_id, plan_id, notes, completed_at
```

**`exercise_sets`** — séries de cada sessão
```sql
id, workout_log_id, user_id, exercise_id, set_number, weight_kg, reps, completed
```

**`food_entries`** — log de refeições
```sql
id, user_id, name, quantity, unit, kcal, protein_g, carbs_g, fat_g, confidence, logged_at
```

### RLS — padrões importantes

Admin master verifica por email:
```sql
auth.jwt() ->> 'email' = 'victorguilhermevg3@gmail.com'
```

Trainer acessa clientes via JOIN (profiles usa `p.id`, não `p.user_id`):
```sql
user_id IN (
  SELECT p.id FROM profiles p
  JOIN trainers t ON t.id = p.trainer_id
  WHERE t.user_id = auth.uid()
)
```

### Trigger: auto-vincula trainer no signup
```sql
CREATE OR REPLACE FUNCTION link_trainer_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE trainers SET user_id = NEW.id
  WHERE email = NEW.email AND user_id IS NULL;
  RETURN NEW;
END;
$$;
-- on_trainer_signup: AFTER INSERT ON auth.users FOR EACH ROW
```

---

## Sistema de Roles

```
Admin Master (victorguilhermevg3@gmail.com)
  └── Cria Treinadores no painel /admin (aba Treinadores)
        └── Treinador se cadastra com email pré-definido
              └── Trigger auto-preenche trainers.user_id
                    └── Usuário digita código do treinador em /pricing
                          └── profiles.trainer_id + subscription_status = 'active'
```

Rotas por role:
- `/admin` — admin master (verificação por email hardcoded: `victorguilhermevg3@gmail.com`)
- `/trainer` — trainers (verificação via `isTrainer` do AppContext)
- `/dashboard`, `/workout` — qualquer usuário autenticado (ProtectedRoute)

---

## AppContext — O que expõe

```typescript
user: UserProfile | null
isAuthenticated: boolean
isPro: boolean               // subscription_status === 'active'
isTrainer: boolean           // usuário existe na tabela trainers
trainerData: TrainerData | null   // { id, user_id, name, email, code }
loading: boolean
login(email, password)
signup(email, password)
loginWithGoogle()
loginWithApple()
logout()
completeOnboarding(data)
addFoodEntry(entry)
upgradeToPro()
refreshUser()                // recarrega profile do banco sem reload de página
totals: { kcal, protein_g, carbs_g, fat_g }
```

Na inicialização, `loadProfile` e `loadTrainer` rodam em paralelo via `Promise.all`.
Se o usuário logado existir na tabela `trainers`, `isTrainer = true` e `trainerData` é preenchido.

---

## lib/admin.ts

```typescript
// Tipos
type AdminUser = { id, email, full_name, subscription_status, onboarding_complete, created_at, plan_count, trainer_id }
type Trainer   = { id, user_id, name, email, code, created_at, client_count? }

// Funções
fetchAllUsers(): Promise<AdminUser[]>
setUserPro(userId: string, isPro: boolean): Promise<void>
fetchPlansForUser(userId: string): Promise<any[]>
copyPlanToUser(planId: string, targetUserId: string): Promise<void>
fetchAllTrainers(): Promise<Trainer[]>
createTrainer(name, email, code): Promise<void>
deleteTrainer(id): Promise<void>   // desvincula clientes antes de deletar
```

**CRITICO:** `AdminUser.id` = `profiles.id` = `auth.users.id`. Não existe `user_id` em profiles.
Sempre `.eq('id', userId)` — nunca `.eq('user_id', userId)` — ao filtrar a tabela profiles.

---

## WorkoutBuilder

Prop `targetUserId?: string` — quando presente, salva o plano para outro usuário.
Usado pelo AdminPage (aba Treinos) e TrainerPage.

```tsx
<WorkoutBuilder
  plan={planOuNull}
  onClose={...}
  onSaved={...}
  targetUserId={client.id}
/>
```

---

## AdminPage — 4 abas

1. **Exercícios** — CRUD completo do catálogo (nome, grupo, dificuldade, foto via Storage)
2. **Usuários** — listar todos, toggle Pro/Free sem Stripe
3. **Treinos** — selecionar cliente, criar/editar/excluir planos, copiar modelo do admin
4. **Treinadores** — criar (nome + email + código), listar com badge "Ativo", excluir

---

## TrainerPage — /trainer

Painel do treinador com:
- Lista de clientes vinculados (filtrados por `trainer_id`)
- Detalhe do cliente: meta kcal/dia, treinos (WorkoutBuilder), histórico de sessões
- Relatório geral: última sessão e total de sessões por cliente
- Header mostra nome e código do treinador

---

## PricingPage — Ativação via código

Campo "Tem um código de treinador?" aparece só para usuários não-Pro.
Ao submeter um código válido:
1. Busca `trainers` pelo `code`
2. Atualiza `profiles.trainer_id` e `subscription_status = 'active'`
3. Chama `refreshUser()` para refletir imediatamente no contexto

---

## Edge Functions (Supabase Deno)

- `analyze-food` — analisa texto/imagem de refeição, retorna macros estimados
- `create-checkout` — cria sessão Stripe Checkout
- `stripe-webhook` — processa eventos Stripe (pagamento confirmado ativa Pro)

Stripe Price ID: `price_1TlUaE7FbBrEWaC4hU5oppwd`

---

## Script de Importação de Exercícios

`import-exercisedb.mjs` na raiz do projeto.

```bash
node import-exercisedb.mjs
```

- Usa RapidAPI ExerciseDB (Key: `37ecd7608amsh5612c3d1aebc00ap195d77jsn85fec3ddb0a9`)
- Free plan retorna max 10/request — pagina com offset incremental
- Traduz nomes EN -> PT via mapa interno
- Mapeia bodyPart -> muscle_group no padrão do app
- Upsert (ignora duplicatas)
- Já foram importados ~1300 exercícios

Storage bucket para imagens de exercícios: `exercises`

---

## Design System

Classes Tailwind customizadas usadas em todo o projeto:
- `bg-obliq-black` — fundo principal
- `bg-obliq-surface` — fundo de cards/inputs
- `border-obliq-border` — bordas
- `text-obliq-red` — cor de destaque
- `shadow-red-glow` — sombra vermelha

Componentes UI em `src/components/ui/`:
`<Button variant="secondary">`, `<Card glow>`, `<Input label="">`, `<Badge>`, `<ProgressBar>`, `<Tabs>`

---

## Gotchas Conhecidos

### 1. Arquivos truncados
O Write tool do Codex trunca arquivos silenciosamente quando o conteúdo é longo.
Para qualquer arquivo > 80 linhas, usar Python ou bash com delimitador sem backticks:

```bash
python3 -c "
content = '''...conteudo...'''
open('arquivo.tsx', 'w').write(content)
"
```

### 2. profiles.id vs user_id
A tabela `profiles` usa `id` como FK para `auth.users`. NÃO existe coluna `user_id`.
Qualquer `.eq('user_id', x)` em queries de profiles está errado.

### 3. Null bytes em arquivos
```bash
tr -d '\0' < arquivo.tsx > tmp.tsx && mv tmp.tsx arquivo.tsx
```

### 4. ExerciseDB free plan
Retorna máx 10 resultados por request independente do `limit`. Paginar com offset.

### 5. Trigger é case-sensitive
`link_trainer_user` compara email exato. `createTrainer` salva em lowercase automaticamente.

### 6. TSC sem output = sucesso
`npx tsc --noEmit` sem nenhuma linha de saída significa zero erros de compilação.

---

## Verificação Rápida

```bash
cd frontend
npx tsc --noEmit   # sem output = ok
npm run build      # deve completar sem erros
```
