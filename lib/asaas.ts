const DEFAULT_ASAAS_API_BASE_URL = 'https://api-sandbox.asaas.com/v3'
const CONNECTIVITY_ERROR_REGEX =
  /fetch failed|enotfound|getaddrinfo|network|ssl handshake|tls|cloudflare|timeout|econnreset|socket hang up/i

type AsaasErrorKind = 'configuration' | 'connectivity' | 'api' | 'invalid_response'
type AsaasBillingType = 'BOLETO' | 'CREDIT_CARD' | 'PIX'
type AsaasCycle =
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'BIMONTHLY'
  | 'QUARTERLY'
  | 'SEMIANNUALLY'
  | 'YEARLY'

type AsaasApiErrorItem = {
  code?: string
  description?: string
}

type AsaasApiErrorResponse = {
  errors?: AsaasApiErrorItem[]
  message?: string
}

type AsaasCreateCustomerResponse = {
  id?: string
}

type AsaasCreatePaymentResponse = {
  id?: string
  value?: number
  dueDate?: string
  billingType?: string
  status?: string
  invoiceUrl?: string
  bankSlipUrl?: string
  creditCardToken?: string
}

type AsaasPixQrCodeResponse = {
  encodedImage?: string
  payload?: string
  expirationDate?: string
}

type AsaasCreateSubscriptionResponse = {
  id?: string
  value?: number
  billingType?: string
  cycle?: string
  nextDueDate?: string
}

type AsaasPaymentResponse = {
  id?: string
  status?: string
  customer?: string
  externalReference?: string
  billingType?: string
  value?: number
  dueDate?: string
  description?: string
  invoiceUrl?: string
  bankSlipUrl?: string
  creditCardToken?: string
}

type AsaasListResponse<T> = {
  data?: T[]
}

type AsaasSubscriptionPaymentListItem = {
  id?: string
}

export type CreateAsaasCustomerInput = {
  name: string
  cpfCnpj: string
  email?: string
  phone?: string
  mobilePhone?: string
  address?: string
  addressNumber?: string
  complement?: string
  province?: string
  postalCode?: string
  externalReference?: string
}

export type CreateAsaasPixPaymentInput = {
  customer: string
  value: number
  dueDate: string
  description?: string
  externalReference?: string
}

export type CreateAsaasPaymentInput = {
  customer: string
  value: number
  dueDate: string
  billingType: AsaasBillingType
  description?: string
  externalReference?: string
}

export type CreateAsaasSubscriptionInput = {
  customer: string
  billingType: AsaasBillingType
  value: number
  nextDueDate: string
  cycle: AsaasCycle
  description?: string
  externalReference?: string
}

export type AsaasPixQrCode = {
  encodedImage: string
  payload: string
  expirationDate?: string
}

export type AsaasPaymentInfo = {
  id: string
  status?: string
  customer?: string
  externalReference?: string
  billingType?: string
  value?: number
  dueDate?: string
  description?: string
  invoiceUrl?: string
  bankSlipUrl?: string
  creditCardToken?: string
}

const PAID_STATUSES = new Set(['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'])

export class AsaasIntegrationError extends Error {
  readonly status: number
  readonly kind: AsaasErrorKind

  constructor(message: string, kind: AsaasErrorKind, status: number) {
    super(message)
    this.name = 'AsaasIntegrationError'
    this.kind = kind
    this.status = status
  }
}

function getAsaasApiBaseUrl() {
  const configuredUrl = process.env.ASAAS_API_BASE_URL?.trim()
  const baseUrl = configuredUrl || DEFAULT_ASAAS_API_BASE_URL
  return baseUrl.replace(/\/$/, '')
}

function getAsaasApiKey() {
  const key = process.env.ASAAS_API_KEY?.trim()
  if (!key) {
    throw new AsaasIntegrationError(
      'Integração de pagamentos indisponível. Configure ASAAS_API_KEY.',
      'configuration',
      503
    )
  }

  return key
}

function sanitizeDigits(value: string | undefined) {
  if (!value) return undefined
  const digits = value.replace(/\D/g, '')
  return digits || undefined
}

