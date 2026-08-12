-- Migration 020: Persistência do status de sincronização com a MaisEdu

ALTER TABLE cadastros
  ADD COLUMN IF NOT EXISTS maisedu_status TEXT DEFAULT 'PENDENTE',
  ADD COLUMN IF NOT EXISTS maisedu_user_id BIGINT,
  ADD COLUMN IF NOT EXISTS maisedu_synced_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS maisedu_last_error TEXT;

UPDATE cadastros
SET maisedu_status = 'PENDENTE'
WHERE maisedu_status IS NULL;

ALTER TABLE cadastros
  ALTER COLUMN maisedu_status SET DEFAULT 'PENDENTE',
  ALTER COLUMN maisedu_status SET NOT NULL;

CREATE INDEX IF NOT EXISTS cadastros_maisedu_status_idx
  ON cadastros(maisedu_status);
