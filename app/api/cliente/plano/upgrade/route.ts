import { requireClienteAuth } from '@/lib/supabase/cliente-auth'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireClienteAuth(request)

    if (auth.tipo !== 'titular') {
      return NextResponse.json(
        { error: 'Apenas o titular pode fazer upgrade de plano.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { target_plan } = body

    if (!target_plan || target_plan !== 'FAMILIAR') {
      return NextResponse.json(
        { error: 'Plano de destino inválido.' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verificar plano atual
    const { data: cadastro, error: cadastroError } = await supabase
      .from('cadastros')
      .select('tipo_plano, asaas_subscription_id')
      .eq('id', auth.clienteId)
      .single()

    if (cadastroError || !cadastro) {
      return NextResponse.json(
        { error: 'Cadastro não encontrado.' },
        { status: 404 }
      )
    }

    if (cadastro.tipo_plano === 'FAMILIAR') {
      return NextResponse.json(
        { error: 'Você já está no plano familiar.' },
        { status: 400 }
      )
    }

    // Atualizar plano
    const { error: updateError } = await supabase
      .from('cadastros')
      .update({ tipo_plano: 'FAMILIAR' })
      .eq('id', auth.clienteId)

    if (updateError) {
      console.error('Erro ao atualizar plano:', updateError)
      return NextResponse.json(
        { error: 'Erro ao atualizar plano.' },
        { status: 500 }
      )
    }

    // Buscar dependentes para calcular valor
    const { count: dependentesCount } = await supabase
      .from('dependentes')
      .select('*', { count: 'exact', head: true })
      .eq('cadastro_id', auth.clienteId)

    // Calcular novo valor (será implementado na próxima etapa)
    // Por enquanto, apenas retornar sucesso
    
    return NextResponse.json({
      success: true,
      message: 'Upgrade realizado com sucesso.',
      new_plan: 'FAMILIAR',
      dependentes_count: dependentesCount || 0,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json(
        { error: 'Não autenticado.' },
        { status: 401 }
      )
    }

    console.error('Erro ao fazer upgrade de plano:', error)
    return NextResponse.json(
      { error: 'Erro ao processar upgrade.' },
      { status: 500 }
    )
  }
}
