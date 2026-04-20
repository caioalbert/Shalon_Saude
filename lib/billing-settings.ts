import { createAdminClient } from '@/lib/supabase/admin'

export const BILLING_TYPE_OPTIONS = ['PIX', 'BOLETO', 'CREDIT_CARD'] as const
export type BillingTypeOption = (typeof BILLING_TYPE_OPTIONS)[number]

export const PLAN_TYPE_OPTIONS = ['INDIVIDUAL', 'FAMILIAR'] as const
export type PlanTypeOption = (typeof PLAN_TYPE_OPTIONS)[number]
export const MIN_ASAAS_CHARGE_VALUE = 5

type BillingSettingsRow = {
  id: boolean
  adesao_value: number | string
  mensalidade_value?: number | string | null
  mensalidade_individual_value?: number | string | null
  mensalidade_familiar_value?: number | string | null
  mensalidade_billing_types: string[] | null
  default_mensalidade_billing_type: string
  default_plan_type?: string | null
  updated_at: string
}

export type BillingSettings = {
  // Compatibilidade legada: valor padrão do plano selecionado como default
  adesaoValue: number
  mensalidadeValue: number
  // Valor por plano (regra atual: adesão e mensalidade usam o mesmo valor do plano)
  adesaoByPlanType: Record<PlanTypeOption, number>
  mensalidadeByPlanType: Record<PlanTypeOption, number>
  mensalidadeIndividualValue: number
  mensalidadeFamiliarValue: number
  mensalidadeBillingTypes: BillingTypeOption[]
  defaultMensalidadeBillingType: BillingTypeOption
  defaultPlanType: PlanTypeOption
  updatedAt?: string
  source: 'database' | 'env'
}

type UpdateBillingSettingsInput = {
  adesaoValue?: number
  mensalidadeIndividualValue: number
  mensalidadeFamiliarValue: number
  mensalidadeBillingTypes: string[]
  defaultMensalidadeBillingType: string
  defaultPlanType: string
}

function toUpperTrim(value: string | null | undefined) {
  return String(value || '')
    .trim()
    .toUpperCase()
}

function isBillingTypeOption(value: string): value is BillingTypeOption {
  return BILLING_TYPE_OPTIONS.includes(value as BillingTypeOption)
}

function isPlanTypeOption(value: string): value is PlanTypeOption {
  return PLAN_TYPE_OPTIONS.includes(value as PlanTypeOption)
}

function normalizePlanType(value: string | null | undefined, fallback: PlanTypeOption = 'INDIVIDUAL') {
  const normalized = toUpperTrim(value)
  return isPlanTypeOption(normalized) ? normalized : fallback
}

function normalizeBillingTypeList(values: string[]) {
  const unique = Array.from(new Set(values.map((value) => toUpperTrim(value)).filter(Boolean)))
  const allowed = unique.filter(isBillingTypeOption)

  if (allowed.length === 0) {
    return ['PIX'] as BillingTypeOption[]
  }

  return allowed
}

