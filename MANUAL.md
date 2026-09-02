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
| Vercel (deploy) | https://vercel.com/dashboard |
| GitHub | https://github.com/SSHnkI/calorie-coach |
| Google AI Studio (chave Gemini) | https://aistudio.google.com/apikey |

---

## 2. Como o app funciona

### Fluxo do usuário

1. **Landing** (`/`): apresentação. Quem já tem sessão cai direto no app.
2. **Auth** (`/auth`): cadastro e login (email e senha, Google, Apple) via Supabase Auth.
3. **Onboarding** (`/onboarding`): idade, peso, altura, sexo, atividade, objetivo. Calcula `daily_kcal` (TDEE) e grava em `profiles`.
4. **Dashboard** (`/dashboard`): meta do dia, macros, registro de alimento por texto, foto ou voz, histórico.
5. **Usuários** (`/usuarios`): só o admin. Lista contas, define senha, apaga histórico, apaga conta.

O app tem duas telas e nenhum menu. Treino, dieta, personal, nutricionista e a página de
preços saíram do escopo em setembro de 2026. O código segue no histórico do git e os
dados de teste em `dump-app-antigo.json`.

### Papéis

Só existem dois: usuário e admin master (`victorguilhermevg3@gmail.com`).

A restrição do admin mora no banco (policy RLS que compara o e-mail dentro do token) e
nas edge functions. Digitar `/usuarios` na barra de endereço não vaza nada.

### IA de calorias

Descrever "arroz com feijão 200g" chama a Edge Function `analyze-food`, que usa o Gemini
(`gemini-2.5-flash`) e devolve kcal e macros. Foto e áudio entram pela mesma função.

- Teto de segurança: 100 análises por conta por dia, contado no servidor.
- Foto e áudio são processados e descartados. Não existe bucket de mídia.

---

## 3. Banco de dados (Supabase)

Onde: **Table Editor** ou **SQL Editor** para queries.

Cinco tabelas:

| Tabela | Serve para |
|---|---|
| `profiles` | perfil do usuário. `id` = id do auth. Meta de kcal, `subscription_status` |
| `food_log` | diário alimentar |
| `push_subs` | assinatura de web push por dispositivo |
| `push_log` | trava para não repetir a mesma notificação no dia |
| `push_cfg` | chaves VAPID e o segredo do cron. Só o service role enxerga |

**Regra de ouro:** `profiles` NÃO tem coluna `user_id`. Filtrar sempre por `id`.

### Coisas comuns de fazer no SQL Editor

Ver os usuários:

```sql
select id, email, subscription_status, daily_kcal
from profiles order by created_at desc limit 50;
```

Liberar Pro na mão:

```sql
update profiles set subscription_status = 'active' where email = 'fulano@exemplo.com';
```

O que uma pessoa comeu hoje:

```sql
select logged_at, name, kcal from food_log
where user_id = 'UUID_DO_USUARIO' and logged_at::date = current_date
order by logged_at;
```

### Segurança

RLS ligado nas cinco tabelas. Uma política por tabela, cobrindo dono e admin de uma vez.
O usuário só enxerga a própria linha; o admin enxerga tudo, com a checagem feita contra o
e-mail do token, dentro do banco.

As duas funções que sobraram (`handle_new_user`, `push_meta_batida`) rodam só como
gatilho: o `execute` foi revogado de `anon` e `authenticated`, e o `search_path` é fixo.

---

## 4. Rodar local

```bash
cd frontend
npm install
npm run dev
```

Abre em http://localhost:5173. Precisa do arquivo `frontend/.env.local` com
`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

Antes de commitar:

```bash
cd frontend
npm run build
```

Se buildar sem erro, o deploy passa.

---

## 5. Deploy

O deploy é automático: `git push` na branch `main`, a Vercel builda e publica.

```bash
git add -A
git commit -m "descricao"
git push
```

Acompanhar em https://vercel.com/dashboard (projeto calorie-coach, aba Deployments). Se
ficar vermelho, clicar no deploy e ler o log: quase sempre é erro de TypeScript.

### Edge Functions

Mudou algo em `supabase/functions/`? O push no Git não publica. Precisa:

```bash
supabase functions deploy analyze-food
```

Chaves secretas (Gemini) ficam em Supabase > Edge Functions > Secrets, não no código.

---

## 6. Painel de usuários (/usuarios)

Lista todas as contas com a meta de kcal e quantos registros cada uma tem. Dá para:

- definir a senha de alguém direto, sem passar por e-mail (`admin-set-password`)
- apagar o histórico de refeições de uma conta
- apagar a conta inteira (`admin-delete-user`)

As três operações conferem o e-mail do admin contra o token, no servidor.

---

## 7. Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| Deploy falhou na Vercel | erro de TypeScript | rodar `npm run build` local e corrigir |
| "permission denied for table X" | faltou GRANT ou policy | rodar o GRANT no SQL Editor |
| IA retorna erro 429 | cota do Gemini estourada | checar em aistudio.google.com |
| E-mail de confirmação não chega | SMTP de teste do Supabase | plugar Resend ou Brevo (ver pendências) |
| Usuário cadastrou e não apareceu em `profiles` | não terminou o onboarding | o perfil só fica completo ao concluir |
| PWA no iOS não atualiza | service worker em cache | remover da tela inicial e adicionar de novo |

---

## 8. Pendências (rodar quando puder)

- [ ] Rotacionar a chave RapidAPI que ficou exposta no histórico do git
- [ ] Plugar SMTP próprio (Resend ou Brevo) em Authentication > Emails
- [ ] Ligar a proteção contra senha vazada em Authentication > Policies
- [ ] Apagar as edge functions órfãs no dashboard: `create-checkout`, `stripe-webhook`, `admin-reset-link`
- [ ] Ligar rate limiting no Supabase Auth (Authentication > Rate Limits)
