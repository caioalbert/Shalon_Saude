import { BILLING_TYPE_OPTIONS, PLAN_TYPE_OPTIONS, getBillingSettings } from '@/lib/billing-settings'
import { NextResponse } from 'next/server'

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export async function GET() {
  try {
    const settings = await getBillingSettings()

    return NextResponse.json({
      success: true,
      adesaoValue: settings.adesaoValue,
      mensalidadeValue: settings.mensalidadeValue,
      adesaoByPlanType: settings.adesaoByPlanType,
      mensalidadeByPlanType: {
        INDIVIDUAL: settings.mensalidadeIndividualValue,
        FAMILIAR: settings.mensalidadeFamiliarValue,
      },
      defaultPlanType: settings.defaultPlanType,
      mensalidadeBillingTypes: settings.mensalidadeBillingTypes,
      defaultMensalidadeBillingType: settings.defaultMensalidadeBillingType,
      display: {
        adesaoValue: formatCurrency(settings.adesaoValue),
        mensalidadeValue: formatCurrency(settings.mensalidadeValue),
        adesaoByPlanType: {
          INDIVIDUAL: formatCurrency(settings.adesaoByPlanType.INDIVIDUAL),
          FAMILIAR: formatCurrency(settings.adesaoByPlanType.FAMILIAR),
        },
        mensalidadeByPlanType: {
          INDIVIDUAL: formatCurrency(settings.mensalidadeIndividualValue),
          FAMILIAR: formatCurrency(settings.mensalidadeFamiliarValue),
        },
      },
      allowedBillingTypes: BILLING_TYPE_OPTIONS,
      allowedPlanTypes: PLAN_TYPE_OPTIONS,
      source: settings.source,
    })
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error)
    if (/fetch failed|enotfound|getaddrinfo|network/i.test(details)) {
      return NextResponse.json(
        {
          error:
            'Falha ao conectar no Supabase. Verifique NEXT_PUBLIC_SUPABASE_URL e as chaves no arquivo .env/.env.local.',
        },
        { status: 503 }
      )
    }

    console.error('Public billing settings GET error:', error)
    return NextResponse.json({ error: 'Erro ao carregar configurações de cobrança.' }, { status: 500 })
  }
}
