# Manual Obliq

Guia de operação: onde fica cada coisa e como mexer.

---

## 1. Links rápidos

| O quê | URL |
|---|---|
| App em produção | https://obliq-psi.vercel.app |
| Supabase (tabelas) | https://supabase.com/dashboard/project/ucdagoaokdqgkqfprfuv/editor |
| Supabase (SQL Editor) | https://supabase.com/dashboard/project/ucdagoaokdqgkqfprfuv/sql/new |
| Supabase (Edge Functions) | https://supabase.com/dashboard/project/ucdagoaokdqgkqfprfuv/functions |
| Supabase (Auth / usuários) | https://supabase.com/dashboard/project/ucdagoaokdqgkqfprfuv/auth/users |
| Supabase (Storage) | https://supabase.com/dashboard/project/ucdagoaokdqgkqfprfuv/storage/buckets |
| Vercel (deploy) | https://vercel.com/dashboard |
| Stripe (pagamentos) | https://dashboard.stripe.com |
| GitHub | https://github.com/SSHnkI/calorie-coach |
| Google AI Studio (chave Gemini) | https://aistudio.google.com/apikey |

---

## 2. Como o app funciona

### Fluxo do usuário

1. **Landing** (`/`): apresentação, preço R$19,90/mês.
2. **Auth** (`/auth`): cadastro/login (email+senha, Google, Apple) via Supabase Auth.
3. **Onboarding** (`/onboarding`): idade, peso, altura, sexo, atividade, objetivo. Calcula `daily_kcal` (TDEE) e grava em `profiles`.
4. **Dashboard** (`/dashboard`): meta do dia, macros, registrar alimento por texto (IA), histórico.
5. **Dieta** (`/diet`): dieta semanal (7 dias). Pro.
6. **Treino** (`/workout`): catálogo de exercícios (grátis), meus treinos, execução com cronômetro, histórico, conquistas (Pro).
7. **Pro** (`/pricing`): assinar via Stripe OU resgatar código de profissional.

### Papéis

```
Admin master (victorguilhermevg3@gmail.com)
  -> cria Profissionais em /admin (personal e/ou nutri, cada um com um código)
        -> profissional se cadastra com o email pré-cadastrado (trigger vincula sozinho)
              -> usuário digita o código em /pricing
                    -> vira Pro e fica vinculado ao profissional
```

Rotas por papel:
- `/admin`: só o email admin master (hardcoded no código e nas policies RLS).
- `/trainer`: quem tem `is_trainer` na tabela `professionals`.
- `/nutritionist`: quem tem `is_nutri`.
- `/dashboard`, `/workout`, `/diet`: qualquer usuário logado.

Os botões de nav (Admin/Treinador/Nutri) só aparecem para quem tem o papel.

### IA de calorias

Digitar "arroz com feijão 200g" chama a Edge Function `analyze-food`, que usa o Gemini (`gemini-2.5-flash`) e retorna kcal + macros.

- Grátis: 5 análises/dia.
- Pro: ilimitado, com teto de segurança de 100 chamadas/dia por conta.
- No editor de dieta, a IA calcula kcal sem gravar no diário (flag `log: false`).

---

## 3. Banco de dados (Supabase)

Onde: **Table Editor** (guia já aberta) ou **SQL Editor** para queries.

Tabelas principais:

| Tabela | Serve para |
|---|---|
| `profiles` | perfil do usuário. `id` = id do auth. Guarda meta kcal, `subscription_status`, `professional_id` |
| `professionals` | personais e nutris. Campos `is_trainer`, `is_nutri`, `code` |
| `exercises` | catálogo (~1300 exercícios) |
| `workout_plans` / `workout_exercises` | treinos montados |
| `workout_logs` / `exercise_sets` | sessões realizadas e séries |
| `meal_plans` / `meals` / `meal_items` | dietas semanais |
| `food_entries` | diário alimentar |

**Regra de ouro:** `profiles` NÃO tem coluna `user_id`. Filtrar sempre por `id`.

### Coisas comuns de fazer no SQL Editor