function parsePositiveAmount(value: number | string | null | undefined, fieldLabel: string) {
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

export function getPlanValueByPlanType(
  settings: Pick<BillingSettings, 'mensalidadeIndividualValue' | 'mensalidadeFamiliarValue' | 'defaultPlanType'>,
  planType: string | null | undefined
) {
  const normalizedPlanType = normalizePlanType(planType, settings.defaultPlanType)
  return normalizedPlanType === 'FAMILIAR'
    ? settings.mensalidadeFamiliarValue
    : settings.mensalidadeIndividualValue
}

export const getMensalidadeValueByPlanType = getPlanValueByPlanType
export const getAdesaoValueByPlanType = getPlanValueByPlanType

function buildBillingSettings(params: {
  mensalidadeIndividualValue: number
  mensalidadeFamiliarValue: number
  mensalidadeBillingTypes: BillingTypeOption[]
  defaultMensalidadeBillingType: BillingTypeOption
  defaultPlanType: PlanTypeOption
  source: 'database' | 'env'
  updatedAt?: string
}): BillingSettings {
  const valorByPlanType: Record<PlanTypeOption, number> = {
    INDIVIDUAL: params.mensalidadeIndividualValue,
    FAMILIAR: params.mensalidadeFamiliarValue,
  }

  const defaultPlanValue = valorByPlanType[params.defaultPlanType]

  return {
    adesaoValue: defaultPlanValue,
    mensalidadeValue: defaultPlanValue,
    adesaoByPlanType: { ...valorByPlanType },
    mensalidadeByPlanType: { ...valorByPlanType },
    mensalidadeIndividualValue: params.mensalidadeIndividualValue,
    mensalidadeFamiliarValue: params.mensalidadeFamiliarValue,
    mensalidadeBillingTypes: params.mensalidadeBillingTypes,
    defaultMensalidadeBillingType: params.defaultMensalidadeBillingType,
    defaultPlanType: params.defaultPlanType,
    updatedAt: params.updatedAt,
    source: params.source,
  }
}

function readEnvFallbackSettings(): BillingSettings {
  const legacyBaseValue =
    getEnvValue('ASAAS_MENSALIDADE_VALUE') || getEnvValue('ASAAS_ADESAO_VALUE') || '49.90'

  const mensalidadeIndividualValue = parsePositiveAmount(
    getEnvValue('ASAAS_MENSALIDADE_INDIVIDUAL_VALUE') || legacyBaseValue,
    'valor do plano individual'
  )
  const mensalidadeFamiliarValue = parsePositiveAmount(
    getEnvValue('ASAAS_MENSALIDADE_FAMILIAR_VALUE') || legacyBaseValue,
    'valor do plano familiar'
  )

  const rawTypes =
    getEnvValue('ASAAS_MENSALIDADE_BILLING_TYPES') ||
    getEnvValue('ASAAS_MENSALIDADE_BILLING_TYPE') ||
    'PIX'
  const mensalidadeBillingTypes = normalizeBillingTypeList(rawTypes.split(','))

  const requestedDefault = toUpperTrim(
    getEnvValue('ASAAS_MENSALIDADE_BILLING_TYPE') || mensalidadeBillingTypes[0]
  )
  const defaultMensalidadeBillingType = mensalidadeBillingTypes.includes(
    requestedDefault as BillingTypeOption
  )
    ? (requestedDefault as BillingTypeOption)
    : mensalidadeBillingTypes[0]

  const defaultPlanType = normalizePlanType(getEnvValue('ASAAS_DEFAULT_PLAN_TYPE'), 'INDIVIDUAL')

  return buildBillingSettings({
    mensalidadeIndividualValue,
    mensalidadeFamiliarValue,
    mensalidadeBillingTypes,
    defaultMensalidadeBillingType,
    defaultPlanType,
    source: 'env',
  })
}

function normalizeSettingsRow(row: BillingSettingsRow): BillingSettings {
  const legacyMensalidadeValue = row.mensalidade_value ?? row.adesao_value

  const mensalidadeIndividualValue = parsePositiveAmount(
    row.mensalidade_individual_value ?? legacyMensalidadeValue ?? '49.90',
    'valor do plano individual'
  )
  const mensalidadeFamiliarValue = parsePositiveAmount(
    row.mensalidade_familiar_value ?? legacyMensalidadeValue ?? mensalidadeIndividualValue,
    'valor do plano familiar'
  )

  const mensalidadeBillingTypes = normalizeBillingTypeList(row.mensalidade_billing_types || [])
  const requestedDefault = toUpperTrim(row.default_mensalidade_billing_type)

  const defaultMensalidadeBillingType = mensalidadeBillingTypes.includes(
    requestedDefault as BillingTypeOption
  )
    ? (requestedDefault as BillingTypeOption)
    : mensalidadeBillingTypes[0]

  return buildBillingSettings({
    mensalidadeIndividualValue,
    mensalidadeFamiliarValue,
    mensalidadeBillingTypes,
    defaultMensalidadeBillingType,
    defaultPlanType: normalizePlanType(row.default_plan_type, 'INDIVIDUAL'),
    updatedAt: row.updated_at,
    source: 'database',
  })
}

async function fetchBillingSettingsRow() {
  const supabase = createAdminClient()
  return supabase
    .from('cobranca_configuracoes')
    .select(
      'id, adesao_value, mensalidade_value, mensalidade_individual_value, mensalidade_familiar_value, mensalidade_billing_types, default_mensalidade_billing_type, default_plan_type, updated_at'
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
  const mensalidadeIndividualValue = parsePositiveAmount(
    input.mensalidadeIndividualValue,
    'valor do plano individual'
  )
  const mensalidadeFamiliarValue = parsePositiveAmount(
    input.mensalidadeFamiliarValue,
    'valor do plano familiar'
  )

  if (mensalidadeIndividualValue < MIN_ASAAS_CHARGE_VALUE) {
    throw new Error(
      `Valor inválido para o plano individual. O mínimo permitido pelo Asaas é R$ ${MIN_ASAAS_CHARGE_VALUE.toFixed(2).replace('.', ',')}.`
    )
  }

  if (mensalidadeFamiliarValue < MIN_ASAAS_CHARGE_VALUE) {
    throw new Error(
      `Valor inválido para o plano familiar. O mínimo permitido pelo Asaas é R$ ${MIN_ASAAS_CHARGE_VALUE.toFixed(2).replace('.', ',')}.`
    )
  }

  const mensalidadeBillingTypes = normalizeBillingTypeList(input.mensalidadeBillingTypes)

  const defaultBillingTypeRaw = toUpperTrim(input.defaultMensalidadeBillingType)
  const defaultMensalidadeBillingType = mensalidadeBillingTypes.includes(
    defaultBillingTypeRaw as BillingTypeOption
  )
    ? (defaultBillingTypeRaw as BillingTypeOption)
    : mensalidadeBillingTypes[0]

  const defaultPlanType = normalizePlanType(input.defaultPlanType, 'INDIVIDUAL')
  const defaultPlanValue =
    defaultPlanType === 'FAMILIAR' ? mensalidadeFamiliarValue : mensalidadeIndividualValue

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('cobranca_configuracoes')
    .upsert(
      {
        id: true,
        // Legado: mantém um valor único, usando o plano padrão
        adesao_value: defaultPlanValue,
        mensalidade_value: defaultPlanValue,
        mensalidade_individual_value: mensalidadeIndividualValue,
        mensalidade_familiar_value: mensalidadeFamiliarValue,
        mensalidade_billing_types: mensalidadeBillingTypes,
        default_mensalidade_billing_type: defaultMensalidadeBillingType,
        default_plan_type: defaultPlanType,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
    .select(
      'id, adesao_value, mensalidade_value, mensalidade_individual_value, mensalidade_familiar_value, mensalidade_billing_types, default_mensalidade_billing_type, default_plan_type, updated_at'
    )
    .single()

  if (error) {
    throw error
  }

  return normalizeSettingsRow(data as BillingSettingsRow)
}
