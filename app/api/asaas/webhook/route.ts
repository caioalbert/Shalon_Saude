import {
  AsaasIntegrationError,
  createAsaasSubscription,
  getAsaasPayment,
  isAsaasPaidStatus,
} from '@/lib/asaas'
import {
  MIN_ASAAS_CHARGE_VALUE,
  getBillingSettings,
  getMensalidadeValueByPlanType,
} from '@/lib/billing-settings'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

const HANDLED_EVENTS = new Set(['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'])

type AsaasWebhookPayment = {
  id?: string
  customer?: string
  externalReference?: string
  status?: string
}

type AsaasWebhookPayload = {
  event?: string
  payment?: AsaasWebhookPayment
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

async function triggerTermoEmail(cadastroId: string, request: NextRequest) {
  const appBaseUrl = getAppBaseUrl(request)
  const response = await fetch(`${appBaseUrl}/api/enviar-termo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cadastroId }),
    cache: 'no-store',
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    console.error('Webhook: erro ao enviar termo após confirmação de pagamento', {
      cadastroId,
      status: response.status,
      body,
    })
  }
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

    let cadastroResult = await supabase
      .from('cadastros')
      .select(
        'id, status, asaas_customer_id, asaas_payment_id, asaas_subscription_id, tipo_plano, mensalidade_valor, mensalidade_billing_type'
      )
      .eq('asaas_payment_id', paymentId)
      .maybeSingle()

    if (!cadastroResult.data && payload.payment.externalReference) {
      cadastroResult = await supabase
        .from('cadastros')
        .select(
          'id, status, asaas_customer_id, asaas_payment_id, asaas_subscription_id, tipo_plano, mensalidade_valor, mensalidade_billing_type'
        )
        .eq('id', payload.payment.externalReference)
        .maybeSingle()
    }

    if (cadastroResult.error) {
      const details = `${cadastroResult.error.message || ''} ${cadastroResult.error.details || ''}`
      if (
        /asaas_payment_id|asaas_subscription_id|status|adesao_pago_em|mensalidade_billing_type|tipo_plano|mensalidade_valor/i.test(
          details
        )
      ) {
        return NextResponse.json(
          {
            error:
              'Banco desatualizado. Execute scripts/001_create_tables.sql, scripts/004_add_cadastro_pagamentos.sql, scripts/005_add_billing_settings_admin.sql e scripts/006_add_plan_type_pricing.sql.',
          },
          { status: 500 }
        )
      }

      console.error('Webhook: erro ao buscar cadastro', cadastroResult.error)
      return NextResponse.json({ error: 'Erro ao buscar cadastro local.' }, { status: 500 })
    }

    const cadastro = cadastroResult.data
    if (!cadastro) {
      return NextResponse.json({
        received: true,
        ignored: true,
        reason: 'Cadastro local não encontrado para este pagamento.',
      })
    }

    if (cadastro.status === 'ATIVO' && cadastro.asaas_subscription_id) {
      return NextResponse.json({
        received: true,
        processed: true,
        alreadyProcessed: true,
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

    if (cadastro.asaas_customer_id && asaasPayment.customer && cadastro.asaas_customer_id !== asaasPayment.customer) {
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

    let subscriptionId = cadastro.asaas_subscription_id || null
    if (!subscriptionId) {
      if (!cadastro.asaas_customer_id) {
        return NextResponse.json(
          { error: 'Cadastro sem asaas_customer_id. Não é possível criar assinatura.' },
          { status: 500 }
        )
      }

      const billingSettings = await getBillingSettings()
      const billingTypeRequested = String(cadastro.mensalidade_billing_type || '')
        .trim()
        .toUpperCase()
      const billingType = billingSettings.mensalidadeBillingTypes.includes(
        billingTypeRequested as 'PIX' | 'BOLETO' | 'CREDIT_CARD'
      )
        ? (billingTypeRequested as 'PIX' | 'BOLETO' | 'CREDIT_CARD')
        : billingSettings.defaultMensalidadeBillingType
      const storedMensalidadeValue = Number(cadastro.mensalidade_valor)
      const mensalidadeValue =
        Number.isFinite(storedMensalidadeValue) && storedMensalidadeValue > 0
          ? storedMensalidadeValue
          : getMensalidadeValueByPlanType(billingSettings, cadastro.tipo_plano)

      if (mensalidadeValue < MIN_ASAAS_CHARGE_VALUE) {
        return NextResponse.json(
          {
            error: `Configuração de cobrança inválida. O valor mínimo permitido pelo Asaas é R$ ${MIN_ASAAS_CHARGE_VALUE.toFixed(2).replace('.', ',')}.`,
          },
          { status: 500 }
        )
      }

      const nextDueDate = getNextMonthlyDueDate()

      const subscription = await createAsaasSubscription({
        customer: cadastro.asaas_customer_id,
        billingType,
        value: mensalidadeValue,
        nextDueDate,
        cycle: 'MONTHLY',
        description: 'Mensalidade SHALON Saúde',
        externalReference: cadastro.id,
      })

      subscriptionId = subscription.id
    }

    const nowIso = new Date().toISOString()
    const { error: updateError } = await supabase
      .from('cadastros')
      .update({
        status: 'ATIVO',
        adesao_pago_em: nowIso,
        asaas_subscription_id: subscriptionId,
      })
      .eq('id', cadastro.id)

    if (updateError) {
      console.error('Webhook: erro ao atualizar cadastro', updateError)
      return NextResponse.json({ error: 'Erro ao ativar cadastro.' }, { status: 500 })
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
    })
  } catch (error) {
    if (error instanceof AsaasIntegrationError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    console.error('Webhook Asaas error:', error)
    return NextResponse.json({ error: 'Erro ao processar webhook Asaas.' }, { status: 500 })
  }
}
