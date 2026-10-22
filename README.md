# Certificados do III Simpósio de Fisioterapia da UniFSP

Aplicação Next.js/TypeScript, PostgreSQL no Supabase e PDFs armazenados em bucket privado. A rota `/` redireciona para o painel do organizador em `/admin`, sem login ou sessão. Qualquer pessoa com o endereço do painel pode consultar dados e executar suas funções.

## Situação dos materiais

As prévias aprovadas estão em `referencias/`. O script `scripts/build-models.py` retira apenas os dados ilustrativos e o selo de prévia, preservando brasão, marca d'água, logo, assinatura e texto fixo. Os dois modelos limpos ficam em `models/`. As imagens de identidade em `assets/` foram extraídas dessas prévias. As listas nominais dos minicursos ficam somente em `tmp/importacao/`, ignorado pelo Git.

## Configuração

1. Instale Node.js 20 ou superior e rode `npm install`.
2. Crie `.env.local` com base em `.env.example`. Gere um segredo longo para `CONTACT_HASH_SECRET`, por exemplo `openssl rand -hex 32`. `SUPABASE_SERVICE_ROLE_KEY` deve ficar apenas no servidor. `APP_ORIGIN` é a origem HTTPS exata, sem barra final.
   Preserve `CONTACT_HASH_SECRET` depois da primeira emissão: trocá-lo impede localizar os celulares já registrados pelos fluxos de cadastro e recuperação.
3. Use exclusivamente o projeto Supabase autorizado. Aplique, na ordem, as migrações de `supabase/migrations/` que ainda não estiverem no banco. A aplicação usa a Data API apenas com a chave secreta de servidor; não conceda acesso anônimo às tabelas de participantes, alunos ou certificados. O SQL Editor não registra a execução no histórico do Supabase CLI; as migrações locais aceitam reaplicação posterior pelo CLI sem recriar as tabelas.
4. Para reconstruir os modelos, instale Python com `pypdf` e rode `npm run models`. Rode `npm test`, `npm run build` e `npm run dev`.
5. Abra `https://SEU-DOMINIO/` para acessar o painel. Compartilhe com os alunos apenas o link ou QR Code específico de cada palestra (`/p/slug`).

## Vercel

Importe este repositório como projeto Next.js. Configure as quatro variáveis de `.env.example` em Production (e Preview somente se houver banco de teste). Aplique as migrações pendentes no projeto Supabase autorizado antes do deploy. Use domínio HTTPS final em `APP_ORIGIN` e faça novo deploy quando mudar variáveis. Os PDFs base em `models/` e a fonte em `assets/` devem estar versionados. `ADMIN_LINK_SECRET` e `SESSION_SECRET` não são mais usados e podem ser removidos da Vercel.

## Minicursos

Os três minicursos e seus 54 alunos são carregados uma vez a partir do CSV privado em `tmp/importacao/` com `node scripts/import-initial-workshops.mjs --apply`. Sem `--apply`, o script apenas confere formato, metadados, contagens e duplicatas. Ele não roda no build, deploy ou inicialização e recusa um `SUPABASE_URL` diferente do projeto autorizado. A função de banco `import_workshops` mantém a carga idempotente. Não copie o CSV para o código-fonte ou repositório.

Em `/admin/minicursos`, a organização edita os dados de cada curso, adiciona, corrige, exclui e restaura alunos. A exclusão é reversível e retira o aluno das listas e dos PDFs. Os certificados usam um único identificador por aluno; alterações de nome ou curso invalidam a versão anterior. A ação **Reemitir certificado** grava a data e hora da reemissão. O PDF atual é servido por identificador na rota de certificados e armazenado no bucket privado `certificates`. O link individual pode ser compartilhado sem sessão.

## Palestras e recuperação

Cada palestra recebe QR Code próprio para `/p/slug` e link de recuperação em `/r/slug`. O cadastro abre e fecha separadamente; o link de recuperação apenas consulta registros existentes e segue disponível após o fechamento. Nome e celular localizam um cadastro, mas não verificam a posse do número. Não apresente o processo como autenticação por celular. Os links de certificados são compartilháveis por identificador não adivinhável. Para enviar o PDF pelo WhatsApp quando o navegador não compartilha arquivos, baixe o PDF e anexe manualmente.

## Contrato resumido

- `POST /api/lectures/:id/register`: nome, celular e e-mail opcional; devolve o mesmo `certificateId` em repetições. Só a palestra do `id` é emitida.
- `POST /api/lectures/:id/recover`: nome e celular; consulta com limite de cinco tentativas por IP a cada 15 minutos; nunca cria emissão.
- `GET /api/certificates/:id`: PDF individual de palestra ou minicurso, acessível pelo identificador.
- `/api/admin/*`: dispensa cookie administrativo; operações de escrita verificam `Origin` contra `APP_ORIGIN`.
- `PATCH /api/admin/lectures/:id`: aceita um ou mais campos de `title`, `speaker`, `event_date` (AAAA-MM-DD), `workload`, `details` e `registration_open`. Rejeita campos desconhecidos e alterações vazias; exige origem válida. O `slug` e os links de cadastro e recuperação permanecem vinculados à mesma palestra.

Os testes locais cobrem QR Codes, conferência de CSV, renderização individual e PDFs conjuntos. O teste opcional `tests/live-database.test.ts` usa **somente um projeto Supabase de teste** com a migração aplicada. Para executá-lo, defina `RUN_SUPABASE_INTEGRATION=1`, `TEST_SUPABASE_URL`, `TEST_SUPABASE_SERVICE_ROLE_KEY` e `TEST_CONTACT_HASH_SECRET` e rode `npm test`. Ele verifica concorrência, fechamento, idempotência e separação de tipos. Antes da abertura, valide também a recuperação após o fechamento, QR Codes impressos e PDFs em lote com dados reais.
