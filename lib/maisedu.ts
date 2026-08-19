import dns from 'node:dns'
import { Agent, type Dispatcher } from 'undici'
import type { MaisEduProductId } from './maisedu-products'

export type { MaisEduProductId } from './maisedu-products'

/**
 * Integração com a API de Cadastro de Parceiros do Grupo MaisEdu.
 *
 * Endpoint: POST https://vo.grupomais.net.br/api/v1/partner_register
 *
 * Autenticação:
 *   - Header "Authorization: Bearer <TOKEN>"  → token de acesso gerado pelo painel MaisEdu
 *
 * Fluxo de cadastro:
 *   POST com payload JSON contendo os dados do usuário.
 *   O campo "ref" só é enviado quando MAISEDU_REF_LOGIN estiver configurado.
 */

const MAISEDU_API_URL = 'https://vo.grupomais.net.br/api/v1/partner_register'
const MAISEDU_API_TOKEN = process.env.MAISEDU_API_TOKEN?.trim() || ''

/**
 * Login do patrocinador (conta raiz da Shalon Saúde no sistema MaisEdu).
 * Opcional. Quando ausente/vazio, o campo "ref" é omitido do request.
 */
const MAISEDU_REF_LOGIN = process.env.MAISEDU_REF_LOGIN || ''

const maisEduIpv4Dispatcher: Dispatcher = new Agent({
  connect: {
    lookup(hostname, options, callback) {
      dns.lookup(hostname, { ...options, family: 4, all: true }, callback)
    },
  },
})

/** Resultado tipado de uma chamada à API MaisEdu */
export type MaisEduResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: 'auth' | 'duplicate' | 'api_error' | 'no_config'; message: string }

/** Payload para cadastro de um usuário no MaisEdu */
export type MaisEduUserPayload = {
  /** Nome completo do usuário */
  nome: string
  /** E-mail (usado para login e comunicação) */
  email: string
  /** Nome de usuário — usamos o CPF sem pontuação */
  login: string
  /** CPF ou CNPJ (apenas números ou formatado) */
  doc: string
  /** Produto do fornecedor que será ativado para o usuário */
  produto: MaisEduProductId
  /** Login do patrocinador que indicou este usuário */
  ref?: string
  /** Senha opcional — se não enviada, a API gera uma aleatória */
  senha?: string
  /** Telefone/WhatsApp com DDD */
  telefone?: string
  /** CEP do endereço */
  cep?: string
  /** Logradouro */
  rua?: string
  /** Número do endereço */
  numero?: string
  /** Complemento */
  complemento?: string
  /** Bairro */
  bairro?: string
  /** Cidade */
  cidade?: string
  /** UF (ex: SP, RJ) */
  estado?: string
  /** Data de nascimento no formato YYYY-MM-DD */
  nascimento?: string
}

/** Resposta de sucesso da API MaisEdu */
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
  /** Presente apenas se o campo 'senha' não foi enviado no payload */
  pass_temp?: string
}

/** Verifica se as credenciais da MaisEdu estão configuradas no servidor */
export function isMaisEduConfigured(): boolean {
  return Boolean(MAISEDU_API_TOKEN)
}

/** Headers padrão de autenticação para chamadas à API MaisEdu */
function maisEduHeaders(): HeadersInit {
  return {
    'Authorization': `Bearer ${MAISEDU_API_TOKEN}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'ShalonSaudeHostinger/1.0',
  }
}

/**
 * Cadastra um usuário na plataforma MaisEdu.
 * Retorna os dados do usuário criado ou um erro tipado com mensagem amigável.
 *
 * O campo "ref" é preenchido automaticamente apenas quando MAISEDU_REF_LOGIN existe.
 */
export async function registerUserOnMaisEdu(
  payload: Omit<MaisEduUserPayload, 'ref'>
): Promise<MaisEduResult<MaisEduSuccessData>> {
  if (!MAISEDU_API_TOKEN) {
    return {
      ok: false,
      reason: 'no_config',
      message: 'Token da MaisEdu não configurado no servidor (MAISEDU_API_TOKEN).',
    }
  }

  // ref é opcional: incluido apenas se MAISEDU_REF_LOGIN estiver configurado.
  const body: MaisEduUserPayload = {
    ...payload,
    ...(MAISEDU_REF_LOGIN.trim() ? { ref: MAISEDU_REF_LOGIN.trim() } : {}),
  }

  try {
    const res = await fetch(MAISEDU_API_URL, {
      method: 'POST',
      headers: maisEduHeaders(),
      body: JSON.stringify(body),
      cache: 'no-store',
      dispatcher: maisEduIpv4Dispatcher,
    } as RequestInit & { dispatcher: Dispatcher })

    const textResponse = await res.text()
    let data: { status?: string; message?: string; data?: MaisEduSuccessData }
    try {
      data = textResponse ? JSON.parse(textResponse) : {}
    } catch {
      data = {}
    }

    // Erros de autenticação / IP bloqueado
    if (
      res.status === 401 ||
      res.status === 403 ||
      /token.*inv[aá]lido|acesso negado|parceiro inativo/i.test(data?.message || '')
    ) {
      console.error('[MaisEdu] Erro de autenticação:', { status: res.status, message: data?.message })
      return {
        ok: false,
        reason: 'auth',
        message: 'Token de acesso à MaisEdu inválido ou IP não autorizado. Contate o suporte SHALOM.',
      }
    }

    // Erros de duplicidade (e-mail, login ou CPF já cadastrado)
    if (/j[aá]\s*est[aá].*(uso|cadastrado)|already/i.test(data?.message || '')) {
      console.warn('[MaisEdu] Registro duplicado:', data?.message)
      return {
        ok: false,
        reason: 'duplicate',
        message: data?.message || 'Usuário já cadastrado na MaisEdu.',
      }
    }

    if (!res.ok || data?.status === 'error') {
      console.error('[MaisEdu API] Erro ao cadastrar usuário:', res.status, data)
      return {
        ok: false,
        reason: 'api_error',
        message: data?.message || `Erro ao cadastrar na MaisEdu (HTTP ${res.status}).`,
      }
    }

    // Sucesso: { status: "success", message: "...", data: { user_id, login, email, produto, pass_temp? } }
    const responseData = data?.data as MaisEduSuccessData | undefined

    if (!responseData?.user_id || responseData.produto?.id !== payload.produto) {
      console.error('[MaisEdu] Resposta de sucesso incompatível com o contrato V1.0:', {
        hasUserId: Boolean(responseData?.user_id),
        requestedProductId: payload.produto,
        returnedProductId: responseData?.produto?.id,
      })
      return {
        ok: false,
        reason: 'api_error',
        message: 'A MaisEdu não confirmou a ativação do produto solicitado.',
      }
    }

    return { ok: true, data: responseData }
  } catch (err) {
    console.error('[MaisEdu API] Erro de rede ao cadastrar:', err)
    return {
      ok: false,
      reason: 'api_error',
      message: 'Não foi possível conectar à MaisEdu para efetuar o cadastro.',
    }
  }
}