Ver os usuários:
```sql
select id, email, subscription_status, professional_id, daily_kcal
from profiles order by created_at desc limit 50;
```

Liberar Pro na mão:
```sql
select admin_set_pro('UUID_DO_USUARIO', true);
```

Ver profissionais e códigos:
```sql
select name, email, code, is_trainer, is_nutri from professionals;
```

Quantos exercícios existem:
```sql
select muscle_group, count(*) from exercises group by 1 order by 2 desc;
```

### Segurança

RLS ligado em tudo. Usuário só enxerga a própria linha; profissional enxerga clientes vinculados; admin enxerga tudo (checagem por email no JWT).

Colunas sensíveis (`subscription_status`, `professional_id`) têm UPDATE revogado do usuário: só mudam via funções `redeem_pro_code` e `admin_set_pro`. Isso impede alguém virar Pro sozinho pelo console do navegador.

---

## 4. Rodar local

```bash
cd frontend
npm install
npm run dev
```

Abre em http://localhost:5173. Precisa do arquivo `frontend/.env.local` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

Antes de commitar:
```bash
cd frontend
npm run build
```
Se buildar sem erro, o deploy passa.

---

## 5. Deploy

O deploy é automático: `git push` na branch `main` -> Vercel builda e publica.

```bash
git add -A
git commit -m "descricao"
git push
```

Acompanhar em https://vercel.com/dashboard (projeto calorie-coach, aba Deployments). Se ficar vermelho, clicar no deploy e ler o log: quase sempre é erro de TypeScript.

**Nunca commitar `CLAUDE.md`** (tem chave de API). Já está no `.gitignore`.

### Edge Functions

Mudou algo em `supabase/functions/`? O push no Git não publica. Precisa:

```bash
supabase functions deploy analyze-food
```

Chaves secretas (Gemini, Stripe) ficam em Supabase > Edge Functions > Secrets, não no código.

---

## 6. Pagamentos (Stripe)

- Preço atual: R$19,90/mês.
- Price ID: `price_1TmMRo7FbBrEWaC4NISZw96t` (em `PricingPage.tsx`).
- Fluxo: botão chama a função `create-checkout` -> Stripe Checkout -> ao pagar, o `stripe-webhook` marca `subscription_status = 'active'`.

Trocar de preço: criar o novo preço no Stripe, copiar o Price ID, atualizar em `PricingPage.tsx` e nos textos de i18n (pt-BR e en-US) e na LandingPage.

Ver quem pagou: Stripe Dashboard > Payments.

---

## 7. Painel Admin (/admin)

Quatro abas:

1. **Exercícios**: criar/editar/excluir exercícios, subir foto (vai pro bucket `exercises`).
2. **Usuários**: listar todos, alternar Pro/Grátis sem passar pelo Stripe.
3. **Treinos**: escolher um cliente e montar treino pra ele, ou copiar um modelo pronto (ABC, PPL, Full Body, etc).
4. **Profissionais**: criar personal/nutri (nome, email, marca se é personal e/ou nutri). O código é gerado sozinho. O profissional se cadastra com aquele email e ganha acesso automático.

---

## 8. Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| Deploy falhou na Vercel | erro de TypeScript | rodar `npm run build` local e corrigir |
| "permission denied for table X" | faltou GRANT/policy | rodar o GRANT no SQL Editor |
| IA retorna erro 429 | cota do Gemini estourada | checar em aistudio.google.com |
| Usuário cadastrou e não apareceu em `profiles` | não terminou o onboarding | o perfil só é gravado ao concluir |
| PWA no iOS não atualiza | service worker em cache | remover da tela inicial e adicionar de novo |
| Profissional sem acesso | email do cadastro diferente do cadastrado no admin | conferir o email (tem que bater exato, minúsculo) |

---

## 9. Pendências (rodar quando puder)

- [ ] `supabase functions deploy analyze-food` (mudanças de modelo/limite ainda não publicadas)
- [ ] Rotacionar a chave RapidAPI que ficou exposta no histórico
- [ ] Ligar rate limiting no Supabase Auth (Authentication > Rate Limits)
