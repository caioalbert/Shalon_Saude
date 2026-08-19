import { AsaasIntegrationError, hasAsaasOverdueSubscriptionPayment } from '@/lib/asaas'
import type { FinanceiroStatus } from '@/lib/types'

type SupabaseLike = {
  from: (table: string) => any
}

export type CadastroComIndicadores = Record<string, unknown> & {
  id: string
  status?: string | null
  asaas_subscription_id?: string | null
  financeiro_status_atualizado_em?: string | null
  dependentes_sem_rg_count: number
  dependentes_sem_email_count: number
  financeiro_status: FinanceiroStatus | null
}

const FINANCEIRO_STATUSES = new Set<FinanceiroStatus>([
  'EM_DIA',
  'EM_ATRASO',
  'ADESAO_NAO_CONCLUIDA',
])

function normalizeFinanceiroStatus(value: unknown): FinanceiroStatus | null {
  const normalized = String(value || '').trim().toUpperCase() as FinanceiroStatus
  return FINANCEIRO_STATUSES.has(normalized) ? normalized : null
}

export async function listCadastrosWithIndicadores(
  supabase: SupabaseLike
): Promise<CadastroComIndicadores[]> {
  const { data: cadastros, error } = await supabase
    .from('cadastros')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  const cadastroRows = (cadastros || []) as Array<Record<string, unknown> & { id: string }>
  const cadastroIds = cadastroRows.map((cadastro) => cadastro.id)
  let dependentesSemRgByCadastroId = new Map<string, number>()
  let dependentesSemEmailByCadastroId = new Map<string, number>()
  const financeiroStatusByCadastroId = new Map<string, FinanceiroStatus>()

  if (cadastroIds.length > 0) {
    const { data: dependentes, error: dependentesError } = await supabase
      .from('dependentes')
      .select('cadastro_id, rg, email')
      .in('cadastro_id', cadastroIds)

    if (dependentesError) {
      console.error('Dependentes lookup error:', dependentesError)
    } else {
      const dependentesRows = (dependentes || []) as Array<{
        cadastro_id: string
        rg?: string | null
        email?: string | null
      }>

      dependentesSemRgByCadastroId = dependentesRows.reduce((acc, dependente) => {
        if (!String(dependente.rg || '').trim()) {
          const current = acc.get(dependente.cadastro_id) || 0
          acc.set(dependente.cadastro_id, current + 1)
        }
        return acc
      }, new Map<string, number>())

      dependentesSemEmailByCadastroId = dependentesRows.reduce((acc, dependente) => {
        if (!String(dependente.email || '').trim()) {
          const current = acc.get(dependente.cadastro_id) || 0
          acc.set(dependente.cadastro_id, current + 1)
        }
        return acc
      }, new Map<string, number>())
    }
  }

  const cadastrosComAssinaturaSemStatus = cadastroRows.filter((cadastro) => {
    const statusCadastro = String(cadastro.status || '').trim().toUpperCase()
    const subscriptionId = String(cadastro.asaas_subscription_id || '').trim()
    const financeiroStatusPersistido = normalizeFinanceiroStatus(cadastro.financeiro_status)

    return statusCadastro === 'ATIVO' && subscriptionId && !financeiroStatusPersistido
  })

  if (cadastrosComAssinaturaSemStatus.length > 0 && process.env.ASAAS_API_KEY?.trim()) {
    await Promise.all(
      cadastrosComAssinaturaSemStatus.map(async (cadastro) => {
        try {
          const subscriptionId = String(cadastro.asaas_subscription_id)
          const hasOverduePayment = await hasAsaasOverdueSubscriptionPayment(
            subscriptionId
          )
          const financeiroStatus: FinanceiroStatus = hasOverduePayment ? 'EM_ATRASO' : 'EM_DIA'
          financeiroStatusByCadastroId.set(cadastro.id, financeiroStatus)

          const { error: updateError } = await supabase
            .from('cadastros')
            .update({
              financeiro_status: financeiroStatus,
              financeiro_status_atualizado_em: new Date().toISOString(),
            })
            .eq('id', cadastro.id)
            .eq('asaas_subscription_id', subscriptionId)

          if (updateError) {
            console.error('Financial status persistence error:', {
              cadastroId: cadastro.id,
              error: updateError,
            })
          }
        } catch (error) {
          if (error instanceof AsaasIntegrationError) {
            console.error('Asaas financial status lookup error:', {
              cadastroId: cadastro.id,
              kind: error.kind,
              status: error.status,
              message: error.message,
            })
            return
          }

          console.error('Asaas financial status lookup unexpected error:', {
            cadastroId: cadastro.id,
            error,
          })
        }
      })
    )
  }

  return cadastroRows.map((cadastro) => {
    const statusCadastro = String(cadastro.status || '').trim().toUpperCase()
    const financeiroStatusAtualizado = financeiroStatusByCadastroId.get(cadastro.id)
    const financeiroStatusPersistido = normalizeFinanceiroStatus(cadastro.financeiro_status)
    const financeiroStatus =
      statusCadastro && statusCadastro !== 'ATIVO'
        ? 'ADESAO_NAO_CONCLUIDA'
        : financeiroStatusAtualizado || financeiroStatusPersistido

    return {
      ...cadastro,
      dependentes_sem_rg_count: dependentesSemRgByCadastroId.get(cadastro.id) || 0,
      dependentes_sem_email_count: dependentesSemEmailByCadastroId.get(cadastro.id) || 0,
      financeiro_status: financeiroStatus,
    }
  })
}
