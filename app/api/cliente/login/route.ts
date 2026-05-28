import {
  formatCpfForDb,
  verifyCpfPrefix,
} from '@/lib/cliente-login-verify'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'shalom-saude-secret-key-change-in-production'
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cpf, cpf_prefix } = body

    if (!cpf) {
      return NextResponse.json({ error: 'CPF é obrigatório.' }, { status: 400 })
    }

    const hasPrefix =
      cpf_prefix !== undefined && cpf_prefix !== null && String(cpf_prefix).trim() !== ''
    if (!hasPrefix) {
      return NextResponse.json(
        {
          error: 'Informe os 4 primeiros dígitos do CPF.',
        },
        { status: 400 }
      )
    }

    const cpfClean = String(cpf).replace(/\D/g, '')
    if (cpfClean.length !== 11) {
      return NextResponse.json({ error: 'CPF inválido.' }, { status: 400 })
    }

    const prefixClean = String(cpf_prefix).replace(/\D/g, '')
    if (prefixClean.length !== 4) {
      return NextResponse.json(
        { error: 'Informe exatamente os 4 primeiros dígitos do CPF.' },
        { status: 400 }
      )
    }
    if (cpfClean.slice(0, 4) !== prefixClean) {
      return NextResponse.json(
        { error: 'CPF ou dígitos de confirmação incorretos.' },
        { status: 401 }
      )
    }

    const cpfFormatted = formatCpfForDb(cpfClean)

    const supabase = await createClient()
    const { data: cadastro, error } = await supabase
      .from('cadastros')
      .select('id, nome, email, cpf, status')
      .eq('cpf', cpfFormatted)
      .single()

    if (error || !cadastro) {
      return NextResponse.json(
        { error: 'CPF ou dígitos de confirmação incorretos.' },
        { status: 401 }
      )
    }

    const secondFactorOk = verifyCpfPrefix(cadastro, String(cpf_prefix))

    if (!secondFactorOk) {
      return NextResponse.json(
        { error: 'CPF ou dígitos de confirmação incorretos.' },
        { status: 401 }
      )
    }

    if (cadastro.status !== 'ATIVO') {
      return NextResponse.json(
        { error: 'Cadastro ainda não está ativo. Aguarde a confirmação do pagamento.' },
        { status: 403 }
      )
    }

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
      token,
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
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Erro no login do cliente:', error)
    return NextResponse.json({ error: 'Erro ao processar login.' }, { status: 500 })
  }
}
