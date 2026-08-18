import { createAdminClient } from '@/lib/supabase/admin'
import { syncCadastroToMaisEdu } from '@/lib/maisedu-sync'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

type SyncMaisEduRequestBody = {
  cadastroId?: unknown
}

function normalizeCadastroId(value: unknown) {
  const id = String(value || '').trim()
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    ? id
    : ''
}

async function getRequestedCadastroId(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as SyncMaisEduRequestBody | null
  return normalizeCadastroId(body?.cadastroId)
}

/**
 * Rota para sincronização em lote retroativa de clientes ativos com a MaisEdu.
 * Protegida por Bearer token (CRON_SECRET).
 *
 * POST /api/admin/sync-maisedu
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const CRON_SECRET = process.env.CRON_SECRET?.trim()

    if (!CRON_SECRET) {
      console.error('[Sync MaisEdu API] CRON_SECRET não configurado.')
      return NextResponse.json(
        { error: 'Sincronização MaisEdu indisponível: CRON_SECRET não configurado.' },
        { status: 503 }
      )
    }

    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cadastroId = await getRequestedCadastroId(request)

    if (cadastroId) {
      const result = await syncCadastroToMaisEdu(cadastroId)

      if (!result.success) {
        return NextResponse.json(
          {
            message: 'Falha ao sincronizar cadastro com MaisEdu.',
            cadastroId,
            error: 'error' in result ? result.error ?? 'Erro desconhecido' : 'Erro desconhecido',
          },
          { status: 400 }
        )
      }

      return NextResponse.json({
        message: 'Cadastro sincronizado com MaisEdu.',
        cadastroId,
        skipped: Boolean((result as { skipped?: boolean }).skipped),
      })
    }

    const supabase = createAdminClient()

    // Buscar todos os cadastros ATIVOS
    const { data: cadastros, error } = await supabase
      .from('cadastros')
      .select('id, nome, cpf')
      .eq('status', 'ATIVO')

    if (error) {
      throw error
    }

    if (!cadastros || cadastros.length === 0) {
      return NextResponse.json({ message: 'Nenhum cadastro ativo encontrado.' })
    }

    let successCount = 0
    let skippedCount = 0
    let errorCount = 0
    const errors: { id: string; nome: string; error: string }[] = []

    // Processar sequencialmente para respeitar possível rate limit da MaisEdu
    for (const cadastro of cadastros) {
      try {
        const result = await syncCadastroToMaisEdu(cadastro.id)
        if (result.success) {
          if ((result as { skipped?: boolean }).skipped) {
            skippedCount++
          } else {
            successCount++
          }
        } else {
          errorCount++
          errors.push({
            id: cadastro.id,
            nome: cadastro.nome,
            error: 'error' in result ? result.error ?? 'Erro desconhecido' : 'Erro desconhecido',
          })
        }
      } catch (err) {
        errorCount++
        errors.push({ id: cadastro.id, nome: cadastro.nome, error: String(err) })
      }

      // Pequeno delay para evitar throttling na API da MaisEdu
      await new Promise(r => setTimeout(r, 300))
    }

    return NextResponse.json({
      message: 'Sincronização com MaisEdu finalizada.',
      stats: {
        total_verificados: cadastros.length,
        cadastrados: successCount,
        ja_existiam: skippedCount,
        erros: errorCount,
      },
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('[Sync MaisEdu API] Erro fatal:', error)
    return NextResponse.json({ error: 'Erro interno ao sincronizar com MaisEdu.' }, { status: 500 })
  }
}
