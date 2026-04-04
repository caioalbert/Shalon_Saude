# SHALON Saúde - Sistema de Cadastro Digital

Sistema completo de cadastro, adesão e gerenciamento de termos digitais para o SHALON Saúde. Inclui formulário multi-step, captura de selfie, geração de PDF dinâmico e painel administrativo.

## Funcionalidades:

✅ **Formulário de Cadastro Multi-Step**
- 6 etapas intuitivas: Dados Pessoais, Endereço, Dependentes, Selfie, Termo, Confirmação
- Validação de entrada em tempo real
- Formatação automática de CPF, CEP e Telefone
- Dependentes com email obrigatório (menores podem usar email do titular)

✅ **Captura de Selfie**
- Acesso direto à câmera do navegador
- Preview da foto antes de confirmar
- Armazenamento seguro em Vercel Blob (privado)

✅ **Termo de Adesão Digital**
- Geração dinâmica de PDF com dados do cadastro
- Incluir dependentes no termo
- Assinatura eletrônica com timestamp

✅ **Painel Administrativo**
- Dashboard com estatísticas e filtros
- Visualização detalhada de cada cadastro
- Download do termo em PDF
- Visualização de selfie
- Listagem de dependentes

✅ **Envio de Email**
- Integração com Resend para envio de emails
- Envio automático do termo ao cadastrado
- Suporte a templates HTML

## Stack Técnico

- **Frontend**: Next.js 16, React 19, TypeScript
- **Backend**: Next.js API Routes
- **Banco de Dados**: Supabase (PostgreSQL)
- **Storage**: Vercel Blob (para selfies e PDFs)
- **Email**: Resend
- **Autenticação**: Supabase Auth
- **UI**: Tailwind CSS, Shadcn/ui, Radix UI
- **PDF**: React-PDF Renderer

## Instalação e Configuração

### 1. Clonar o repositório

```bash
git clone <repo-url>
cd shalon-saude
```

### 2. Instalar dependências

```bash
npm install
# ou
yarn install
# ou
pnpm install
```

### 3. Configurar variáveis de ambiente

Copie o arquivo `.env.example` para `.env.local` e preencha com suas credenciais:

```bash
cp .env.example .env.local
```

Edite `.env.local` com:

#### Supabase
- `NEXT_PUBLIC_SUPABASE_URL` - URL do projeto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Chave anonimato do Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Chave de admin do Supabase

#### Vercel Blob
- `BLOB_READ_WRITE_TOKEN` - Token de acesso Vercel Blob

#### Resend (Opcional)
- `RESEND_API_KEY` - Chave API Resend para envio de emails
- `RESEND_FROM_EMAIL` - Email remetente (deve estar verificado no Resend em produção)

