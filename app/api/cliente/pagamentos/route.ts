import { requireClienteAuth } from '@/lib/supabase/cliente-auth'
import { createClient } from '@/lib/supabase/server'
import { listAsaasSubscriptionPayments } from '@/lib/asaas'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const auth = await requireClienteAuth()
    
    const supabase = await createClient()
    const { data: cadastro, error } = await supabase
      .from('cadastros')
      .select('asaas_customer_id, asaas_subscription_id, asaas_payment_id')
      .eq('id', auth.clienteId)
      .single()

    if (error || !cadastro) {
      return NextResponse.json(
        { error: 'Cadastro não encontrado.' },
        { status: 404 }
      )
    }

    if (!cadastro.asaas_subscription_id) {
      return NextResponse.json({ 
        payments: [],
        subscriptionId: null,
        message: 'Nenhuma assinatura encontrada. Aguarde a confirmação do pagamento de adesão.',
      })
    }

    try {
      const payments = await listAsaasSubscriptionPayments(cadastro.asaas_subscription_id)

      return NextResponse.json({ 
        payments,
        subscriptionId: cadastro.asaas_subscription_id,
      })
    } catch (asaasError) {
      console.error('Erro ao buscar pagamentos no Asaas:', asaasError)
      
      return NextResponse.json({ 
        payments: [],
        subscriptionId: cadastro.asaas_subscription_id,
        message: 'Não foi possível buscar os pagamentos no momento. Tente novamente mais tarde.',
      })
    }
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
