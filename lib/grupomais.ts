/**
 * Cliente da API GrupoMais (vo.grupomais.net.br)
 * Documentação: API V1.0 — POST /api/v1/partner_register
 */

const API_URL = process.env.GRUPOMAIS_API_URL ?? 'https://vo.grupomais.net.br'
const API_TOKEN = process.env.GRUPOMAIS_API_TOKEN ?? ''

export const GRUPOMAIS_PRODUTOS = {
  1: 'MaisTelemed Individual',
  2: 'MaisTelemed Família (04 Vidas)',
  3: 'MaisTelepet Individual',
  4: 'MaisTelepet Família (03 Pets)',
  5: 'MaisPrevi Individual',
  6: 'MaisPrevi Família (05 Vidas)',
} as const

export type GrupoMaisProdutoId = keyof typeof GRUPOMAIS_PRODUTOS

export type GrupoMaisRegisterPayload = {
  // Obrigatórios
  nome: string
  email: string
  login: string
  doc: string       // CPF/CNPJ apenas dígitos
  produto: number   // INTEGER 1-6 — campo que o parceiro exige
  // Opcionais
  senha?: string
  telefone?: string
  nascimento?: string // YYYY-MM-DD
  cep?: string
  rua?: string
  numero?: string
  bairro?: string
  cidade?: string
  estado?: string   // UF 2 letras
}

export type GrupoMaisRegisterResult =
  | {
      ok: true
      userId: number
      login: string
      email: string
      produto: { id: number; nome: string; valor: number }
      passtemp?: string
    }
  | { ok: false; error: string; status: number }

/**
 * Gera um login único a partir do nome (sem espaços nem caracteres especiais)
 * Acrescenta sufixo numérico baseado em timestamp para garantir unicidade
 */
export function buildLogin(nome: string, suffix?: string): string {
  const base = nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9]/g, '')       // remove tudo que não for alfanumérico
    .slice(0, 20)
  return suffix ? `${base}${suffix}` : base
}

/**
 * Envia cadastro para a API do parceiro GrupoMais.
 *
 * @param payload - Dados do cliente. O campo `produto` DEVE ser um inteiro 1-6.
 */
export async function registrarNoParceiro(
  payload: GrupoMaisRegisterPayload
): Promise<GrupoMaisRegisterResult> {
  if (!API_TOKEN) {
    console.error('[GrupoMais] GRUPOMAIS_API_TOKEN não configurado.')
    return { ok: false, error: 'Token do parceiro não configurado.', status: 500 }
  }

  // Garante que `produto` é INTEGER — ponto central do problema reportado
  const body = {
    ...payload,
    produto: Number(payload.produto), // << converte para number explicitamente
    doc: payload.doc.replace(/\D/g, ''), // apenas dígitos
  }

  // Validação local antes de enviar
  if (!Number.isInteger(body.produto) || body.produto < 1 || body.produto > 6) {
    return {
      ok: false,
      error: `Campo 'produto' inválido: ${payload.produto}. Deve ser inteiro entre 1 e 6.`,
      status: 400,
    }
  }
  if (!body.nome?.trim()) return { ok: false, error: "Campo 'nome' obrigatório.", status: 400 }
  if (!body.email?.trim()) return { ok: false, error: "Campo 'email' obrigatório.", status: 400 }
  if (!body.login?.trim()) return { ok: false, error: "Campo 'login' obrigatório.", status: 400 }
  if (!body.doc) return { ok: false, error: "Campo 'doc' obrigatório.", status: 400 }

  const endpoint = `${API_URL}/api/v1/partner_register`

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_TOKEN}`,
        'x-api-token': API_TOKEN,
      },
      body: JSON.stringify(body),
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      const errorMsg = data?.message ?? `Erro HTTP ${response.status}`
      console.error(`[GrupoMais] Erro ao registrar (${response.status}):`, errorMsg, {
        payload: { ...body, doc: '***' },
      })
      return { ok: false, error: errorMsg, status: response.status }
    }

    console.log('[GrupoMais] Cadastro realizado:', data?.data?.user_id, body.email)

    return {
      ok: true,
      userId: data.data.user_id,
      login: data.data.login,
      email: data.data.email,
      produto: data.data.produto,
      passtemp: data.data.pass_temp,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[GrupoMais] Falha de rede:', msg)
    return { ok: false, error: `Falha de conexão com o parceiro: ${msg}`, status: 502 }
  }
}