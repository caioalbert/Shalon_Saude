import { createAdminClient } from '@/lib/supabase/admin'
import { syncCadastroToMaisEdu } from '@/lib/maisedu-sync'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Rota para sincronização em lote retroativa de clientes ativos com a MaisEdu.
 * Protegida por Bearer token (CRON_SECRET) se configurado.
 *
 * POST /api/admin/sync-maisedu
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const CRON_SECRET = process.env.CRON_SECRET

    // Se houver CRON_SECRET configurado, exigir autenticação Bearer
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
          errors.push({ id: cadastro.id, nome: cadastro.nome, error: result.error ?? 'Erro desconhecido' })
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
