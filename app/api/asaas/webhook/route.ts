import {
  AsaasIntegrationError,
  cancelAsaasSubscription,
  createAsaasSubscription,
  getAsaasPayment,
  hasAsaasOverdueSubscriptionPayment,
  isAsaasPaidStatus,
  listAsaasSubscriptions,
} from '@/lib/asaas'
import {
  MIN_ASAAS_CHARGE_VALUE,
  getBillingSettings,
  getMensalidadeValueByPlanType,
} from '@/lib/billing-settings'
import { createAdminClient } from '@/lib/supabase/admin'
import type { FinanceiroStatus } from '@/lib/types'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const ACTIVATION_EVENTS = new Set(['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'])
const FINANCIAL_STATUS_EVENTS = new Set([
  'PAYMENT_RECEIVED',
  'PAYMENT_CONFIRMED',
  'PAYMENT_OVERDUE',
  'PAYMENT_RESTORED',
  'PAYMENT_UPDATED',
  'PAYMENT_DELETED',
  'PAYMENT_REFUNDED',
  'PAYMENT_PARTIALLY_REFUNDED',
  'PAYMENT_RECEIVED_IN_CASH_UNDONE',
])
const HANDLED_EVENTS = new Set([...ACTIVATION_EVENTS, ...FINANCIAL_STATUS_EVENTS])
const SUBSCRIPTION_LOCK_PREFIX = 'LOCK:'
const SUBSCRIPTION_LOCK_TTL_MS = 10 * 60 * 1000
const FIDELIDADE_MAX_PAYMENTS = 12

const CADASTRO_SELECT_FIELDS =
  'id, status, financeiro_status, financeiro_status_atualizado_em, asaas_customer_id, asaas_payment_id, asaas_subscription_id, tipo_plano, mensalidade_valor, mensalidade_billing_type, updated_at'

type AsaasWebhookPayment = {
  id?: string
  customer?: string
  subscription?: string
  externalReference?: string
  status?: string
}

type AsaasWebhookPayload = {
  event?: string
  payment?: AsaasWebhookPayment
}

type CadastroWebhookRecord = {
  id: string
  status: string | null
  financeiro_status: FinanceiroStatus | null
  financeiro_status_atualizado_em: string | null
  asaas_customer_id: string | null
  asaas_payment_id: string | null
  asaas_subscription_id: string | null
  tipo_plano: string | null
  mensalidade_valor: number | null
  mensalidade_billing_type: string | null
  updated_at: string | null
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function getAppBaseUrl(request: NextRequest) {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (envUrl) return envUrl.replace(/\/$/, '')
  return request.nextUrl.origin
}

function getWebhookTokenFromRequest(request: NextRequest) {
  const accessTokenHeader = request.headers.get('asaas-access-token')?.trim()
  if (accessTokenHeader) return accessTokenHeader

  const alternateHeader = request.headers.get('x-asaas-access-token')?.trim()
  if (alternateHeader) return alternateHeader

  const auth = request.headers.get('authorization')?.trim()
  if (auth?.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim()
  }

  return ''
}

function getRequiredEnvToken(name: string) {
  const token = process.env[name]?.trim()
  if (!token) {
    throw new AsaasIntegrationError(
      `Webhook Asaas indisponível. Configure ${name}.`,
      'configuration',
      503
    )
  }

  return token
}

function getNextMonthlyDueDate(baseDate: Date = new Date()) {
  const next = new Date(baseDate)
  next.setMonth(next.getMonth() + 1)
  return toIsoDate(next)
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isSchemaIssue(details: string) {
  return /asaas_payment_id|asaas_subscription_id|financeiro_status|financeiro_status_atualizado_em|status|adesao_pago_em|mensalidade_billing_type|tipo_plano|mensalidade_valor|updated_at/i.test(
    details
  )
}

function isSubscriptionLockToken(subscriptionId: string | null | undefined) {
  return String(subscriptionId || '').trim().startsWith(SUBSCRIPTION_LOCK_PREFIX)
}

function createSubscriptionLockToken(paymentId: string) {
  return `${SUBSCRIPTION_LOCK_PREFIX}${Date.now()}:${paymentId}:${crypto.randomUUID()}`
}

function getSubscriptionLockTimestamp(lockToken: string) {
  if (!isSubscriptionLockToken(lockToken)) return null

  const [, timestampPart] = lockToken.split(':')
  const timestamp = Number(timestampPart)
  if (!Number.isFinite(timestamp)) return null

  return timestamp
}

function isSubscriptionLockStale(lockToken: string, now = Date.now()) {
  const lockTimestamp = getSubscriptionLockTimestamp(lockToken)
  if (lockTimestamp === null) return true
  return now - lockTimestamp > SUBSCRIPTION_LOCK_TTL_MS
}

function normalizeSubscriptionId(value: string | null | undefined) {
  return String(value || '').trim()
}

async function fetchCadastroByPaymentReference(
  supabase: ReturnType<typeof createAdminClient>,
  paymentId: string,
  externalReference?: string,
  subscriptionId?: string
) {
  const initialResult = await supabase
    .from('cadastros')
    .select(CADASTRO_SELECT_FIELDS)
    .eq('asaas_payment_id', paymentId)
    .maybeSingle<CadastroWebhookRecord>()

  if (initialResult.data || initialResult.error) {
    return initialResult
  }

  const normalizedExternalReference = String(externalReference || '').trim()
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalizedExternalReference)) {
    const externalReferenceResult = await supabase
      .from('cadastros')
      .select(CADASTRO_SELECT_FIELDS)
      .eq('id', normalizedExternalReference)
      .maybeSingle<CadastroWebhookRecord>()

    if (externalReferenceResult.data || externalReferenceResult.error) {
      return externalReferenceResult
    }
  }

  const normalizedSubscriptionId = normalizeSubscriptionId(subscriptionId)
  if (normalizedSubscriptionId) {
    return supabase
      .from('cadastros')
      .select(CADASTRO_SELECT_FIELDS)
      .eq('asaas_subscription_id', normalizedSubscriptionId)
      .maybeSingle<CadastroWebhookRecord>()
  }

  return initialResult
}

