import { createAdminClient } from '@/lib/supabase/admin'

export const BILLING_TYPE_OPTIONS = ['PIX', 'BOLETO', 'CREDIT_CARD'] as const
export type BillingTypeOption = (typeof BILLING_TYPE_OPTIONS)[number]

type BillingSettingsRow = {
  id: boolean
  adesao_value: number | string
  mensalidade_value: number | string
  mensalidade_billing_types: string[] | null
  default_mensalidade_billing_type: string
  updated_at: string
}

export type BillingSettings = {
  adesaoValue: number
  mensalidadeValue: number
  mensalidadeBillingTypes: BillingTypeOption[]
  defaultMensalidadeBillingType: BillingTypeOption
  updatedAt?: string
  source: 'database' | 'env'
}

type UpdateBillingSettingsInput = {
  adesaoValue: number
  mensalidadeValue: number
  mensalidadeBillingTypes: string[]
  defaultMensalidadeBillingType: string
}

function toUpperTrim(value: string | null | undefined) {
  return String(value || '')
    .trim()
    .toUpperCase()
}

function isBillingTypeOption(value: string): value is BillingTypeOption {
  return BILLING_TYPE_OPTIONS.includes(value as BillingTypeOption)
}

function normalizeBillingTypeList(values: string[]) {
  const unique = Array.from(new Set(values.map((value) => toUpperTrim(value)).filter(Boolean)))
  const allowed = unique.filter(isBillingTypeOption)

  if (allowed.length === 0) {
    return ['PIX'] as BillingTypeOption[]
  }

  return allowed
}

function parsePositiveAmount(value: number | string, fieldLabel: string) {
  const raw = String(value ?? '')
  const normalized = raw.replace(',', '.').trim()
  const parsed = Number.parseFloat(normalized)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Valor inválido para ${fieldLabel}.`)
  }

  return Math.round((parsed + Number.EPSILON) * 100) / 100
}

function getEnvValue(name: string) {
  return process.env[name]?.trim()
}

function readEnvFallbackSettings(): BillingSettings {
  const adesaoValue = parsePositiveAmount(getEnvValue('ASAAS_ADESAO_VALUE') || '49.90', 'adesão')
  const mensalidadeValue = parsePositiveAmount(
    getEnvValue('ASAAS_MENSALIDADE_VALUE') || '49.90',
    'mensalidade'
  )

  const rawTypes = getEnvValue('ASAAS_MENSALIDADE_BILLING_TYPES') || getEnvValue('ASAAS_MENSALIDADE_BILLING_TYPE') || 'PIX'
  const mensalidadeBillingTypes = normalizeBillingTypeList(rawTypes.split(','))

  const requestedDefault = toUpperTrim(getEnvValue('ASAAS_MENSALIDADE_BILLING_TYPE') || mensalidadeBillingTypes[0])
  const defaultMensalidadeBillingType = mensalidadeBillingTypes.includes(
    requestedDefault as BillingTypeOption
  )
    ? (requestedDefault as BillingTypeOption)
    : mensalidadeBillingTypes[0]

  return {
    adesaoValue,
    mensalidadeValue,
    mensalidadeBillingTypes,
    defaultMensalidadeBillingType,
    source: 'env',
  }
}

function normalizeSettingsRow(row: BillingSettingsRow): BillingSettings {
  const mensalidadeBillingTypes = normalizeBillingTypeList(row.mensalidade_billing_types || [])
  const requestedDefault = toUpperTrim(row.default_mensalidade_billing_type)

  const defaultMensalidadeBillingType = mensalidadeBillingTypes.includes(
    requestedDefault as BillingTypeOption
  )
    ? (requestedDefault as BillingTypeOption)
    : mensalidadeBillingTypes[0]

  return {
    adesaoValue: parsePositiveAmount(row.adesao_value, 'adesão'),
    mensalidadeValue: parsePositiveAmount(row.mensalidade_value, 'mensalidade'),
    mensalidadeBillingTypes,
    defaultMensalidadeBillingType,
    updatedAt: row.updated_at,
    source: 'database',
  }
}

async function fetchBillingSettingsRow() {
  const supabase = createAdminClient()
  return supabase
    .from('cobranca_configuracoes')
    .select(
      'id, adesao_value, mensalidade_value, mensalidade_billing_types, default_mensalidade_billing_type, updated_at'
    )
    .eq('id', true)
    .maybeSingle()
}

export async function getBillingSettings(): Promise<BillingSettings> {
  try {
    const { data, error } = await fetchBillingSettingsRow()
    if (error) {
      const details = `${error.message || ''} ${error.details || ''}`
      if (/relation .*cobranca_configuracoes|does not exist|42P01/i.test(details)) {
        return readEnvFallbackSettings()
      }

      throw error
    }

    if (!data) {
      return readEnvFallbackSettings()
    }

    return normalizeSettingsRow(data as BillingSettingsRow)
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error)
    if (/relation .*cobranca_configuracoes|does not exist|42P01/i.test(details)) {
      return readEnvFallbackSettings()
    }

    throw error
  }
}

export async function updateBillingSettings(input: UpdateBillingSettingsInput): Promise<BillingSettings> {
  const adesaoValue = parsePositiveAmount(input.adesaoValue, 'adesão')
  const mensalidadeValue = parsePositiveAmount(input.mensalidadeValue, 'mensalidade')
  const mensalidadeBillingTypes = normalizeBillingTypeList(input.mensalidadeBillingTypes)

  const defaultBillingTypeRaw = toUpperTrim(input.defaultMensalidadeBillingType)
  const defaultMensalidadeBillingType = mensalidadeBillingTypes.includes(
    defaultBillingTypeRaw as BillingTypeOption
  )
    ? (defaultBillingTypeRaw as BillingTypeOption)
    : mensalidadeBillingTypes[0]

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('cobranca_configuracoes')
    .upsert(
      {
        id: true,
        adesao_value: adesaoValue,
        mensalidade_value: mensalidadeValue,
        mensalidade_billing_types: mensalidadeBillingTypes,
        default_mensalidade_billing_type: defaultMensalidadeBillingType,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
    .select(
      'id, adesao_value, mensalidade_value, mensalidade_billing_types, default_mensalidade_billing_type, updated_at'
    )
    .single()

  if (error) {
    throw error
  }

  return normalizeSettingsRow(data as BillingSettingsRow)
}
