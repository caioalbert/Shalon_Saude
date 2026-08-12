import { createAdminClient } from './supabase/admin'
import { isMaisEduConfigured, registerUserOnMaisEdu } from './maisedu'

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

/**
 * Busca um cadastro completo do Supabase e cadastra o titular na plataforma MaisEdu.
 *
 * Comportamento:
 * - Somente cadastros com status ATIVO são sincronizados.
 * - CPF inválido (diferente de 11 dígitos) impede o envio.
 * - Erros de duplicidade (usuário já cadastrado) são tratados como sucesso silencioso,
 *   pois podem ocorrer em reprocessamentos retroativos.
 * - Dependentes não são enviados individualmente à MaisEdu nesta versão,
 *   pois a API de parceiros não possui um campo de vínculo familiar.
 */
export async function syncCadastroToMaisEdu(cadastroId: string) {
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

  // Se não estiver ATIVO, não sincroniza
  if (cadastro.status !== 'ATIVO') {
    return { success: false, error: 'Cadastro não está ATIVO' }
  }

  // Verifica configuração antes de prosseguir
  if (!isMaisEduConfigured()) {
    console.warn('[Sync MaisEdu] Integração não configurada (MAISEDU_API_TOKEN ausente).')
    return { success: false, error: 'Integração MaisEdu não configurada no servidor.' }
  }

  const cpfDigits = sanitizeDigits(cadastro.cpf)
  if (cpfDigits.length !== 11) {
    return { success: false, error: 'CPF do titular inválido' }
  }

  // 2. Cadastrar Titular na MaisEdu
  const result = await registerUserOnMaisEdu({
    nome: cadastro.nome,
    email: cadastro.email || `${cpfDigits}@shalomsaude.com.br`,
    login: cpfDigits,                                // CPF sem pontuação como login
    doc: cpfDigits,
    telefone: sanitizeDigits(cadastro.telefone) || undefined,
    cep: sanitizeDigits(cadastro.cep) || undefined,
    rua: cadastro.endereco || undefined,
    cidade: cadastro.cidade || undefined,
    estado: cadastro.estado || undefined,
    nascimento: formatDate(cadastro.data_nascimento) || undefined,
    tipo: 1,                                         // Pessoa Física
  })

  // Duplicidade não é erro em reprocessamentos (usuário já existe no MaisEdu)
  if (!result.ok && result.reason === 'duplicate') {
    console.log(`[Sync MaisEdu] Titular ${cadastro.nome} (CPF: ${cpfDigits}) já está cadastrado no MaisEdu.`)
    return { success: true, count: 1, skipped: true }
  }

  if (!result.ok) {
    console.error(`[Sync MaisEdu] Falha ao cadastrar ${cadastro.nome}:`, result.message)
    return { success: false, error: result.message }
  }

  console.log(`[Sync MaisEdu] Titular ${cadastro.nome} cadastrado com sucesso no MaisEdu. user_id: ${result.data.user_id}`)
  return { success: true, count: 1 }
}
