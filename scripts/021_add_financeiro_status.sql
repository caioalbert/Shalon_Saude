-- Migration 021: Persistência do status financeiro do contrato familiar
--
-- O status pertence ao cadastro do titular. Dependentes usam o mesmo cadastro_id
-- e, portanto, não recebem assinatura nem status financeiro próprios.

ALTER TABLE cadastros
  ADD COLUMN IF NOT EXISTS financeiro_status TEXT,
  ADD COLUMN IF NOT EXISTS financeiro_status_atualizado_em TIMESTAMP WITH TIME ZONE;

UPDATE cadastros
SET financeiro_status = 'ADESAO_NAO_CONCLUIDA'
WHERE financeiro_status IS NULL
  AND status <> 'ATIVO';

ALTER TABLE cadastros
  ALTER COLUMN financeiro_status SET DEFAULT 'ADESAO_NAO_CONCLUIDA';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cadastros_financeiro_status_check'
      AND conrelid = 'cadastros'::regclass
  ) THEN
    ALTER TABLE cadastros
      ADD CONSTRAINT cadastros_financeiro_status_check
      CHECK (
        financeiro_status IS NULL
        OR financeiro_status IN ('ADESAO_NAO_CONCLUIDA', 'EM_DIA', 'EM_ATRASO')
      );
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS cadastros_financeiro_status_idx
  ON cadastros(financeiro_status);