async function fetchCadastroById(supabase: ReturnType<typeof createAdminClient>, cadastroId: string) {
  return supabase
    .from('cadastros')
    .select(CADASTRO_SELECT_FIELDS)
    .eq('id', cadastroId)
    .maybeSingle<CadastroWebhookRecord>()
}

async function reconcileFinanceiroStatus(
  supabase: ReturnType<typeof createAdminClient>,
  cadastroId: string,
  subscriptionId: string
): Promise<FinanceiroStatus> {
  const hasOverduePayment = await hasAsaasOverdueSubscriptionPayment(subscriptionId)
  const financeiroStatus: FinanceiroStatus = hasOverduePayment ? 'EM_ATRASO' : 'EM_DIA'
  const { error } = await supabase
    .from('cadastros')
    .update({
      financeiro_status: financeiroStatus,
      financeiro_status_atualizado_em: new Date().toISOString(),
    })
    .eq('id', cadastroId)
    .eq('asaas_subscription_id', subscriptionId)

  if (error) {
    console.error('Webhook: erro ao persistir status financeiro', {
      cadastroId,
      subscriptionId,
      financeiroStatus,
      error,
    })
    throw new Error('Erro ao atualizar o status financeiro do contrato.')
  }

  return financeiroStatus
}

async function releaseSubscriptionLock(
  supabase: ReturnType<typeof createAdminClient>,
  cadastroId: string,
  lockToken: string
) {
  const { error } = await supabase
    .from('cadastros')
    .update({ asaas_subscription_id: null })
    .eq('id', cadastroId)
    .eq('asaas_subscription_id', lockToken)

  if (error) {
    console.error('Webhook: falha ao liberar lock da assinatura', {
      cadastroId,
      lockToken,
      error,
    })
  }
}

async function findAsaasSubscriptionByExternalReference(
  cadastroId: string,
  asaasCustomerId: string
): Promise<string | null> {
  const subscriptions = await listAsaasSubscriptions({
    customer: asaasCustomerId,
    externalReference: cadastroId,
    limit: 100,
  })

  const activeSubscription = subscriptions.find((subscription) => {
    const status = String(subscription.status || '').trim().toUpperCase()
    return status === 'ACTIVE' || status === 'INACTIVE'
  })

  const candidate = activeSubscription || subscriptions[0]
  const id = normalizeSubscriptionId(candidate?.id)
  return id || null
}

