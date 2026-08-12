import { requireClienteAuth } from '@/lib/supabase/cliente-auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Rota de acesso ao serviço de Telemedicina.
 *
 * A integração com o provedor de telemedicina está em atualização.
 * Retorna url: null com aviso amigável enquanto o novo parceiro não é configurado.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireClienteAuth(request)

    // Suprime warnings de variável não usada — auth é validado acima para garantir
    // que apenas clientes autenticados acessem este endpoint.
    void auth

    return NextResponse.json({
      url: null,
      warning: 'O serviço de telemedicina está temporariamente indisponível. Em breve será reativado com o novo parceiro. Contate o suporte SHALOM para mais informações.',
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
    }
    console.error('Erro na rota de telemedicina:', error)
    return NextResponse.json({ error: 'Erro ao acessar telemedicina.' }, { status: 500 })
  }
}
