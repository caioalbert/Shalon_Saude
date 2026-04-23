import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminAuth } from '@/lib/supabase/admin-auth'
import { NextRequest, NextResponse } from 'next/server'

type RouteContext = { params: Promise<{ id: string }> }

function toStartOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function toStartOfNextMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1)
}

async function getValidatedId(context: RouteContext) {
  const { id } = await context.params
  return id?.trim() || null
}

export async function GET(request: NextRequest, context: RouteContext) {
  const authResult = await requireAdminAuth(request)
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const vendedorId = await getValidatedId(context)
    if (!vendedorId) {
      return NextResponse.json({ error: 'ID de vendedor inválido.' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: vendedor, error: vendedorError } = await supabase
      .from('vendedores')
      .select('id, nome, email, codigo_indicacao, ativo, created_at, updated_at')
      .eq('id', vendedorId)
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

    if (!vendedor) {
      return NextResponse.json({ error: 'Vendedor não encontrado.' }, { status: 404 })
    }

    const { data: clientes, error: clientesError } = await supabase
      .from('cadastros')
      .select(
        'id, nome, email, cpf, status, created_at, adesao_pago_em, mensalidade_valor, vendedor_codigo, tipo_plano'
      )
      .eq('vendedor_id', vendedor.id)
      .order('created_at', { ascending: false })

    if (clientesError) {
      const details = `${clientesError.message || ''} ${clientesError.details || ''}`
      if (
        /column .*vendedor_id|vendedor_codigo|mensalidade_valor|adesao_pago_em|status|tipo_plano/i.test(
          details
        )
      ) {
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

    const allClientes = clientes || []

    const now = new Date()
    const monthStart = toStartOfMonth(now)
    const monthEnd = toStartOfNextMonth(now)

    let vendasFechadas = 0
    let comissaoTotalDevida = 0
    let comissaoMesAtual = 0

    allClientes.forEach((cliente) => {
      const isPago = cliente.status === 'ATIVO' && cliente.adesao_pago_em
      if (!isPago) return

      vendasFechadas += 1

      const valor = Number(cliente.mensalidade_valor)
      const valorSeguro = Number.isFinite(valor) ? valor : 0
      comissaoTotalDevida += valorSeguro

      const pagoEm = new Date(String(cliente.adesao_pago_em))
      if (!Number.isNaN(pagoEm.getTime()) && pagoEm >= monthStart && pagoEm < monthEnd) {
        comissaoMesAtual += valorSeguro
      }
    })

    const totalPendentes = allClientes.length - vendasFechadas
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '')

    return NextResponse.json({
      success: true,
      vendedor: {
        id: vendedor.id,
        nome: vendedor.nome,
        email: vendedor.email,
        codigoIndicacao: vendedor.codigo_indicacao,
        ativo: vendedor.ativo,
        linkVenda: appUrl
          ? `${appUrl}/cadastro?ref=${encodeURIComponent(vendedor.codigo_indicacao)}`
          : `/cadastro?ref=${encodeURIComponent(vendedor.codigo_indicacao)}`,
      },
      resumo: {
        totalClientes: allClientes.length,
        vendasFechadas,
        totalPendentes,
        comissaoMesAtual: Math.round((comissaoMesAtual + Number.EPSILON) * 100) / 100,
        comissaoTotalDevida: Math.round((comissaoTotalDevida + Number.EPSILON) * 100) / 100,
      },
      clientes: allClientes,
    })
  } catch (error) {
    console.error('Admin vendedor detalhe error:', error)
    return NextResponse.json({ error: 'Erro ao processar requisição.' }, { status: 500 })
  }
}