function compactPayload<T extends Record<string, unknown>>(payload: T) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== null && value !== '')
  )
}

function extractAsaasApiErrorMessage(payload: AsaasApiErrorResponse | null) {
  const firstError = payload?.errors?.[0]
  if (firstError?.description && firstError.description.trim()) {
    return firstError.description.trim()
  }

  if (payload?.message && payload.message.trim()) {
    return payload.message.trim()
  }

  return null
}

function isHtmlPayload(value: string) {
  return /<html|<!doctype/i.test(value)
}

function normalizeAsaasAmount(value: number, envName: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new AsaasIntegrationError(
      `Valor inválido para ${envName}.`,
      'configuration',
      503
    )
  }

  return Math.round((value + Number.EPSILON) * 100) / 100
}

function assertAsaasDate(value: string, fieldName: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AsaasIntegrationError(
      `Formato inválido para ${fieldName}. Use YYYY-MM-DD.`,
      'configuration',
      500
    )
  }
}

async function parseAsaasError(response: Response, fallbackMessage: string): Promise<never> {
  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    const errorPayload = (await response.json().catch(() => null)) as AsaasApiErrorResponse | null
    const apiMessage = extractAsaasApiErrorMessage(errorPayload)
    throw new AsaasIntegrationError(apiMessage || fallbackMessage, 'api', response.status)
  }

  const rawBody = await response.text().catch(() => '')
  if (isHtmlPayload(rawBody)) {
    throw new AsaasIntegrationError(
      'Falha de comunicação com o Asaas. Tente novamente em alguns minutos.',
      'connectivity',
      503
    )
  }

  throw new AsaasIntegrationError(fallbackMessage, 'api', response.status)
}

async function parseAsaasJson<T>(response: Response, invalidMessage: string) {
  const payload = (await response.json().catch(() => null)) as T | null
  if (!payload) {
    throw new AsaasIntegrationError(invalidMessage, 'invalid_response', 502)
  }

  return payload
}

async function asaasRequest(path: string, init: RequestInit, fallbackErrorMessage: string) {
  const url = `${getAsaasApiBaseUrl()}/${path.replace(/^\/+/, '')}`
  const headers = new Headers(init.headers)
  headers.set('access_token', getAsaasApiKey())

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  try {
    const response = await fetch(url, {
      ...init,
      headers,
      cache: 'no-store',
    })

    if (!response.ok) {
      await parseAsaasError(response, fallbackErrorMessage)
    }

    return response
  } catch (error) {
    if (error instanceof AsaasIntegrationError) {
      throw error
    }

    const details = error instanceof Error ? error.message : String(error)
    if (CONNECTIVITY_ERROR_REGEX.test(details)) {
      throw new AsaasIntegrationError(
        'Falha de comunicação com o Asaas. Tente novamente em alguns minutos.',
        'connectivity',
        503
      )
    }

    console.error('Asaas request unexpected error:', error)
    throw new AsaasIntegrationError(
      'Erro inesperado ao integrar com o Asaas.',
      'api',
      500
    )
  }
}

export function isAsaasPaidStatus(status?: string | null) {
  if (!status) return false
  return PAID_STATUSES.has(status.toUpperCase())
}

export async function createAsaasCustomer(
  input: CreateAsaasCustomerInput
): Promise<{ id: string }> {
  const payload = compactPayload({
    name: input.name.trim(),
    cpfCnpj: sanitizeDigits(input.cpfCnpj) || input.cpfCnpj.trim(),
    email: input.email?.trim(),
    phone: sanitizeDigits(input.phone),
    mobilePhone: sanitizeDigits(input.mobilePhone),
    address: input.address?.trim(),
    addressNumber: input.addressNumber?.trim(),
    complement: input.complement?.trim(),
    province: input.province?.trim(),
    postalCode: sanitizeDigits(input.postalCode),
    externalReference: input.externalReference?.trim(),
  })

  const response = await asaasRequest(
    'customers',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    'Não foi possível criar o cliente no Asaas.'
  )

  const data = await parseAsaasJson<AsaasCreateCustomerResponse>(
    response,
    'Asaas retornou uma resposta inválida ao criar o cliente.'
  )

  if (!data.id) {
    throw new AsaasIntegrationError(
      'Asaas retornou uma resposta inválida ao criar o cliente.',
      'invalid_response',
      502
    )
  }

  return { id: data.id }
}

