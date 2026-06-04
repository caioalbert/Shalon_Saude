import { createClient } from '@/lib/supabase/server'

const MIN_DEPENDENTES_FAMILIAR = 2
const VALOR_POR_VIDA_EXCEDENTE = 24.90

type PlanPricing = {
  baseValue: number
  minDependentes: number
  valorPorVidaExcedente: number
  totalVidas: number
  totalValue: number
}

/**
 * Calcula o valor da assinatura baseado no plano e número de dependentes
 * 
 * Regras:
 * - Plano individual: valor fixo, sem dependentes
 * - Plano familiar: 
 *   - Mínimo de 2 dependentes (3 vidas: titular + 2 dependentes)
 *   - Cliente paga pelo mínimo mesmo que tenha menos dependentes
 *   - Se ultrapassar o mínimo, paga valor excedente por vida adicional
 */
export async function calculateSubscriptionValue(
  cadastroId: string,
  dependentesCount: number
): Promise<PlanPricing | null> {
  const supabase = await createClient()

  const { data: cadastro, error } = await supabase
    .from('cadastros')
    .select('tipo_plano, mensalidade_valor')
    .eq('id', cadastroId)
    .single()

  if (error || !cadastro) {
    return null
  }

  const isIndividual = cadastro.tipo_plano === 'INDIVIDUAL'
  
  if (isIndividual) {
    return {
      baseValue: cadastro.mensalidade_valor || 0,
      minDependentes: 0,
      valorPorVidaExcedente: 0,
      totalVidas: 1,
      totalValue: cadastro.mensalidade_valor || 0,
    }
  }

  // Plano Familiar
  const baseValue = cadastro.mensalidade_valor || 0
  const totalVidas = 1 + dependentesCount // titular + dependentes
  const vidasMinimas = 1 + MIN_DEPENDENTES_FAMILIAR // 3 vidas
  
  // Paga pelo mínimo de vidas, mesmo que tenha menos
  const vidasCobradas = Math.max(totalVidas, vidasMinimas)
  
  // Se ultrapassar o mínimo, cobra excedente
  const vidasExcedentes = Math.max(0, totalVidas - vidasMinimas)
  const valorExcedente = vidasExcedentes * VALOR_POR_VIDA_EXCEDENTE
  
  const totalValue = baseValue + valorExcedente

  return {
    baseValue,
    minDependentes: MIN_DEPENDENTES_FAMILIAR,
    valorPorVidaExcedente: VALOR_POR_VIDA_EXCEDENTE,
    totalVidas: vidasCobradas,
    totalValue,
  }
}
