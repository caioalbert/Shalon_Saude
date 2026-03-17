# Guia Rápido de Início - SHALON Saúde

## Começar em 5 Minutos

### 1. Configuração Inicial

```bash
# Instalar dependências
npm install

# Copiar arquivo de configuração
cp .env.example .env.local
```

### 2. Adicionar Credenciais

Edite `.env.local` e adicione suas chaves:

- **Supabase**: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
- **Vercel Blob**: BLOB_READ_WRITE_TOKEN
- **Resend** (opcional): RESEND_API_KEY

### 3. Criar Banco de Dados

1. Vá ao SQL Editor do Supabase
2. Copie o conteúdo de `scripts/001_create_tables.sql`
3. Execute no SQL Editor
4. ✅ Tabelas criadas!

### 4. Criar Usuário Admin (Opcional)

No Supabase → Authentication → Users:

1. Add user: `admin@example.com` / senha segura
2. Editar User metadata do novo usuário
3. Adicionar: `{ "is_admin": true }`

### 5. Iniciar Servidor

```bash
npm run dev
```

Acesse: http://localhost:3000

## URLs Principais

- **Homepage**: http://localhost:3000
- **Cadastro**: http://localhost:3000/cadastro
- **Admin Login**: http://localhost:3000/admin/login
- **Admin Dashboard**: http://localhost:3000/admin/dashboard

## Testar Fluxo Completo

### 1. Cadastro de Usuário

1. Vá para `/cadastro`
2. Preencha todos os dados (6 etapas)
3. Use sua câmera para selfie
4. Confirme e finalize
5. Você verá tela de sucesso

### 2. Painel Admin

1. Vá para `/admin/login`
2. Use `admin@example.com` e sua senha
3. Verá dashboard com estatísticas
4. Clique em "Ver Detalhes" para visualizar cadastro
5. Baixe PDF ou visualize selfie

## Estrutura de Dados

### Dados Pessoais
- Nome, CPF, Email, Telefone, Data Nascimento

### Endereço
- Logradouro, Número, Complemento, Bairro, Cidade, Estado, CEP

### Dependentes
- Nome, CPF, Data Nascimento, Relação (cônjuge, filho, etc)

### Termo
- Gerado automaticamente com dados do cadastro
- Assinado digitalmente com timestamp

## Funcionalidades Prontas

- ✅ Formulário multi-step com validação
- ✅ Captura de selfie via câmera
- ✅ Armazenamento seguro de arquivos
- ✅ Geração de PDF dinâmico
- ✅ Painel administrativo completo
- ✅ Envio de email (com Resend)
- ✅ Banco de dados com RLS

## Próximos Passos

1. **Resend**: Se quiser emails, configure RESEND_API_KEY
2. **Email em Produção**: Ajuste templates em `/api/enviar-termo`
3. **SSL em Produção**: Necessário para câmera funcionar
4. **Backup**: Configure backups Supabase

## Troubleshooting

**Câmera não funciona?**
→ Certificar que está HTTPS (necessário em produção)

**Database error?**
→ Verificar se tabelas foram criadas no Supabase

**Login falhando?**
→ Verificar se é_admin está em user_metadata

## Suporte

Documentação completa: Ver `README.md`
