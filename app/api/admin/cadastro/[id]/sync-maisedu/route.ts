import { syncCadastroToMaisEdu } from '@/lib/maisedu-sync'
import { requireAdminAuth } from '@/lib/supabase/admin-auth'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ id: string }> }

function normalizeCadastroId(value: unknown) {
  const id = String(value || '').trim()
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    ? id
    : ''
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const authResult = await requireAdminAuth(request)
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { id: rawId } = await context.params
    const cadastroId = normalizeCadastroId(rawId)

    if (!cadastroId) {
      return NextResponse.json({ error: 'ID de cliente inválido.' }, { status: 400 })
    }

    const result = await syncCadastroToMaisEdu(cadastroId)

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'error' in result ? result.error ?? 'Erro desconhecido' : 'Erro desconhecido',
        },
        { status: 400 }
      )
    }

    const skipped = 'skipped' in result && result.skipped === true

    return NextResponse.json({
      success: true,
      skipped,
      message: skipped
        ? 'O cliente já estava cadastrado na MaisEdu.'
        : 'Cliente cadastrado na MaisEdu com sucesso.',
    })
  } catch (error) {
    console.error('Erro ao cadastrar cliente na MaisEdu:', error)
    return NextResponse.json(
      { error: 'Erro ao cadastrar cliente na MaisEdu.' },
      { status: 500 }
    )
  }
}
