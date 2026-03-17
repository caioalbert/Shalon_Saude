import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('supabase-auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const supabase = await createClient()
    const { id } = await context.params

    if (!id) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    // Buscar cadastro
    const { data: cadastro, error: cadastroError } = await supabase
      .from('cadastros')
      .select('*')
      .eq('id', id)
      .single()

    if (cadastroError) {
      console.error('Cadastro error:', cadastroError)
      if (cadastroError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Cadastro não encontrado' },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { error: 'Erro ao buscar cadastro' },
        { status: 500 }
      )
    }

    // Buscar dependentes
    const { data: dependentes, error: dependentesError } = await supabase
      .from('dependentes')
      .select('*')
      .eq('cadastro_id', id)
      .order('created_at', { ascending: false })

    if (dependentesError) {
      console.error('Dependentes error:', dependentesError)
    }

    return NextResponse.json({
      success: true,
      cadastro,
      dependentes: dependentes || [],
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Erro ao processar requisição' },
      { status: 500 }
    )
  }
}
