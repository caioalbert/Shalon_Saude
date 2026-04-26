import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'shalom-saude-secret-key-change-in-production'
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cpf, data_nascimento } = body

    if (!cpf || !data_nascimento) {
      return NextResponse.json(
        { error: 'CPF e data de nascimento são obrigatórios.' },
        { status: 400 }
      )
    }

    const cpfClean = cpf.replace(/\D/g, '')

    const supabase = await createClient()
    const { data: cadastro, error } = await supabase
      .from('cadastros')
      .select('id, nome, email, cpf, data_nascimento, status')
      .eq('cpf', cpfClean)
      .eq('data_nascimento', data_nascimento)
      .single()

    if (error || !cadastro) {
      return NextResponse.json(
        { error: 'CPF ou data de nascimento incorretos.' },
        { status: 401 }
      )
    }

    if (cadastro.status !== 'ATIVO') {
      return NextResponse.json(
        { error: 'Cadastro ainda não está ativo. Aguarde a confirmação do pagamento.' },
        { status: 403 }
      )
    }

    // Gerar token JWT
    const token = await new SignJWT({ 
      clienteId: cadastro.id,
      cpf: cadastro.cpf,
      nome: cadastro.nome,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET)

    const response = NextResponse.json({
      success: true,
      cliente: {
        id: cadastro.id,
        nome: cadastro.nome,
        email: cadastro.email,
      },
    })

    response.cookies.set('cliente_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 dias
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Erro no login do cliente:', error)
    return NextResponse.json(
      { error: 'Erro ao processar login.' },
      { status: 500 }
    )
  }
}
