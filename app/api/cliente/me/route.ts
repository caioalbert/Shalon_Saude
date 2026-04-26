import { requireClienteAuth } from '@/lib/supabase/cliente-auth'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const auth = await requireClienteAuth()
    
    const supabase = await createClient()
    const { data: cadastro, error } = await supabase
      .from('cadastros')
      .select(`
        *,
        dependentes (*)
      `)
      .eq('id', auth.clienteId)
      .single()

    if (error || !cadastro) {
      return NextResponse.json(
        { error: 'Cadastro não encontrado.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ cadastro })
  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json(
        { error: 'Não autenticado.' },
        { status: 401 }
      )
    }

    console.error('Erro ao buscar dados do cliente:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar dados.' },
      { status: 500 }
    )
  }
}
