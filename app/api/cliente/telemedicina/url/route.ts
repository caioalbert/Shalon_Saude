import { requireClienteAuth } from '@/lib/supabase/cliente-auth'
import { createClient } from '@/lib/supabase/server'
import { isRapidocAccessConfigured, resolveRapidocUrl } from '@/lib/rapidoc'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireClienteAuth(request)
    const supabase = await createClient()

    const { data: cadastro, error } = await supabase
      .from('cadastros')
      .select('id, nome, email, cpf, telefone, data_nascimento')
      .eq('id', auth.clienteId)
      .single()

    if (error || !cadastro) {
      return NextResponse.json({ error: 'Cadastro não encontrado.' }, { status: 404 })
    }

    if (!isRapidocAccessConfigured()) {
      return NextResponse.json({
        url:     null,
        warning: 'Integração com telemedicina não configurada. Contate o suporte SHALOM.',
      })
    }

    const result = await resolveRapidocUrl({
      id:              String(cadastro.id),
      nome:            String(cadastro.nome || auth.nome || ''),
      email:           cadastro.email,
      cpf:             cadastro.cpf,
      telefone:        cadastro.telefone,
      data_nascimento: cadastro.data_nascimento,
    })

    if (!result.ok) {
      // Retorna HTTP 200 com url:null e a mensagem específica do erro
      // para que o app nativo possa mostrar mensagem amigável sem tratar como erro de rede
      return NextResponse.json({
        url:     null,
        warning: result.message,
        reason:  result.reason,   // 'auth' | 'not_found' | 'api_error' | 'no_config'
      })
    }

    return NextResponse.json({ url: result.data.url })
  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
    }
    console.error('Erro ao gerar URL Rapidoc:', error)
    return NextResponse.json({ error: 'Erro ao gerar acesso à telemedicina.' }, { status: 500 })
  }
}
