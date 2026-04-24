import { listCadastrosWithIndicadores } from '@/lib/admin-cadastros'
import { requireAdminAuth } from '@/lib/supabase/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminAuth(request)
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const supabase = createAdminClient()

    const cadastrosComIndicadores = await listCadastrosWithIndicadores(supabase)

    return NextResponse.json({
      success: true,
      cadastros: cadastrosComIndicadores,
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Erro ao processar requisição' },
      { status: 500 }
    )
  }
}
