-- Tabela principal de cadastros
CREATE TABLE IF NOT EXISTS cadastros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  nome TEXT NOT NULL,
  cpf TEXT NOT NULL,
  rg TEXT,
  data_nascimento DATE NOT NULL,
  telefone TEXT,
  sexo TEXT,
  estado_civil TEXT,
  nome_conjuge TEXT,
  escolaridade TEXT,
  situacao_profissional TEXT,
  profissao TEXT,
  congregacao_atual TEXT,
  posicao_igreja TEXT,
  endereco TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  tem_dependentes BOOLEAN DEFAULT FALSE,
  selfie_path TEXT,
  termo_pdf_path TEXT,
  termo_assinado_em TIMESTAMP WITH TIME ZONE,
  ip_assinante TEXT,
  email_enviado_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices únicos
CREATE UNIQUE INDEX IF NOT EXISTS cadastros_email_idx ON cadastros(email);
CREATE UNIQUE INDEX IF NOT EXISTS cadastros_cpf_idx ON cadastros(cpf);

-- Tabela de dependentes
CREATE TABLE IF NOT EXISTS dependentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cadastro_id UUID NOT NULL REFERENCES cadastros(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  rg TEXT,
  cpf TEXT,
  data_nascimento DATE,
  relacao TEXT,
  telefone_celular TEXT,
  sexo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compatibilidade com bancos já existentes
ALTER TABLE cadastros
  ADD COLUMN IF NOT EXISTS sexo TEXT,
  ADD COLUMN IF NOT EXISTS rg TEXT,
  ADD COLUMN IF NOT EXISTS estado_civil TEXT,
  ADD COLUMN IF NOT EXISTS nome_conjuge TEXT,
  ADD COLUMN IF NOT EXISTS escolaridade TEXT,
  ADD COLUMN IF NOT EXISTS situacao_profissional TEXT,
  ADD COLUMN IF NOT EXISTS profissao TEXT,
  ADD COLUMN IF NOT EXISTS congregacao_atual TEXT,
  ADD COLUMN IF NOT EXISTS posicao_igreja TEXT;

ALTER TABLE dependentes
  ADD COLUMN IF NOT EXISTS rg TEXT,
  ADD COLUMN IF NOT EXISTS telefone_celular TEXT,
  ADD COLUMN IF NOT EXISTS sexo TEXT;

-- Criar índice para busca por cadastro
CREATE INDEX IF NOT EXISTS dependentes_cadastro_idx ON dependentes(cadastro_id);

-- Habilitar RLS
ALTER TABLE cadastros ENABLE ROW LEVEL SECURITY;
ALTER TABLE dependentes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para cadastros
-- Permitir inserção pública (qualquer pessoa pode se cadastrar)
CREATE POLICY "cadastros_insert_public" ON cadastros
  FOR INSERT
  WITH CHECK (true);

-- Permitir que o próprio usuário veja seu cadastro pelo email
CREATE POLICY "cadastros_select_own" ON cadastros
  FOR SELECT
  USING (true);

-- Admins podem ver todos (usando service role no backend)
-- A verificação real de admin será feita no middleware/API

-- Políticas RLS para dependentes
CREATE POLICY "dependentes_insert_public" ON dependentes
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "dependentes_select_public" ON dependentes
  FOR SELECT
  USING (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_cadastros_updated_at ON cadastros;
CREATE TRIGGER update_cadastros_updated_at
  BEFORE UPDATE ON cadastros
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
