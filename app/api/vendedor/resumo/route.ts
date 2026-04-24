import { createAdminClient } from '@/lib/supabase/admin'
import { requireSellerAuth } from '@/lib/supabase/seller-auth'
import { NextRequest, NextResponse } from 'next/server'

function toStartOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function toStartOfNextMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1)
}

export async function GET(request: NextRequest) {
  const authResult = await requireSellerAuth(request)
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const supabase = createAdminClient()

    const { data: vendedor, error: vendedorError } = await supabase
      .from('vendedores')
      .select('id, nome, email, codigo_indicacao, ativo, created_at, updated_at')
      .eq('id', authResult.vendedorId)
      .maybeSingle()

    if (vendedorError) {
      const details = `${vendedorError.message || ''} ${vendedorError.details || ''}`
      if (/relation .*vendedores|does not exist|42P01|column .*vendedor_id/i.test(details)) {
        return NextResponse.json(
          {
            error:
              'Banco desatualizado. Execute scripts/007_add_vendedores_module.sql no Supabase SQL Editor.',
          },
          { status: 500 }
        )
      }

      if (/fetch failed|enotfound|getaddrinfo|network/i.test(details)) {
        return NextResponse.json(
          {
            error:
              'Falha ao conectar no Supabase. Verifique NEXT_PUBLIC_SUPABASE_URL e as chaves no arquivo .env/.env.local.',
          },
          { status: 503 }
        )
      }

      return NextResponse.json({ error: 'Erro ao buscar vendedor.' }, { status: 500 })
    }

    if (!vendedor || vendedor.ativo !== true) {
      return NextResponse.json({ error: 'Vendedor inativo ou não encontrado.' }, { status: 403 })
    }

    const { data: cadastros, error: cadastrosError } = await supabase
      .from('cadastros')
      .select('id, nome, email, cpf, status, created_at, adesao_pago_em, mensalidade_valor, vendedor_codigo')
      .eq('vendedor_id', vendedor.id)
      .order('created_at', { ascending: false })

    if (cadastrosError) {
      const details = `${cadastrosError.message || ''} ${cadastrosError.details || ''}`
      if (/column .*vendedor_id|vendedor_codigo|mensalidade_valor|adesao_pago_em|status/i.test(details)) {
        return NextResponse.json(
          {
            error:
              'Banco desatualizado. Execute scripts/006_add_plan_type_pricing.sql e scripts/007_add_vendedores_module.sql no Supabase SQL Editor.',
          },
          { status: 500 }
        )
      }

      if (/fetch failed|enotfound|getaddrinfo|network/i.test(details)) {
        return NextResponse.json(
          {
            error:
              'Falha ao conectar no Supabase. Verifique NEXT_PUBLIC_SUPABASE_URL e as chaves no arquivo .env/.env.local.',
          },
          { status: 503 }
        )
      }

      return NextResponse.json({ error: 'Erro ao buscar clientes do vendedor.' }, { status: 500 })
    }

    const allCadastros = cadastros || []

    const now = new Date()
    const monthStart = toStartOfMonth(now)
    const monthEnd = toStartOfNextMonth(now)

    let totalPagoMesAtual = 0
    let totalPagos = 0

    allCadastros.forEach((cadastro) => {
      const isPago = cadastro.status === 'ATIVO' && cadastro.adesao_pago_em
      if (!isPago) return

      totalPagos += 1
      const valor = Number(cadastro.mensalidade_valor)
      const valorSeguro = Number.isFinite(valor) ? valor : 0

      const pagoEm = new Date(String(cadastro.adesao_pago_em))
      if (!Number.isNaN(pagoEm.getTime()) && pagoEm >= monthStart && pagoEm < monthEnd) {
        totalPagoMesAtual += valorSeguro
      }
    })

    const totalPendentes = allCadastros.length - totalPagos
    const appBaseUrl = request.nextUrl.origin.replace(/\/$/, '')

    return NextResponse.json({
      success: true,
      vendedor: {
        id: vendedor.id,
        nome: vendedor.nome,
        email: vendedor.email,
        codigoIndicacao: vendedor.codigo_indicacao,
        linkVenda: `${appBaseUrl}/cadastro?ref=${encodeURIComponent(vendedor.codigo_indicacao)}`,
      },
      resumo: {
        totalClientes: allCadastros.length,
        totalPagos,
        totalPendentes,
        totalPagoMesAtual: Math.round((totalPagoMesAtual + Number.EPSILON) * 100) / 100,
      },
      cadastros: allCadastros,
    })
  } catch (error) {
    console.error('Vendedor resumo error:', error)
    return NextResponse.json({ error: 'Erro ao processar requisição.' }, { status: 500 })
  }
}
