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

    return NextResponse.json({
      success: true,
      cadastros: cadastros || [],
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Erro ao processar requisição' },
      { status: 500 }
    )
  }
}