#### Aplicação
- `NEXT_PUBLIC_APP_URL` - URL da aplicação (ex: http://localhost:3000)

### 4. Criar tabelas no banco de dados

Acesse o SQL Editor do Supabase e execute o script em `scripts/001_create_tables.sql`:

```sql
-- Copie o conteúdo do arquivo scripts/001_create_tables.sql e execute
```

Se o banco já existia antes, execute também `scripts/002_add_campos_cadastro.sql` para:
- adicionar `email` em dependentes;
- remover campos de igreja do cadastro.

### 5. Criar usuário admin (opcional)

Para acessar o painel administrativo, crie um usuário com `is_admin: true` no Supabase:

1. Vá para Authentication → Users
2. Clique em "Add user"
3. Email: `admin@example.com` e senha
4. Após criar, clique no usuário e edite "User metadata"
5. Adicione: `{ "is_admin": true }`

### 6. Iniciar servidor de desenvolvimento

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:3000`

## CI/CD na Vercel (GitHub Actions)

Este repositório já possui workflow em `.github/workflows/vercel-deploy.yml` com o seguinte fluxo:

- `pull_request` em `master/main`: roda lint + build e faz deploy Preview na Vercel.
- `push` em `master/main`: roda lint + build e faz deploy de Produção na Vercel.

### Secrets necessários no GitHub

Configure os secrets do repositório em **Settings > Secrets and variables > Actions**:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

### Como obter os IDs da Vercel

1. Rode `vercel link` localmente na raiz do projeto.
2. Abra o arquivo `.vercel/project.json`.
3. Copie:
   - `orgId` para `VERCEL_ORG_ID`
   - `projectId` para `VERCEL_PROJECT_ID`

## Observabilidade (Vercel)

Este projeto já está preparado com observabilidade nativa da Vercel:

- **Web Analytics**: via `@vercel/analytics` em `app/layout.tsx`
- **Speed Insights**: via `@vercel/speed-insights` em `app/layout.tsx`
- **Tracing (OpenTelemetry)**: via `instrumentation.ts` com `@vercel/otel`

Depois do deploy, verifique no painel da Vercel:

1. **Analytics** para métricas de tráfego
2. **Speed Insights** para Core Web Vitals
3. **Observability / Traces** para rastrear execução de rotas e APIs

## Estrutura do Projeto

```
.
├── app/
│   ├── api/
│   │   ├── cadastro/              # API para cadastro
│   │   ├── admin/                 # APIs do painel admin
│   │   │   ├── login/
│   │   │   ├── logout/
│   │   │   ├── cadastros/
│   │   │   ├── cadastro/[id]/
│   │   │   ├── selfie/
│   │   │   └── gerar-pdf/
│   │   └── enviar-termo/          # API para envio de email
│   ├── cadastro/                  # Página de cadastro
│   ├── admin/
│   │   ├── login/                 # Login admin
│   │   ├── dashboard/             # Dashboard com listagem
│   │   └── cadastro/[id]/         # Detalhe do cadastro
│   ├── layout.tsx
│   └── page.tsx                   # Homepage
├── components/
│   ├── ui/                        # Componentes shadcn/ui
│   └── cadastro/
│       ├── CadastroForm.tsx       # Formulário principal
│       ├── CadastroSuccess.tsx    # Tela de sucesso
│       └── steps/                 # Componentes de cada etapa
│           ├── StepPessoal.tsx
│           ├── StepEndereco.tsx
│           ├── StepDependentes.tsx
│           ├── StepSelfie.tsx
│           ├── StepTermo.tsx
│           └── StepConfirmacao.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Cliente Supabase (browser)
│   │   ├── server.ts             # Cliente Supabase (server)
│   │   └── middleware.ts         # Middleware Supabase
│   ├── types.ts                  # Tipos TypeScript
│   └── utils.ts
├── scripts/
│   └── 001_create_tables.sql     # Script de criação de tabelas
├── .env.example
└── middleware.ts
```

## Fluxo de Dados

### Cadastro (Client → Server → DB)

1. Usuário preenche formulário multi-step
2. Selfie é capturada e convertida em Blob
3. `POST /api/cadastro` envia FormData com todos dados
4. Server faz upload da selfie para Vercel Blob
5. Server insere dados em Supabase
6. Server envia email com API `/api/enviar-termo`
7. Cliente recebe ID do cadastro e mostra sucesso

### Consulta (Admin)

1. Admin faz login em `/admin/login`
2. Credenciais são validadas contra Supabase Auth
3. Verifica se `is_admin: true` nos user_metadata
4. Token de sessão é armazenado em cookie
5. Admin acessa `/admin/dashboard` e lista cadastros
6. Clica em "Ver Detalhes" para visualizar cadastro específico
7. Pode baixar PDF ou visualizar selfie

## Modelo de Dados

### Tabela: cadastros

| Campo | Tipo |
|-------|------|
| id | UUID (PK) |
| email | TEXT (unique) |
| nome | TEXT |
| cpf | TEXT (unique) |
| data_nascimento | DATE |
| telefone | TEXT |
| sexo | TEXT |
| endereco | TEXT |
| numero | TEXT |
| complemento | TEXT |
| bairro | TEXT |
| cidade | TEXT |
| estado | TEXT |
| cep | TEXT |
| tem_dependentes | BOOLEAN |
| selfie_path | TEXT |
| termo_pdf_path | TEXT |
| termo_assinado_em | TIMESTAMP |
| ip_assinante | TEXT |
| email_enviado_em | TIMESTAMP |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |

### Tabela: dependentes

| Campo | Tipo |
|-------|------|
| id | UUID (PK) |
| cadastro_id | UUID (FK) |
| nome | TEXT |
| cpf | TEXT |
| data_nascimento | DATE |
| relacao | TEXT |
| email | TEXT |
| telefone_celular | TEXT |
| sexo | TEXT |
| created_at | TIMESTAMP |

## Segurança

- Tabelas com RLS habilitado
- Selfies e PDFs armazenados em Blob privado
- Autenticação obrigatória para painel admin
- Validação de entrada em todas as APIs
- Senhas com hash via Supabase Auth

## Troubleshooting

### Erro: "Database error"
- Verificar se variáveis de Supabase estão corretas
- Verificar se tabelas foram criadas
- Reexecutar o `scripts/001_create_tables.sql` após atualização de schema
- Checar permissões de RLS

### Erro: "Camera not accessible"
- Verificar permissões de câmera no navegador
- Usar HTTPS em produção

### Erro: "Admin login failed"
- Verificar se usuário existe com `is_admin: true` em metadata
- Limpar cookies do navegador

## Próximos Passos

- Implementar autenticação 2FA
- Adicionar dashboard de analytics
- Integrar assinatura digital avançada
- Suporte multi-idioma
- Testes automatizados

## Built with v0

Este projeto foi criado com [v0](https://v0.app). [Continue working on v0 →](https://v0.app/chat/projects/prj_WVLoh8TBAkqdPOH8pj3HlNf0O5bE)