async function triggerTermoEmail(cadastroId: string, request: NextRequest) {
  const appBaseUrl = getAppBaseUrl(request)
  let lastErrorMessage = ''

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(`${appBaseUrl}/api/enviar-termo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cadastroId }),
        cache: 'no-store',
      })

      if (response.ok) {
        return
      }

      const body = await response.text().catch(() => '')
      lastErrorMessage = `status=${response.status} body=${body || 'sem corpo'}`
    } catch (error) {
      lastErrorMessage = error instanceof Error ? error.message : String(error)
    }

    if (attempt < 3) {
      await wait(attempt * 500)
    }
  }

  throw new Error(
    `Falha ao enviar termo após confirmação de pagamento para cadastro ${cadastroId}. ${lastErrorMessage}`
  )
}

export async function POST(request: NextRequest) {
  try {
    const expectedToken = getRequiredEnvToken('ASAAS_WEBHOOK_TOKEN')
    const providedToken = getWebhookTokenFromRequest(request)

    if (!providedToken || providedToken !== expectedToken) {
      return NextResponse.json({ error: 'Webhook token inválido.' }, { status: 401 })
    }

    const payload = (await request.json().catch(() => null)) as AsaasWebhookPayload | null
    if (!payload?.event || !payload.payment?.id) {
      return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })
    }

    if (!HANDLED_EVENTS.has(payload.event)) {
      return NextResponse.json({
        received: true,
        ignored: true,
        reason: `Evento ${payload.event} não é tratado por esta rota.`,
      })
    }

    const paymentId = payload.payment.id
    const supabase = createAdminClient()

    const cadastroResult = await fetchCadastroByPaymentReference(
      supabase,
      paymentId,
      payload.payment.externalReference,
      payload.payment.subscription
    )

    if (cadastroResult.error) {
      const details = `${cadastroResult.error.message || ''} ${cadastroResult.error.details || ''}`
      if (isSchemaIssue(details)) {
        return NextResponse.json(
          {
            error:
              'Banco desatualizado. Execute scripts/001_create_tables.sql ou a migration scripts/021_add_financeiro_status.sql.',
          },
          { status: 500 }
        )
      }

      console.error('Webhook: erro ao buscar cadastro', cadastroResult.error)
      return NextResponse.json({ error: 'Erro ao buscar cliente local.' }, { status: 500 })
    }

    const cadastro = cadastroResult.data
    if (!cadastro) {
      return NextResponse.json({
        received: true,
        ignored: true,
        reason: 'Cliente local não encontrado para este pagamento.',
      })
    }

    const initialSubscriptionId = normalizeSubscriptionId(cadastro.asaas_subscription_id)
    const webhookSubscriptionId = normalizeSubscriptionId(payload.payment.subscription)

    if (
      cadastro.asaas_customer_id &&
      payload.payment.customer &&
      cadastro.asaas_customer_id !== payload.payment.customer
    ) {
      console.error('Webhook: customer mismatch', {
        cadastroId: cadastro.id,
        cadastroCustomerId: cadastro.asaas_customer_id,
        paymentCustomerId: payload.payment.customer,
      })
      return NextResponse.json(
        { error: 'Pagamento não corresponde ao cliente esperado.' },
        { status: 409 }
      )
    }

    if (
      cadastro.status === 'ATIVO' &&
      initialSubscriptionId &&
      !isSubscriptionLockToken(initialSubscriptionId)
    ) {
      if (webhookSubscriptionId && webhookSubscriptionId !== initialSubscriptionId) {
        console.error('Webhook: subscription mismatch', {
          cadastroId: cadastro.id,
          cadastroSubscriptionId: initialSubscriptionId,
          paymentSubscriptionId: webhookSubscriptionId,
        })
        return NextResponse.json(
          { error: 'Pagamento não corresponde à assinatura esperada.' },
          { status: 409 }
        )
      }

      const financeiroStatus = await reconcileFinanceiroStatus(
        supabase,
        cadastro.id,
        initialSubscriptionId
      )

      return NextResponse.json({
        received: true,
        processed: true,
        alreadyProcessed: true,
        cadastroId: cadastro.id,
        financeiroStatus,
      })
    }

    if (!ACTIVATION_EVENTS.has(payload.event)) {
      return NextResponse.json({
        received: true,
        ignored: true,
        reason: 'O cadastro ainda não possui uma assinatura ativa para reconciliar.',
      })
    }

    const asaasPayment = await getAsaasPayment(paymentId)
    if (!isAsaasPaidStatus(asaasPayment.status)) {
      return NextResponse.json({
        received: true,
        ignored: true,
        reason: `Pagamento ainda não confirmado no Asaas (status: ${asaasPayment.status || 'desconhecido'}).`,
      })
    }

    if (
      cadastro.asaas_customer_id &&
      asaasPayment.customer &&
      cadastro.asaas_customer_id !== asaasPayment.customer
    ) {
      console.error('Webhook: customer mismatch', {
        cadastroId: cadastro.id,
        cadastroCustomerId: cadastro.asaas_customer_id,
        paymentCustomerId: asaasPayment.customer,
      })
      return NextResponse.json(
        { error: 'Pagamento não corresponde ao cliente esperado.' },
        { status: 409 }
      )
    }

    let lockToken: string | null = null
    let subscriptionId = normalizeSubscriptionId(cadastro.asaas_subscription_id)
    let createdNewSubscription = false

    if (!subscriptionId || isSubscriptionLockToken(subscriptionId)) {
      if (!cadastro.asaas_customer_id) {
        return NextResponse.json(
          { error: 'Cliente sem asaas_customer_id. Não é possível criar assinatura.' },
          { status: 500 }
        )
      }

      const currentLockToken = isSubscriptionLockToken(subscriptionId) ? subscriptionId : null
      if (currentLockToken && !isSubscriptionLockStale(currentLockToken)) {
        return NextResponse.json(
          { error: 'Ativação já está sendo processada para este pagamento.' },
          { status: 409 }
        )
      }

      const newLockToken = createSubscriptionLockToken(paymentId)
      let lockUpdateQuery = supabase
        .from('cadastros')
        .update({ asaas_subscription_id: newLockToken })
        .eq('id', cadastro.id)

      if (currentLockToken) {
        lockUpdateQuery = lockUpdateQuery.eq('asaas_subscription_id', currentLockToken)
      } else {
        lockUpdateQuery = lockUpdateQuery.is('asaas_subscription_id', null)
      }

      const { data: lockData, error: lockError } = await lockUpdateQuery
        .select('id')
        .maybeSingle<{ id: string }>()

      if (lockError) {
        console.error('Webhook: erro ao adquirir lock de assinatura', lockError)
        return NextResponse.json(
          { error: 'Erro ao reservar processamento de assinatura.' },
          { status: 500 }
        )
      }

      if (!lockData) {
        const refreshedCadastroResult = await fetchCadastroById(supabase, cadastro.id)
        if (refreshedCadastroResult.error) {
          console.error('Webhook: erro ao recarregar cadastro após lock concorrente', refreshedCadastroResult.error)
          return NextResponse.json(
            { error: 'Erro ao validar processamento concorrente da assinatura.' },
            { status: 500 }
          )
        }

        const refreshedCadastro = refreshedCadastroResult.data
        const refreshedSubscriptionId = normalizeSubscriptionId(refreshedCadastro?.asaas_subscription_id)

        if (
          refreshedCadastro &&
          refreshedCadastro.status === 'ATIVO' &&
          refreshedSubscriptionId &&
          !isSubscriptionLockToken(refreshedSubscriptionId)
        ) {
          const financeiroStatus = await reconcileFinanceiroStatus(
            supabase,
            refreshedCadastro.id,
            refreshedSubscriptionId
          )

          return NextResponse.json({
            received: true,
            processed: true,
            alreadyProcessed: true,
            asaasSubscriptionId: refreshedSubscriptionId,
            financeiroStatus,
          })
        }

        return NextResponse.json(
          { error: 'Ativação já está sendo processada para este pagamento.' },
          { status: 409 }
        )
      }

      lockToken = newLockToken

      const billingSettings = await getBillingSettings()
      const billingTypeRequested = String(cadastro.mensalidade_billing_type || '')
        .trim()
        .toUpperCase()
      const billingType = billingTypeRequested === 'CREDIT_CARD' ? 'CREDIT_CARD' : 'BOLETO'
      const storedMensalidadeValue = Number(cadastro.mensalidade_valor)
      const mensalidadeValue =
        Number.isFinite(storedMensalidadeValue) && storedMensalidadeValue > 0
          ? storedMensalidadeValue
          : getMensalidadeValueByPlanType(billingSettings, cadastro.tipo_plano)

      if (mensalidadeValue < MIN_ASAAS_CHARGE_VALUE) {
        await releaseSubscriptionLock(supabase, cadastro.id, newLockToken)
        return NextResponse.json(
          {
            error: `Configuração de cobrança inválida. O valor mínimo permitido pelo Asaas é R$ ${MIN_ASAAS_CHARGE_VALUE.toFixed(2).replace('.', ',')}.`,
          },
          { status: 500 }
        )
      }

      const alreadyExistingSubscriptionId = await findAsaasSubscriptionByExternalReference(
        cadastro.id,
        cadastro.asaas_customer_id
      )

      if (alreadyExistingSubscriptionId) {
        subscriptionId = alreadyExistingSubscriptionId
      } else {
        const nextDueDate = getNextMonthlyDueDate()

        try {
          const subscription = await createAsaasSubscription({
            customer: cadastro.asaas_customer_id,
            billingType,
            value: mensalidadeValue,
            nextDueDate,
            cycle: 'MONTHLY',
            maxPayments: FIDELIDADE_MAX_PAYMENTS,
            description: 'Mensalidade SHALOM Saúde',
            externalReference: cadastro.id,
          })

          subscriptionId = subscription.id
          createdNewSubscription = true
        } catch (error) {
          await releaseSubscriptionLock(supabase, cadastro.id, newLockToken)
          throw error
        }
      }

      const nowIso = new Date().toISOString()
      const { data: updatedCadastro, error: updateError } = await supabase
        .from('cadastros')
        .update({
          status: 'ATIVO',
          financeiro_status: 'EM_DIA',
          financeiro_status_atualizado_em: nowIso,
          adesao_pago_em: nowIso,
          asaas_subscription_id: subscriptionId,
        })
        .eq('id', cadastro.id)
        .eq('asaas_subscription_id', newLockToken)
        .select('id')
        .maybeSingle<{ id: string }>()

      if (updateError || !updatedCadastro) {
        if (createdNewSubscription && subscriptionId) {
          try {
            await cancelAsaasSubscription(subscriptionId)
          } catch (rollbackError) {
            console.error('Webhook: falha ao cancelar assinatura após erro de persistência', {
              cadastroId: cadastro.id,
              subscriptionId,
              rollbackError,
            })
          }
        }

        await releaseSubscriptionLock(supabase, cadastro.id, newLockToken)

        console.error('Webhook: erro ao atualizar cadastro após criar assinatura', updateError)
        return NextResponse.json({ error: 'Erro ao ativar cliente.' }, { status: 500 })
      }
    } else {
      const nowIso = new Date().toISOString()
      const { error: updateError } = await supabase
        .from('cadastros')
        .update({
          status: 'ATIVO',
          financeiro_status: 'EM_DIA',
          financeiro_status_atualizado_em: nowIso,
          adesao_pago_em: nowIso,
          asaas_subscription_id: subscriptionId,
        })
        .eq('id', cadastro.id)

      if (updateError) {
        console.error('Webhook: erro ao atualizar cadastro com assinatura existente', updateError)
        return NextResponse.json({ error: 'Erro ao ativar cliente.' }, { status: 500 })
      }
    }

    try {
      await triggerTermoEmail(cadastro.id, request)
    } catch (error) {
      console.error('Webhook: falha ao enviar termo após ativação', {
        cadastroId: cadastro.id,
        error,
      })
    }

    return NextResponse.json({
      received: true,
      processed: true,
      cadastroId: cadastro.id,
      asaasPaymentId: paymentId,
      asaasSubscriptionId: subscriptionId,
      lockUsed: Boolean(lockToken),
    })
  } catch (error) {
    if (error instanceof AsaasIntegrationError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    console.error('Webhook Asaas error:', error)
    return NextResponse.json({ error: 'Erro ao processar webhook Asaas.' }, { status: 500 })
  }
}
