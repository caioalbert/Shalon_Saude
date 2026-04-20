import {
  BILLING_TYPE_OPTIONS,
  PLAN_TYPE_OPTIONS,
  getBillingSettings,
  updateBillingSettings,
} from '@/lib/billing-settings'
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

export async function GET(request: NextRequest) {
  const authResult = await requireAdminAuth(request)
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const settings = await getBillingSettings()
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
        defaultPlanType: settings.defaultPlanType,
        source: settings.source,
        updatedAt: settings.updatedAt || null,
      },
      allowedBillingTypes: BILLING_TYPE_OPTIONS,
      allowedPlanTypes: PLAN_TYPE_OPTIONS,
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

    const legacyMensalidadeValue = Number(body.mensalidadeValue)

    const updated = await updateBillingSettings({
      mensalidadeIndividualValue: Number(
        body.mensalidadeIndividualValue ?? legacyMensalidadeValue
      ),
      mensalidadeFamiliarValue: Number(
        body.mensalidadeFamiliarValue ?? legacyMensalidadeValue
      ),
      mensalidadeBillingTypes: Array.isArray(body.mensalidadeBillingTypes)
        ? body.mensalidadeBillingTypes
        : [],
      defaultMensalidadeBillingType: String(body.defaultMensalidadeBillingType || ''),
      defaultPlanType: String(body.defaultPlanType || ''),
    })

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
        defaultPlanType: updated.defaultPlanType,
        source: updated.source,
        updatedAt: updated.updatedAt || null,
      },
      allowedBillingTypes: BILLING_TYPE_OPTIONS,
      allowedPlanTypes: PLAN_TYPE_OPTIONS,
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
