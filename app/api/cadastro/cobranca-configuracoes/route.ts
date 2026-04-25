import { BILLING_TYPE_OPTIONS, getBillingSettings } from '@/lib/billing-settings'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

type PublicPlanOption = {
  codigo: string
  nome: string
  valor: number
  permiteDependentes: boolean
  maxDependentes: number
}

function normalizePlanCode(value: unknown) {
  return String(value || '').trim().toUpperCase()
}

function toPositiveNumber(value: unknown, fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }

  return Math.round((parsed + Number.EPSILON) * 100) / 100
}

function mapLegacyPlanOptions(settings: Awaited<ReturnType<typeof getBillingSettings>>): PublicPlanOption[] {
  return [
    {
      codigo: 'INDIVIDUAL',
      nome: 'Plano Individual',
      valor: settings.mensalidadeIndividualValue,
      permiteDependentes: false,
      maxDependentes: 0,
    },
    {
      codigo: 'FAMILIAR',
      nome: 'Plano Familiar',
      valor: settings.mensalidadeFamiliarValue,
      permiteDependentes: true,
      maxDependentes: 4,
    },
  ]
}

async function loadPublicPlanOptions(settings: Awaited<ReturnType<typeof getBillingSettings>>) {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('planos')
      .select('codigo, nome, valor, ordem, created_at')
      .eq('ativo', true)
      .order('ordem', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      throw error
    }

    const mapped = (data || [])
      .map((plan) => {
        const codigo = normalizePlanCode(plan.codigo)
        const nome = String(plan.nome || '').trim()
        const valor = toPositiveNumber(plan.valor, 0)

        if (!codigo || !nome || valor <= 0) {
          return null
        }

        const isFamiliar = codigo === 'FAMILIAR'

        return {
          codigo,
          nome,
          valor,
          permiteDependentes: isFamiliar,
          maxDependentes: isFamiliar ? 4 : 0,
        } satisfies PublicPlanOption
      })
      .filter((value): value is PublicPlanOption => Boolean(value))

    if (mapped.length > 0) {
      return mapped
    }
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error)
    if (!/relation .*planos|does not exist|42P01/i.test(details)) {
      throw error
    }
  }

  return mapLegacyPlanOptions(settings)
}

export async function GET() {
  try {
    const settings = await getBillingSettings()
    const planos = await loadPublicPlanOptions(settings)
    const allowedPlanTypes = planos.map((plan) => plan.codigo)
    const defaultPlanType = allowedPlanTypes.includes(settings.defaultPlanType)
      ? settings.defaultPlanType
      : (allowedPlanTypes[0] || settings.defaultPlanType)

    const mensalidadeByPlanType = planos.reduce<Record<string, number>>((acc, plan) => {
      acc[plan.codigo] = plan.valor
      return acc
    }, {})
    const adesaoByPlanType = { ...mensalidadeByPlanType }

    const displayMensalidadeByPlanType = Object.entries(mensalidadeByPlanType).reduce<Record<string, string>>(
      (acc, [code, value]) => {
        acc[code] = formatCurrency(value)
        return acc
      },
      {}
    )
    const displayAdesaoByPlanType = Object.entries(adesaoByPlanType).reduce<Record<string, string>>(
      (acc, [code, value]) => {
        acc[code] = formatCurrency(value)
        return acc
      },
      {}
    )

    const defaultPlanValue = mensalidadeByPlanType[defaultPlanType] ?? settings.mensalidadeValue

    return NextResponse.json({
      success: true,
      adesaoValue: defaultPlanValue,
      mensalidadeValue: defaultPlanValue,
      adesaoByPlanType,
      mensalidadeByPlanType,
      planos,
      defaultPlanType,
      mensalidadeBillingTypes: settings.mensalidadeBillingTypes,
      defaultMensalidadeBillingType: settings.defaultMensalidadeBillingType,
      display: {
        adesaoValue: formatCurrency(defaultPlanValue),
        mensalidadeValue: formatCurrency(defaultPlanValue),
        adesaoByPlanType: displayAdesaoByPlanType,
        mensalidadeByPlanType: displayMensalidadeByPlanType,
      },
      allowedBillingTypes: BILLING_TYPE_OPTIONS,
      allowedPlanTypes,
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
