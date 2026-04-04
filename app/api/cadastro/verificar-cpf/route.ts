import { createClient } from '@/lib/supabase/server'
import { isValidCPF } from '@/lib/utils'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const cpf = String(request.nextUrl.searchParams.get('cpf') || '').trim()

    if (!cpf) {
      return NextResponse.json({ error: 'CPF é obrigatório' }, { status: 400 })
    }

    if (!isValidCPF(cpf)) {
      return NextResponse.json({ exists: false, valid: false })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('cadastros')
      .select('id')
      .eq('cpf', cpf)
      .limit(1)

    if (error) {
      const details = `${error.message || ''} ${error.details || ''}`
      if (/fetch failed|enotfound|getaddrinfo|network/i.test(details)) {
        return NextResponse.json(
          {
            error:
              'Falha ao conectar no Supabase. Verifique NEXT_PUBLIC_SUPABASE_URL e as chaves no arquivo .env/.env.local.',
          },
          { status: 503 }
        )
      }

      return NextResponse.json(
        { error: error.message || 'Erro ao validar CPF' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      exists: Boolean((data || []).length),
      valid: true,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/fetch failed|enotfound|getaddrinfo|network/i.test(message)) {
      return NextResponse.json(
        {
          error:
            'Falha ao conectar no Supabase. Verifique NEXT_PUBLIC_SUPABASE_URL e as chaves no arquivo .env/.env.local.',
        },
        { status: 503 }
      )
    }

    console.error('CPF check error:', error)
    return NextResponse.json({ error: 'Erro ao validar CPF' }, { status: 500 })
  }
}