export async function createAsaasPixPayment(
  input: CreateAsaasPixPaymentInput
): Promise<{ id: string; value?: number; dueDate?: string; status?: string }> {
  const result = await createAsaasPayment({
    customer: input.customer,
    value: input.value,
    dueDate: input.dueDate,
    billingType: 'PIX',
    description: input.description,
    externalReference: input.externalReference,
  })

  return {
    id: result.id,
    value: result.value,
    dueDate: result.dueDate,
    status: result.status,
  }
}

export async function createAsaasPayment(
  input: CreateAsaasPaymentInput
): Promise<{
  id: string
  value?: number
  dueDate?: string
  status?: string
  billingType?: string
  invoiceUrl?: string
  bankSlipUrl?: string
  creditCardToken?: string
}> {
  assertAsaasDate(input.dueDate, 'dueDate')
  const value = normalizeAsaasAmount(input.value, 'ASAAS_ADESAO_VALUE')

  const payload = compactPayload({
    customer: input.customer.trim(),
    billingType: input.billingType,
    value,
    dueDate: input.dueDate,
    description: input.description?.trim(),
    externalReference: input.externalReference?.trim(),
  })

  const response = await asaasRequest(
    'payments',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    'Não foi possível criar a cobrança de adesão no Asaas.'
  )

  const data = await parseAsaasJson<AsaasCreatePaymentResponse>(
    response,
    'Asaas retornou uma resposta inválida ao criar a cobrança.'
  )

  if (!data.id) {
    throw new AsaasIntegrationError(
      'Asaas retornou uma resposta inválida ao criar a cobrança.',
      'invalid_response',
      502
    )
  }

  return {
    id: data.id,
    value: data.value,
    dueDate: data.dueDate,
    status: data.status,
    billingType: data.billingType,
    invoiceUrl: data.invoiceUrl,
    bankSlipUrl: data.bankSlipUrl,
    creditCardToken: data.creditCardToken,
  }
}

export async function getAsaasPixQrCode(paymentId: string): Promise<AsaasPixQrCode> {
  const response = await asaasRequest(
    `payments/${paymentId}/pixQrCode`,
    { method: 'GET' },
    'Não foi possível obter o QR Code PIX no Asaas.'
  )

  const data = await parseAsaasJson<AsaasPixQrCodeResponse>(
    response,
    'Asaas retornou uma resposta inválida ao obter o QR Code PIX.'
  )

  if (!data.encodedImage || !data.payload) {
    throw new AsaasIntegrationError(
      'Asaas retornou uma resposta inválida ao obter o QR Code PIX.',
      'invalid_response',
      502
    )
  }

  return {
    encodedImage: data.encodedImage,
    payload: data.payload,
    expirationDate: data.expirationDate,
  }
}

export async function getAsaasPayment(paymentId: string): Promise<AsaasPaymentInfo> {
  const response = await asaasRequest(
    `payments/${paymentId}`,
    { method: 'GET' },
    'Não foi possível consultar o pagamento no Asaas.'
  )

  const data = await parseAsaasJson<AsaasPaymentResponse>(
    response,
    'Asaas retornou uma resposta inválida ao consultar o pagamento.'
  )

  if (!data.id) {
    throw new AsaasIntegrationError(
      'Asaas retornou uma resposta inválida ao consultar o pagamento.',
      'invalid_response',
      502
    )
  }

  return {
    id: data.id,
    status: data.status,
    customer: data.customer,
    externalReference: data.externalReference,
    billingType: data.billingType,
    value: data.value,
    invoiceUrl: data.invoiceUrl,
    bankSlipUrl: data.bankSlipUrl,
    creditCardToken: data.creditCardToken,
  }
}

