import { BILLING_TYPE_OPTIONS, getBillingSettings, updateBillingSettings } from '@/lib/billing-settings'
import { requireAdminAuth } from '@/lib/supabase/admin-auth'
import { NextRequest, NextResponse } from 'next/server'

function mapDatabaseErrorMessage(error: unknown) {
  const details = error instanceof Error ? error.message : String(error)
  if (/relation .*cobranca_configuracoes|does not exist|42P01/i.test(details)) {
    return 'Banco desatualizado. Execute scripts/005_add_billing_settings_admin.sql no Supabase SQL Editor.'
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
        mensalidadeValue: settings.mensalidadeValue,
        mensalidadeBillingTypes: settings.mensalidadeBillingTypes,
        defaultMensalidadeBillingType: settings.defaultMensalidadeBillingType,
        source: settings.source,
        updatedAt: settings.updatedAt || null,
      },
      allowedBillingTypes: BILLING_TYPE_OPTIONS,
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
          mensalidadeBillingTypes?: string[]
          defaultMensalidadeBillingType?: string
        }
      | null

    if (!body) {
      return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })
    }

    const updated = await updateBillingSettings({
      adesaoValue: Number(body.adesaoValue),
      mensalidadeValue: Number(body.mensalidadeValue),
      mensalidadeBillingTypes: Array.isArray(body.mensalidadeBillingTypes)
        ? body.mensalidadeBillingTypes
        : [],
      defaultMensalidadeBillingType: String(body.defaultMensalidadeBillingType || ''),
    })

    return NextResponse.json({
      success: true,
      message: 'Configurações de cobrança atualizadas com sucesso.',
      settings: {
        adesaoValue: updated.adesaoValue,
        mensalidadeValue: updated.mensalidadeValue,
        mensalidadeBillingTypes: updated.mensalidadeBillingTypes,
        defaultMensalidadeBillingType: updated.defaultMensalidadeBillingType,
        source: updated.source,
        updatedAt: updated.updatedAt || null,
      },
      allowedBillingTypes: BILLING_TYPE_OPTIONS,
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
