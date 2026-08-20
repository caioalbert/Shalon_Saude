/**
 * Mapeamento e tipos de produtos da API MaisEdu / Parceiro
 */

// Tipo exportado esperado por maisedu-response.ts e demais módulos
export type MaisEduProductId = number;

export const MAISEDU_DEFAULT_PRODUCT_IDS = {
  INDIVIDUAL: 1, // MaisTelemed Individual
  FAMILIAR: 2,   // MaisTelemed Familiar
  EMPRESARIAL: 2,
} as const;

export const MAISEDU_PRODUCT_IDS = MAISEDU_DEFAULT_PRODUCT_IDS;

export function resolveMaisEduProduct(cadastro: any): MaisEduProductId {
  if (!cadastro) return MAISEDU_DEFAULT_PRODUCT_IDS.INDIVIDUAL;

  // 1. Prioridade máxima: valor da coluna maisedu_produto_id na tabela planos
  const planoObj = cadastro.planos || cadastro.plano_rel;
  if (
    planoObj &&
    planoObj.maisedu_produto_id !== null &&
    planoObj.maisedu_produto_id !== undefined
  ) {
    const parsedId = Number(planoObj.maisedu_produto_id);
    if (!isNaN(parsedId) && parsedId > 0) {
      return parsedId;
    }
  }

  // 2. Fallback para registros legados ou sem join: busca por código/tipo/nome
  const planoIdentifier = String(
    cadastro.tipo_plano ||
    cadastro.plano ||
    planoObj?.codigo ||
    planoObj?.slug ||
    planoObj?.nome ||
    ""
  )
    .toUpperCase()
    .trim();

  if (
    planoIdentifier.includes("FAMILIAR") ||
    planoIdentifier.includes("EMPRESARIAL")
  ) {
    return MAISEDU_DEFAULT_PRODUCT_IDS.FAMILIAR;
  }

  // Padrão: 1 (Individual)
  return MAISEDU_DEFAULT_PRODUCT_IDS.INDIVIDUAL;
}

// Aliases para compatibilidade
export const getMaisEduProductId = resolveMaisEduProduct;