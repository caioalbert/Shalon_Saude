import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação (simplificado, em produção usar middleware mais robusto)
    const token = request.cookies.get('supabase-auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // Buscar todos os cadastros
    const { data: cadastros, error } = await supabase
      .from('cadastros')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar cadastros' },
        { status: 500 }
      )
    }

    const cadastroIds = (cadastros || []).map((cadastro) => cadastro.id)
    let dependentesSemRgByCadastroId = new Map<string, number>()

    if (cadastroIds.length > 0) {
      const { data: dependentes, error: dependentesError } = await supabase
        .from('dependentes')
        .select('cadastro_id, rg')
        .in('cadastro_id', cadastroIds)

      if (dependentesError) {
        console.error('Dependentes lookup error:', dependentesError)
      } else {
        dependentesSemRgByCadastroId = (dependentes || []).reduce((acc, dependente) => {
          if (!String(dependente.rg || '').trim()) {
            const current = acc.get(dependente.cadastro_id) || 0
            acc.set(dependente.cadastro_id, current + 1)
          }
          return acc
        }, new Map<string, number>())
      }
    }

    const cadastrosComIndicadores = (cadastros || []).map((cadastro) => ({
      ...cadastro,
      dependentes_sem_rg_count: dependentesSemRgByCadastroId.get(cadastro.id) || 0,
    }))

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