export async function listAsaasPayments(customerId: string): Promise<AsaasPaymentInfo[]> {
  const response = await asaasRequest(
    `payments?customer=${customerId}&limit=100`,
    { method: 'GET' },
    'Não foi possível listar os pagamentos no Asaas.'
  )

  const data = await parseAsaasJson<{ data?: AsaasPaymentResponse[] }>(
    response,
    'Asaas retornou uma resposta inválida ao listar pagamentos.'
  )

  if (!Array.isArray(data.data)) {
    return []
  }

  return data.data
    .filter((p) => p.id)
    .map((p) => ({
      id: p.id!,
      status: p.status,
      customer: p.customer,
      externalReference: p.externalReference,
      billingType: p.billingType,
      value: p.value,
      dueDate: p.dueDate,
      description: p.description,
      invoiceUrl: p.invoiceUrl,
      bankSlipUrl: p.bankSlipUrl,
      creditCardToken: p.creditCardToken,
    }))
}

export async function listAsaasSubscriptionPayments(subscriptionId: string): Promise<AsaasPaymentInfo[]> {
  const response = await asaasRequest(
    `subscriptions/${subscriptionId}/payments?limit=100`,
    { method: 'GET' },
    'Não foi possível listar os pagamentos da assinatura no Asaas.'
  )

  const data = await parseAsaasJson<{ data?: AsaasPaymentResponse[] }>(
    response,
    'Asaas retornou uma resposta inválida ao listar pagamentos da assinatura.'
  )

  if (!Array.isArray(data.data)) {
    return []
  }

  return data.data
    .filter((p) => p.id)
    .map((p) => ({
      id: p.id!,
      status: p.status,
      customer: p.customer,
      externalReference: p.externalReference,
      billingType: p.billingType,
      value: p.value,
      dueDate: p.dueDate,
      description: p.description,
      invoiceUrl: p.invoiceUrl,
      bankSlipUrl: p.bankSlipUrl,
      creditCardToken: p.creditCardToken,
    }))
}

export async function createAsaasSubscription(
  input: CreateAsaasSubscriptionInput
): Promise<{ id: string; nextDueDate?: string }> {
  assertAsaasDate(input.nextDueDate, 'nextDueDate')
  const value = normalizeAsaasAmount(input.value, 'ASAAS_MENSALIDADE_VALUE')

  const payload = compactPayload({
    customer: input.customer.trim(),
    billingType: input.billingType,
    value,
    nextDueDate: input.nextDueDate,
    cycle: input.cycle,
    description: input.description?.trim(),
    externalReference: input.externalReference?.trim(),
  })

  const response = await asaasRequest(
    'subscriptions',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    'Não foi possível criar a assinatura recorrente no Asaas.'
  )

  const data = await parseAsaasJson<AsaasCreateSubscriptionResponse>(
    response,
    'Asaas retornou uma resposta inválida ao criar a assinatura.'
  )

  if (!data.id) {
    throw new AsaasIntegrationError(
      'Asaas retornou uma resposta inválida ao criar a assinatura.',
      'invalid_response',
      502
    )
  }

  return {
    id: data.id,
    nextDueDate: data.nextDueDate,
  }
}

export async function hasAsaasOverdueSubscriptionPayment(subscriptionId: string): Promise<boolean> {
  const normalizedSubscriptionId = String(subscriptionId || '').trim()
  if (!normalizedSubscriptionId) {
    throw new AsaasIntegrationError(
      'Identificador da assinatura no Asaas é obrigatório.',
      'configuration',
      500
    )
  }

  const response = await asaasRequest(
    `subscriptions/${encodeURIComponent(normalizedSubscriptionId)}/payments?status=OVERDUE&limit=1`,
    { method: 'GET' },
    'Não foi possível consultar as cobranças da assinatura no Asaas.'
  )

  const data = await parseAsaasJson<AsaasListResponse<AsaasSubscriptionPaymentListItem>>(
    response,
    'Asaas retornou uma resposta inválida ao consultar cobranças da assinatura.'
  )

  if (!Array.isArray(data.data)) {
    throw new AsaasIntegrationError(
      'Asaas retornou uma resposta inválida ao consultar cobranças da assinatura.',
      'invalid_response',
      502
    )
  }

  return data.data.length > 0
}
