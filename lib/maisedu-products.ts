/** IDs oficiais dos produtos disponibilizados pela API de parceiros MaisEdu. */
export type MaisEduProductId = 1 | 2 | 3 | 4 | 5 | 6

const MAISEDU_PRODUCT_BY_INTERNAL_PLAN = {
  INDIVIDUAL: 1,
  FAMILIAR: 2,
  'PLANO-EMPRESARIAL': 2,
  EMPRESARIAL: 2,
} as const satisfies Record<string, MaisEduProductId>

/**
 * Mapeia o produto comercial interno para o produto contratado do fornecedor.
 * Os valores cobrados pela SHALOM e pela MaisEdu são independentes e não
 * participam desta decisão.
 */
export function getMaisEduProductId(internalPlanCode: unknown): MaisEduProductId | null {
  const normalizedCode = String(internalPlanCode || '').trim().toUpperCase()
  return MAISEDU_PRODUCT_BY_INTERNAL_PLAN[
    normalizedCode as keyof typeof MAISEDU_PRODUCT_BY_INTERNAL_PLAN
  ] ?? null
}
