import { MIN_ASAAS_CHARGE_VALUE } from '@/lib/billing-settings'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminAuth } from '@/lib/supabase/admin-auth'
import { NextRequest, NextResponse } from 'next/server'

type RouteContext = { params: Promise<{ id: string }> }

function mapDatabaseErrorMessage(error: unknown) {
  const details = (() => {
    if (error instanceof Error) return error.message

    if (error && typeof error === 'object') {
      const maybePostgrestError = error as {
        message?: string
        details?: string
        hint?: string
        code?: string
      }

      return `${maybePostgrestError.message || ''} ${maybePostgrestError.details || ''} ${maybePostgrestError.hint || ''} ${maybePostgrestError.code || ''}`
    }

    return String(error)
  })()

  if (/relation .*planos|does not exist|42P01/i.test(details)) {
    return 'Banco desatualizado. Execute scripts/009_add_planos_module.sql no Supabase SQL Editor.'
  }

  if (/relation .*cobranca_configuracoes|does not exist|42P01/i.test(details)) {
    return 'Banco desatualizado. Execute scripts/005_add_billing_settings_admin.sql e scripts/006_add_plan_type_pricing.sql no Supabase SQL Editor.'
  }

  if (/fetch failed|enotfound|getaddrinfo|network/i.test(details)) {
    return 'Falha ao conectar no Supabase. Verifique NEXT_PUBLIC_SUPABASE_URL e as chaves no arquivo .env/.env.local.'
  }

  return null
}

async function getValidatedId(context: RouteContext) {
  const { id } = await context.params
  return id?.trim() || null
}

async function syncBasePlanValueToBilling(
  supabase: ReturnType<typeof createAdminClient>,
  planCode: string,
  planValue: number
) {
  if (planCode !== 'INDIVIDUAL' && planCode !== 'FAMILIAR') {
    return
  }

  const { data: row, error } = await supabase
    .from('cobranca_configuracoes')
    .select(
      'id, adesao_value, mensalidade_value, mensalidade_individual_value, mensalidade_familiar_value, default_plan_type'
    )
    .eq('id', true)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!row) {
    return
  }

  const currentDefaultPlanType = String(row.default_plan_type || 'INDIVIDUAL').trim().toUpperCase()

  const nextIndividualValue =
    planCode === 'INDIVIDUAL' ? planValue : Number(row.mensalidade_individual_value || row.mensalidade_value || row.adesao_value || 49.9)

  const nextFamiliarValue =
    planCode === 'FAMILIAR' ? planValue : Number(row.mensalidade_familiar_value || row.mensalidade_value || row.adesao_value || 79.9)

  const defaultPlanValue = currentDefaultPlanType === 'FAMILIAR' ? nextFamiliarValue : nextIndividualValue

  const { error: updateError } = await supabase
    .from('cobranca_configuracoes')
    .update({
      mensalidade_individual_value: nextIndividualValue,
      mensalidade_familiar_value: nextFamiliarValue,
      mensalidade_value: defaultPlanValue,
      adesao_value: defaultPlanValue,
      updated_at: new Date().toISOString(),
    })
    .eq('id', true)

  if (updateError) {
    throw updateError
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const authResult = await requireAdminAuth(request)
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const planId = await getValidatedId(context)
    if (!planId) {
      return NextResponse.json({ error: 'ID de plano inválido.' }, { status: 400 })
    }

    const body = (await request.json().catch(() => null)) as
      | {
          nome?: string
          valor?: number | string
          ativo?: boolean
        }
      | null

    if (!body) {
      return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })
    }

    const nome =
      body.nome === undefined
        ? undefined
        : String(body.nome || '').trim()

    const hasValorField = body.valor !== undefined
    const valor = hasValorField ? Number(body.valor) : undefined

    if (nome !== undefined && !nome) {
      return NextResponse.json({ error: 'Nome do plano é obrigatório.' }, { status: 400 })
    }

    if (hasValorField) {
      if (!Number.isFinite(valor) || Number(valor) < MIN_ASAAS_CHARGE_VALUE) {
        return NextResponse.json(
          {
            error: `Valor inválido. O mínimo permitido pelo Asaas é R$ ${MIN_ASAAS_CHARGE_VALUE.toFixed(2).replace('.', ',')}.`,
          },
          { status: 400 }
        )
      }
    }

    if (nome === undefined && !hasValorField && typeof body.ativo !== 'boolean') {
      return NextResponse.json({ error: 'Nenhum campo para atualizar.' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: currentPlan, error: currentPlanError } = await supabase
      .from('planos')
      .select('id, codigo, nome, valor, ativo, ordem, created_at, updated_at')
      .eq('id', planId)
      .maybeSingle()

    if (currentPlanError) {
      throw currentPlanError
    }

    if (!currentPlan) {
      return NextResponse.json({ error: 'Plano não encontrado.' }, { status: 404 })
    }

    const payload: {
      nome?: string
      valor?: number
      ativo?: boolean
      updated_at: string
    } = {
      updated_at: new Date().toISOString(),
    }

    if (nome !== undefined) payload.nome = nome
    if (hasValorField && valor !== undefined) payload.valor = valor
    if (typeof body.ativo === 'boolean') payload.ativo = body.ativo

    const { data: updatedPlan, error: updateError } = await supabase
      .from('planos')
      .update(payload)
      .eq('id', planId)
      .select('id, codigo, nome, valor, ativo, ordem, created_at, updated_at')
      .single()

    if (updateError) {
      throw updateError
    }

    if (hasValorField && valor !== undefined) {
      await syncBasePlanValueToBilling(supabase, String(updatedPlan.codigo || ''), valor)
    }

    return NextResponse.json({
      success: true,
      message: 'Plano atualizado com sucesso.',
      plano: updatedPlan,
    })
  } catch (error) {
    const mappedMessage = mapDatabaseErrorMessage(error)
    if (mappedMessage) {
      return NextResponse.json({ error: mappedMessage }, { status: 500 })
    }

    console.error('Admin planos PATCH error:', error)
    return NextResponse.json({ error: 'Erro ao atualizar plano.' }, { status: 500 })
  }
}
