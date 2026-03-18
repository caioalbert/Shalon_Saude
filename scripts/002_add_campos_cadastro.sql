-- Migração incremental para bancos já existentes
-- Adiciona campos de perfil pessoal/eclesiástico no cadastro

ALTER TABLE cadastros
  ADD COLUMN IF NOT EXISTS rg TEXT,
  ADD COLUMN IF NOT EXISTS estado_civil TEXT,
  ADD COLUMN IF NOT EXISTS nome_conjuge TEXT,
  ADD COLUMN IF NOT EXISTS escolaridade TEXT,
  ADD COLUMN IF NOT EXISTS situacao_profissional TEXT,
  ADD COLUMN IF NOT EXISTS profissao TEXT,
  ADD COLUMN IF NOT EXISTS congregacao_atual TEXT,
  ADD COLUMN IF NOT EXISTS posicao_igreja TEXT;
