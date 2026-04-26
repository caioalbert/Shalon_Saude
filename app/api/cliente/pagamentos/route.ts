import { requireClienteAuth } from '@/lib/supabase/cliente-auth'
import { createClient } from '@/lib/supabase/server'
import { listAsaasPayments } from '@/lib/asaas'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const auth = await requireClienteAuth()
    
    const supabase = await createClient()
    const { data: cadastro, error } = await supabase
      .from('cadastros')
      .select('asaas_customer_id, asaas_subscription_id')
      .eq('id', auth.clienteId)
      .single()

    if (error || !cadastro || !cadastro.asaas_customer_id) {
      return NextResponse.json(
        { error: 'Cadastro não encontrado.' },
        { status: 404 }
      )
    }

    const payments = await listAsaasPayments(cadastro.asaas_customer_id)

    return NextResponse.json({ 
      payments,
      subscriptionId: cadastro.asaas_subscription_id,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json(
        { error: 'Não autenticado.' },
        { status: 401 }
      )
    }

    console.error('Erro ao buscar pagamentos:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar pagamentos.' },
      { status: 500 }
    )
  }
}
