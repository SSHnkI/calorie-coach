# Migração para um repositório limpo

Runbook para aposentar `SSHnkI/calorie-coach` e recriar o projeto num repositório sem
histórico comprometido. Escrito em 2 de setembro de 2026, depois da auditoria.

---

## 0. Antes de começar: isso é urgente?

Não. A chave RapidAPI, único segredo real que já esteve versionado, foi revogada e
testada: hoje ela responde igual a uma string inventada. O que sobrou no histórico é uma
senha de porta que não existe mais.

Então isto aqui é higiene, não incêndio. Faz sentido quando:

- o repositório for ficar público
- alguém de fora for clonar (sócio, freelancer, auditoria)
- você quiser parar de carregar 400 commits de um app que não existe mais

Se nada disso está em jogo, guarde este documento e siga a vida.

---

## 1. O que "sem rastro" significa de verdade

Reescrever o histórico **não** apaga o que já foi para o GitHub. Commits antigos
continuam alcançáveis por SHA na API por um tempo, forks mantêm o que copiaram, e caches
e mirrors de terceiros não obedecem a ninguém.

A única coisa que apaga de fato é **deletar o repositório no GitHub e criar outro**. Por
isso este runbook é de migração, não de `filter-repo`.

E mesmo assim: se o repositório já foi público em algum momento, assuma que o que estava
lá foi lido. A revogação é o que protege, não a limpeza.

---

## 2. Inventário: o que não pode entrar no repositório novo

Rodar antes de qualquer coisa, na raiz do projeto atual:

```bash
git log --all -p | grep -inE "sk_live|sk_test|whsec_|AIza|rapidapi|service_role|BEGIN [A-Z ]*PRIVATE KEY|password\s*=|secret\s*=" | sort -u
```

Em 2 set 2026 isso devolveu só leituras de variável de ambiente e um texto de exemplo
(`COLE_SUA_SERVICE_ROLE_KEY_AQUI`). Se aparecer coisa nova, **revogue primeiro**, migre
depois. Migrar sem revogar não resolve nada.

Checar também o que está fora do git mas mora na pasta:

```bash
git status --ignored --short | grep "^!!"
```

`frontend/.env.local` e `CLAUDE.md` estão no `.gitignore` e devem continuar assim.

Segredos que vivem fora do repositório e **não** precisam de migração, só de conferência:

| segredo | onde mora |
|---|---|
| chave do Gemini | Supabase > Edge Functions > Secrets |
| service role key | Supabase, nunca sai da edge function |
| VAPID privada | tabela `push_cfg` |
| `cron_secret` | tabela `push_cfg` |
| anon key | `frontend/.env.local` e nas env vars da Vercel |

---

## 3. Caminho recomendado: um commit, sem histórico

Mais simples do que `git filter-repo`, e é o único que realmente garante que não sobrou
nada. O custo é perder o histórico, que para um projeto de uma pessoa é barato: se quiser
guardar, o item 3.1 resolve.

### 3.1 Guardar o histórico antigo antes (opcional)

```bash
cd ..
git clone --mirror calorie-coach calorie-coach-historico.git
tar -czf calorie-coach-historico.tar.gz calorie-coach-historico.git
```

Guarda o `.tar.gz` fora do computador (drive, HD externo). **Não** subir para lugar
nenhum público: ele contém exatamente o histórico que você está tentando aposentar.

### 3.2 Criar o repositório novo

No GitHub, criar `SSHnkI/obliq` (ou o nome que for), **privado**, vazio: sem README, sem
`.gitignore`, sem licença. Qualquer arquivo inicial só atrapalha o primeiro push.

### 3.3 Montar o commit inicial

```bash
cd calorie-coach
rm -rf .git
git init -b main
git add -A
git commit -m "inicio: obliq, calculadora de calorias"
git remote add origin git@github.com:SSHnkI/obliq.git
git push -u origin main
```

Antes do `git add -A`, conferir que o `.gitignore` está no lugar e cobre:

```
node_modules/
dist/
.env
.env.local
frontend/.env.local
CLAUDE.md
.DS_Store
dump-app-antigo.json
```

O `dump-app-antigo.json` tem e-mails de conta de teste. Hoje ele está versionado no
repositório privado, o que é aceitável. No repositório novo, tire da árvore antes do
primeiro commit: mova para a mesma pasta onde ficou o mirror do histórico.

### 3.4 Conferir antes de considerar pronto

```bash
git log --oneline            # tem que ser exatamente 1 commit
git log --all -p | grep -inE "sk_live|sk_test|whsec_|AIza|rapidapi|service_role"   # nada
git ls-files | grep -iE "\.env|dump-|CLAUDE.md"                                     # nada
```

Se tiver `gitleaks` à mão, uma passada fecha a conta:

```bash
gitleaks detect --source . --no-banner
```

---

## 4. Religar o que estava pendurado no repositório antigo

Ordem importa: religue tudo antes de apagar o repositório velho.

- [ ] **Vercel**: no projeto, Settings > Git > desconectar o repositório antigo e conectar o novo. Conferir se as env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) seguiram; elas moram no projeto da Vercel, não no repositório, então normalmente sobrevivem.
- [ ] **Deploy de teste**: um push qualquer na `main` e acompanhar até ficar verde.
- [ ] **Domínio**: se houver domínio customizado apontando para o projeto, confirmar que continua respondendo.
- [ ] **Supabase**: nada a fazer, o banco não conhece o repositório.
- [ ] **GitHub Actions / webhooks**: hoje não existem. Se existirem no futuro, recriar.
- [ ] Atualizar a URL do repositório em `CLAUDE.md`, `AGENTS.md` e `MANUAL.md`.

---

## 5. Ligar as proteções no repositório novo

O ponto de fazer isso agora é não precisar de um segundo runbook daqui a um ano.

- [ ] Settings > Code security > **Secret scanning**: ligado
- [ ] Settings > Code security > **Push protection**: ligado (barra o commit antes de sair da sua máquina)
- [ ] Settings > Code security > **Dependabot alerts**: ligado
- [ ] Branch `main` protegida, se algum dia houver mais de uma pessoa
- [ ] Repositório **privado** enquanto não houver motivo para ser público

---

## 6. Só então: apagar o repositório antigo

Com o novo publicando na Vercel e verde:

GitHub > `SSHnkI/calorie-coach` > Settings > rolar até o fim > **Delete this repository**.

Antes de clicar, checar em Insights > Forks se alguém forkou. Fork não morre com o
original: se existir algum, o conteúdo continua vivo lá e não há botão que resolva.

Irreversível. É o objetivo.

---

## 7. O que continua fora do seu alcance

Honestidade sobre os limites, para não haver falsa sensação de faxina:

- clones que outras pessoas já fizeram
- forks, se houver
- caches de indexadores e agregadores de código
- qualquer coisa que já tenha sido copiada por um scanner de segredo automático

Nada disso importa enquanto os segredos estiverem revogados. Por isso a ordem certa é
sempre **revogar primeiro, migrar depois**, e nunca o contrário.

---

## 8. Resumo de uma tela

1. Varrer o histórico atrás de segredo novo. Se achar, revogar.
2. Guardar um mirror do histórico antigo, offline.
3. Criar o repositório novo, privado e vazio.
4. `rm -rf .git`, `git init`, um commit, push.
5. Conferir: um commit, zero segredo, zero arquivo que devia estar no `.gitignore`.
6. Religar a Vercel e ver um deploy verde.
7. Ligar secret scanning e push protection.
8. Apagar o repositório antigo.
