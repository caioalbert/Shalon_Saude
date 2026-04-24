import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_CONNECTIVITY_REGEX =
  /fetch failed|enotfound|getaddrinfo|network|ssl handshake|tls|cloudflare|error code 52\d|<html|<!doctype/i

function isSupabaseConnectivityIssue(details: string) {
  return SUPABASE_CONNECTIVITY_REGEX.test(details)
}

export async function GET(request: NextRequest) {
  try {
    const ref = String(request.nextUrl.searchParams.get('ref') || '').trim().toUpperCase()
    if (!ref) {
      return NextResponse.json({ error: 'Código de indicação é obrigatório.' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: vendedor, error } = await supabase
      .from('vendedores')
      .select('id, nome, codigo_indicacao, ativo')
      .eq('codigo_indicacao', ref)
      .maybeSingle()

    if (error) {
      const details = `${error.message || ''} ${error.details || ''}`
      if (/relation .*vendedores|does not exist|42P01|column .*vendedor_id|vendedor_codigo/i.test(details)) {
        return NextResponse.json(
          {
            error: 'Banco desatualizado. Execute scripts/007_add_vendedores_module.sql no Supabase SQL Editor.',
          },
          { status: 500 }
        )
      }

      if (isSupabaseConnectivityIssue(details)) {
        return NextResponse.json(
          {
            error:
              'Não foi possível validar o consultor agora. Tente novamente em alguns minutos.',
          },
          { status: 503 }
        )
      }

      console.error('Public vendedor lookup error:', error)
      return NextResponse.json({ error: 'Erro ao consultar consultor.' }, { status: 500 })
    }

    if (!vendedor || vendedor.ativo !== true) {
      return NextResponse.json({ error: 'Consultor não encontrado para este link.' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      vendedor: {
        id: vendedor.id,
        nome: vendedor.nome,
        codigoIndicacao: vendedor.codigo_indicacao,
      },
    })
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error)
    if (isSupabaseConnectivityIssue(details)) {
      return NextResponse.json(
        { error: 'Não foi possível validar o consultor agora. Tente novamente em alguns minutos.' },
        { status: 503 }
      )
    }

    console.error('Public vendedor route error:', error)
    return NextResponse.json({ error: 'Erro ao consultar consultor.' }, { status: 500 })
  }
}
