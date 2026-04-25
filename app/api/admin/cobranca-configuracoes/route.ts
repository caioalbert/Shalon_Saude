import {
  BILLING_TYPE_OPTIONS,
  MIN_ASAAS_CHARGE_VALUE,
  PLAN_TYPE_OPTIONS,
  getBillingSettings,
  updateBillingSettings,
} from '@/lib/billing-settings'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminAuth } from '@/lib/supabase/admin-auth'
import { NextRequest, NextResponse } from 'next/server'

function mapDatabaseErrorMessage(error: unknown) {
  const details = error instanceof Error ? error.message : String(error)
  if (/relation .*cobranca_configuracoes|does not exist|42P01/i.test(details)) {
    return 'Banco desatualizado. Execute scripts/005_add_billing_settings_admin.sql no Supabase SQL Editor.'
  }

  if (/mensalidade_individual_value|mensalidade_familiar_value|default_plan_type|tipo_plano|mensalidade_valor/i.test(details)) {
    return 'Banco desatualizado. Execute scripts/006_add_plan_type_pricing.sql no Supabase SQL Editor.'
  }

  if (/fetch failed|enotfound|getaddrinfo|network/i.test(details)) {
    return 'Falha ao conectar no Supabase. Verifique NEXT_PUBLIC_SUPABASE_URL e as chaves no arquivo .env/.env.local.'
  }

  return null
}

function normalizePlanCode(value: unknown) {
  return String(value || '')
    .trim()
    .toUpperCase()
}

async function loadPlanCodesForDefaultSelection() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('planos')
      .select('codigo, ordem, created_at')
      .order('ordem', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      throw error
    }

    const codes = Array.from(
      new Set(
        (data || [])
          .map((row) => normalizePlanCode(row.codigo))
          .filter(Boolean)
      )
    )

    return codes.length > 0 ? codes : [...PLAN_TYPE_OPTIONS]
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error)
    if (/relation .*planos|does not exist|42P01/i.test(details)) {
      return [...PLAN_TYPE_OPTIONS]
    }
    throw error
  }
}

