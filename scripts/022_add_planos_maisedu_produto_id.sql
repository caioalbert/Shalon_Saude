-- Migration 022: Vincula planos internos ao produto correspondente no parceiro MaisEdu
--
-- Produtos disponíveis na API do parceiro (POST /api/v1/partner_register):
--   1 = MaisTelemed Individual
--   2 = MaisTelemed Família (04 Vidas)
--   3 = MaisTelepet Individual
--   4 = MaisTelepet Família (03 Pets)
--   5 = MaisPrevi Individual
--   6 = MaisPrevi Família (05 Vidas)
--
-- O campo é nullable: planos sem vínculo com o parceiro simplesmente não disparam
-- o cadastro na API MaisEdu durante o sync.

ALTER TABLE planos
  ADD COLUMN IF NOT EXISTS maisedu_produto_id SMALLINT
    CHECK (maisedu_produto_id BETWEEN 1 AND 6);

COMMENT ON COLUMN planos.maisedu_produto_id IS
  'ID do produto no parceiro MaisEdu (1-6). NULL = plano sem integração MaisEdu.
   1=MaisTelemed Individual, 2=MaisTelemed Família,
   3=MaisTelepet Individual, 4=MaisTelepet Família,
   5=MaisPrevi Individual, 6=MaisPrevi Família.';

-- Preenche automaticamente os planos base criados pelo script 009
UPDATE planos SET maisedu_produto_id = 1 WHERE codigo = 'INDIVIDUAL'  AND maisedu_produto_id IS NULL;
UPDATE planos SET maisedu_produto_id = 2 WHERE codigo = 'FAMILIAR'    AND maisedu_produto_id IS NULL;
UPDATE planos SET maisedu_produto_id = 2 WHERE codigo = 'PLANO-EMPRESARIAL' AND maisedu_produto_id IS NULL;
UPDATE planos SET maisedu_produto_id = 2 WHERE codigo = 'EMPRESARIAL' AND maisedu_produto_id IS NULL;
