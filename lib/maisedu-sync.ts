import { createAdminClient } from './supabase/admin'
import { isMaisEduConfigured, registerUserOnMaisEdu } from './maisedu'
import { getMaisEduProductId } from './maisedu-products'

type MaisEduSyncStatus = 'PENDENTE' | 'SINCRONIZADO' | 'JA_EXISTIA' | 'ERRO' | 'IGNORADO'

type MaisEduSyncUpdate = {
  status: MaisEduSyncStatus
  userId?: number | null
  error?: string | null
  syncedAt?: string | null
}

type MaisEduSyncOptions = {
  force?: boolean
}

function sanitizeDigits(value?: string | null) {
  return String(value || '').replace(/\D/g, '')
}

function formatDate(date: string | Date | null) {
  if (!date) return undefined
  try {
    const d = new Date(date)
    return d.toISOString().split('T')[0] // yyyy-MM-dd
  } catch {
    return undefined
  }
}

async function updateMaisEduSyncStatus(
  cadastroId: string,
  update: MaisEduSyncUpdate
) {
  const supabase = createAdminClient()
  const updatePayload: Record<string, string | number | null> = {
    maisedu_status: update.status,
  }

  if ('userId' in update) {
    updatePayload.maisedu_user_id = update.userId ?? null
  }

  if ('syncedAt' in update) {
    updatePayload.maisedu_synced_at = update.syncedAt ?? null
  }

  if ('error' in update) {
    updatePayload.maisedu_last_error = update.error ?? null
  }

  const { error: updateError } = await supabase
    .from('cadastros')
    .update(updatePayload)
    .eq('id', cadastroId)

  if (updateError) {
    console.error('[Sync MaisEdu] Erro ao atualizar status da integração no cadastro:', {
      cadastroId,
      status: update.status,
      message: updateError.message,
      details: updateError.details,
    })
  }
}

async function failMaisEduSync(cadastroId: string, message: string) {
  await updateMaisEduSyncStatus(cadastroId, {
    status: 'ERRO',
    error: message,
  })

  return { success: false, error: message }
}

/**
 * Busca um cadastro completo do Supabase e cadastra o titular na plataforma MaisEdu.
 *
 * Comportamento:
 * - Somente cadastros com status ATIVO são sincronizados.
 * - Cadastros já sincronizados retornam sucesso sem novo envio, exceto quando
 *   a chamada manual solicita um reenvio forçado.
 * - CPF inválido (diferente de 11 dígitos) impede o envio.
 * - Duplicidade sem user_id e produto confirmados não é considerada sucesso.
 * - Dependentes não são enviados individualmente à MaisEdu nesta versão,
 *   pois a API de parceiros não possui um campo de vínculo familiar.
 */
export async function syncCadastroToMaisEdu(
  cadastroId: string,
  options: MaisEduSyncOptions = {}
) {
  const supabase = createAdminClient()

  // 1. Buscar Cadastro
  const { data: cadastro, error: cadastroError } = await supabase
    .from('cadastros')
    .select('*')
    .eq('id', cadastroId)
    .single()

  if (cadastroError || !cadastro) {
    console.error('[Sync MaisEdu] Erro ao buscar cadastro:', cadastroError)
    return { success: false, error: 'Cadastro não encontrado' }
  }

  const maisEduStatus = String(cadastro.maisedu_status || '').trim().toUpperCase()
  const maisEduUserId = Number(cadastro.maisedu_user_id)
  const hasMaisEduUserId = Number.isFinite(maisEduUserId) && maisEduUserId > 0
  const confirmedSync = maisEduStatus === 'SINCRONIZADO' && hasMaisEduUserId
  const alreadySynced =
    confirmedSync ||
    maisEduStatus === 'JA_EXISTIA' ||
    hasMaisEduUserId

  if (confirmedSync || (alreadySynced && !options.force)) {
    return {
      success: true,
      count: 0,
      skipped: true,
      userId: hasMaisEduUserId ? maisEduUserId : undefined,
    }
  }

  // Se não estiver ATIVO, não sincroniza
  if (cadastro.status !== 'ATIVO') {
    await updateMaisEduSyncStatus(cadastroId, {
      status: 'IGNORADO',
      error: 'Cadastro não está ATIVO',
    })
    return { success: false, error: 'Cadastro não está ATIVO' }
  }

  // Verifica configuração antes de prosseguir
  if (!isMaisEduConfigured()) {
    console.warn('[Sync MaisEdu] Integração não configurada (MAISEDU_API_TOKEN ausente).')
    return failMaisEduSync(cadastroId, 'Integração MaisEdu não configurada no servidor.')
  }

  const cpfDigits = sanitizeDigits(cadastro.cpf)
  if (cpfDigits.length !== 11) {
    return failMaisEduSync(cadastroId, 'CPF do titular inválido')
  }

  const produto = getMaisEduProductId(cadastro.tipo_plano)
  if (!produto) {
    const internalPlanCode = String(cadastro.tipo_plano || '').trim() || 'NÃO INFORMADO'
    return failMaisEduSync(
      cadastroId,
      `Plano interno ${internalPlanCode} sem produto MaisEdu configurado.`
    )
  }

  // 2. Cadastrar Titular na MaisEdu
  const result = await registerUserOnMaisEdu({
    nome: cadastro.nome,
    email: cadastro.email || `${cpfDigits}@shalomsaude.com.br`,
    login: cpfDigits,                                // CPF sem pontuação como login
    doc: cpfDigits,
    produto,
    telefone: sanitizeDigits(cadastro.telefone) || undefined,
    cep: sanitizeDigits(cadastro.cep) || undefined,
    rua: cadastro.endereco || undefined,
    numero: cadastro.numero || undefined,
    bairro: cadastro.bairro || undefined,
    cidade: cadastro.cidade || undefined,
    estado: cadastro.estado || undefined,
    nascimento: formatDate(cadastro.data_nascimento) || undefined,
  })

  // Duplicidade não confirma que o produto solicitado foi ativado. O registro
  // permanece reenviável para que o administrador tente novamente após a
  // regularização do usuário junto ao parceiro.
  if (!result.ok && result.reason === 'duplicate') {
    console.log(`[Sync MaisEdu] Titular ${cadastro.nome} (CPF: ${cpfDigits}) já está cadastrado no MaisEdu.`)
    const partnerMessage = result.message || 'Usuário já cadastrado na MaisEdu.'
    const duplicateMessage =
      `A MaisEdu recusou o reenvio: ${partnerMessage} A resposta não confirmou a ativação do produto. Solicite ao suporte MaisEdu a regularização ou exclusão do cadastro e tente novamente.`

    await updateMaisEduSyncStatus(cadastroId, {
      status: 'JA_EXISTIA',
      syncedAt: null,
      error: partnerMessage,
    })
    return { success: false, reason: 'duplicate' as const, error: duplicateMessage }
  }

  if (!result.ok) {
    console.error(`[Sync MaisEdu] Falha ao cadastrar ${cadastro.nome}:`, result.message)
    return failMaisEduSync(cadastroId, result.message)
  }

  console.log(`[Sync MaisEdu] Titular ${cadastro.nome} cadastrado com sucesso no MaisEdu. user_id: ${result.data.user_id}`)
  await updateMaisEduSyncStatus(cadastroId, {
    status: 'SINCRONIZADO',
    userId: result.data.user_id || null,
    syncedAt: new Date().toISOString(),
    error: null,
  })
  return {
    success: true,
    count: 1,
    userId: result.data.user_id,
    login: result.data.login,
    temporaryPassword: result.data.pass_temp,
  }
}