export async function GET(request: NextRequest) {
  const authResult = await requireAdminAuth(request)
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const settings = await getBillingSettings()
    const allowedPlanTypes = await loadPlanCodesForDefaultSelection()
    const defaultPlanType = allowedPlanTypes.includes(settings.defaultPlanType)
      ? settings.defaultPlanType
      : (allowedPlanTypes[0] || settings.defaultPlanType)

    return NextResponse.json({
      success: true,
      settings: {
        adesaoValue: settings.adesaoValue,
        adesaoByPlanType: settings.adesaoByPlanType,
        mensalidadeValue: settings.mensalidadeValue,
        mensalidadeByPlanType: settings.mensalidadeByPlanType,
        mensalidadeIndividualValue: settings.mensalidadeIndividualValue,
        mensalidadeFamiliarValue: settings.mensalidadeFamiliarValue,
        mensalidadeBillingTypes: settings.mensalidadeBillingTypes,
        defaultMensalidadeBillingType: settings.defaultMensalidadeBillingType,
        defaultPlanType,
        source: settings.source,
        updatedAt: settings.updatedAt || null,
      },
      allowedBillingTypes: BILLING_TYPE_OPTIONS,
      allowedPlanTypes,
    })
  } catch (error) {
    const mappedMessage = mapDatabaseErrorMessage(error)
    if (mappedMessage) {
      return NextResponse.json({ error: mappedMessage }, { status: 500 })
    }

    console.error('Admin billing settings GET error:', error)
    return NextResponse.json({ error: 'Erro ao buscar configurações de cobrança.' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await requireAdminAuth(request)
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = (await request.json().catch(() => null)) as
      | {
          adesaoValue?: number | string
          mensalidadeValue?: number | string
          mensalidadeIndividualValue?: number | string
          mensalidadeFamiliarValue?: number | string
          mensalidadeBillingTypes?: string[]
          defaultMensalidadeBillingType?: string
          defaultPlanType?: string
        }
      | null

    if (!body) {
      return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })
    }

    const currentSettings = await getBillingSettings()
    const legacyMensalidadeValue =
      body.mensalidadeValue === undefined || body.mensalidadeValue === null
        ? currentSettings.mensalidadeValue
        : Number(body.mensalidadeValue)
    const mensalidadeIndividualValue = Number(
      body.mensalidadeIndividualValue ?? legacyMensalidadeValue ?? currentSettings.mensalidadeIndividualValue
    )
    const mensalidadeFamiliarValue = Number(
      body.mensalidadeFamiliarValue ?? legacyMensalidadeValue ?? currentSettings.mensalidadeFamiliarValue
    )

    if (
      !Number.isFinite(mensalidadeIndividualValue) ||
      !Number.isFinite(mensalidadeFamiliarValue)
    ) {
      return NextResponse.json(
        { error: 'Informe valores numéricos válidos para os planos.' },
        { status: 400 }
      )
    }

    if (
      mensalidadeIndividualValue < MIN_ASAAS_CHARGE_VALUE ||
      mensalidadeFamiliarValue < MIN_ASAAS_CHARGE_VALUE
    ) {
      return NextResponse.json(
        {
          error: `O valor mínimo permitido pelo Asaas é R$ ${MIN_ASAAS_CHARGE_VALUE.toFixed(2).replace('.', ',')} para adesão e mensalidade.`,
        },
        { status: 400 }
      )
    }

    const updated = await updateBillingSettings({
      mensalidadeIndividualValue,
      mensalidadeFamiliarValue,
      mensalidadeBillingTypes: Array.isArray(body.mensalidadeBillingTypes)
        ? body.mensalidadeBillingTypes
        : currentSettings.mensalidadeBillingTypes,
      defaultMensalidadeBillingType: String(
        body.defaultMensalidadeBillingType || currentSettings.defaultMensalidadeBillingType
      ),
      defaultPlanType: String(body.defaultPlanType || currentSettings.defaultPlanType),
    })
    const allowedPlanTypes = await loadPlanCodesForDefaultSelection()
    const defaultPlanType = allowedPlanTypes.includes(updated.defaultPlanType)
      ? updated.defaultPlanType
      : (allowedPlanTypes[0] || updated.defaultPlanType)

    return NextResponse.json({
      success: true,
      message: 'Configurações de cobrança atualizadas com sucesso.',
      settings: {
        adesaoValue: updated.adesaoValue,
        adesaoByPlanType: updated.adesaoByPlanType,
        mensalidadeValue: updated.mensalidadeValue,
        mensalidadeByPlanType: updated.mensalidadeByPlanType,
        mensalidadeIndividualValue: updated.mensalidadeIndividualValue,
        mensalidadeFamiliarValue: updated.mensalidadeFamiliarValue,
        mensalidadeBillingTypes: updated.mensalidadeBillingTypes,
        defaultMensalidadeBillingType: updated.defaultMensalidadeBillingType,
        defaultPlanType,
        source: updated.source,
        updatedAt: updated.updatedAt || null,
      },
      allowedBillingTypes: BILLING_TYPE_OPTIONS,
      allowedPlanTypes,
    })
  } catch (error) {
    const mappedMessage = mapDatabaseErrorMessage(error)
    if (mappedMessage) {
      return NextResponse.json({ error: mappedMessage }, { status: 500 })
    }

    const details = error instanceof Error ? error.message : String(error)
    if (/valor inválido|inválido/i.test(details)) {
      return NextResponse.json({ error: details }, { status: 400 })
    }

    console.error('Admin billing settings PUT error:', error)
    return NextResponse.json({ error: 'Erro ao salvar configurações de cobrança.' }, { status: 500 })
  }
}
