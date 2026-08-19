import type { MaisEduProductId } from './maisedu-products'

export type MaisEduSuccessData = {
  user_id: number
  login: string
  email: string
  produto: {
    id: MaisEduProductId
    nome: string
    prod_id: number
    valor: number
  }
  pass_temp?: string
}

type ParsedMaisEduSuccess =
  | {
      ok: true
      data: MaisEduSuccessData
      returnedProductId: number | null
    }
  | {
      ok: false
      issues: string[]
      hasUserId: boolean
      returnedProductId: number | null
    }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parsePositiveInteger(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').trim())
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

function parseOptionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null
}

/**
 * Normaliza as duas respostas de sucesso observadas na API da MaisEdu:
 * - contrato documentado, com data.produto.id;
 * - resposta reduzida, com user_id válido, mas sem data.produto.
 *
 * Se o parceiro informar um produto, ele obrigatoriamente precisa ser o mesmo
 * que foi solicitado. A omissão do produto não invalida um user_id confirmado
 * em uma resposta HTTP de sucesso; o chamador já valida HTTP/status antes daqui.
 */
export function parseMaisEduSuccessData(input: {
  rawData: unknown
  requestedProductId: MaisEduProductId
  fallbackLogin: string
  fallbackEmail: string
}): ParsedMaisEduSuccess {
  const rawData = isRecord(input.rawData) ? input.rawData : null
  const rawProduct = rawData?.produto
  const productData = isRecord(rawProduct) ? rawProduct : null
  const userId = parsePositiveInteger(rawData?.user_id)
  const hasProductIdField = productData
    ? Object.prototype.hasOwnProperty.call(productData, 'id')
    : rawProduct !== undefined && rawProduct !== null && rawProduct !== ''
  const returnedProductId = parsePositiveInteger(productData ? productData.id : rawProduct)

  const issues = [
    !userId ? "campo 'user_id' ausente ou inválido" : null,
    hasProductIdField && returnedProductId === null
      ? "campo 'produto.id' informado, mas inválido"
      : null,
    returnedProductId !== null && returnedProductId !== input.requestedProductId
      ? `produto retornado ${returnedProductId}, esperado ${input.requestedProductId}`
      : null,
  ].filter((issue): issue is string => Boolean(issue))

  if (!userId || issues.length > 0) {
    return {
      ok: false,
      issues,
      hasUserId: Boolean(userId),
      returnedProductId,
    }
  }

  const login = parseOptionalString(rawData?.login) || input.fallbackLogin
  const email = parseOptionalString(rawData?.email) || input.fallbackEmail
  const passTemp = parseOptionalString(rawData?.pass_temp)

  return {
    ok: true,
    returnedProductId,
    data: {
      user_id: userId,
      login,
      email,
      produto: {
        id: input.requestedProductId,
        nome: parseOptionalString(productData?.nome) || '',
        prod_id: Number(productData?.prod_id) || 0,
        valor: Number(productData?.valor) || 0,
      },
      ...(passTemp ? { pass_temp: passTemp } : {}),
    },
  }
}
