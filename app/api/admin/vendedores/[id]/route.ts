import { createAdminClient } from '@/lib/supabase/admin'
import { buildComissaoResumo } from '@/lib/comissoes'
import { requireAdminAuth } from '@/lib/supabase/admin-auth'
import { NextRequest, NextResponse } from 'next/server'

type RouteContext = { params: Promise<{ id: string }> }

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
      if (/column .*vendedor_id|vendedor_codigo|mensalidade_valor|adesao_pago_em|status|tipo_plano/i.test(details)) {
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

    const { data: pagamentosComissao, error: pagamentosComissaoError } = await supabase
      .from('vendedor_comissao_pagamentos')
      .select(
        'id, vendedor_id, mes_referencia, valor_total, pago_em, comprovante_path, comprovante_url, observacao, created_at, updated_at'
      )
      .eq('vendedor_id', vendedor.id)
      .order('mes_referencia', { ascending: false })

    if (pagamentosComissaoError) {
      const details = `${pagamentosComissaoError.message || ''} ${pagamentosComissaoError.details || ''}`
      if (/relation .*vendedor_comissao_pagamentos|does not exist|42P01|column .*mes_referencia/i.test(details)) {
        return NextResponse.json(
          {
            error:
              'Banco desatualizado. Execute scripts/008_add_vendedor_comissao_pagamentos.sql no Supabase SQL Editor.',
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

      return NextResponse.json({ error: 'Erro ao buscar pagamentos de comissão.' }, { status: 500 })
    }

    const allClientes = clientes || []
    const comissaoResumo = buildComissaoResumo(allClientes, pagamentosComissao || [])
    const totalPendentes = allClientes.length - comissaoResumo.totalVendasPagas
    const appBaseUrl = request.nextUrl.origin.replace(/\/$/, '')

    return NextResponse.json({
      success: true,
      vendedor: {
        id: vendedor.id,
        nome: vendedor.nome,
        email: vendedor.email,
        codigoIndicacao: vendedor.codigo_indicacao,
        ativo: vendedor.ativo,
        linkVenda: `${appBaseUrl}/cadastro?ref=${encodeURIComponent(vendedor.codigo_indicacao)}`,
      },
      resumo: {
        totalClientes: allClientes.length,
        vendasFechadas: comissaoResumo.totalVendasPagas,
        totalPendentes,
        comissaoMesAtual: comissaoResumo.comissaoMesAtualPendente,
        comissaoMesAtualBruta: comissaoResumo.comissaoMesAtualBruta,
        comissaoMesAtualPaga: comissaoResumo.comissaoMesAtualPaga,
        comissaoTotalBruta: comissaoResumo.comissaoTotalBruta,
        comissaoTotalPaga: comissaoResumo.comissaoTotalPaga,
        comissaoTotalDevida: comissaoResumo.comissaoTotalDevida,
      },
      comissoesMensais: comissaoResumo.comissoesMensais,
      clientes: allClientes,
    })
  } catch (error) {
    console.error('Admin vendedor detalhe error:', error)
    return NextResponse.json({ error: 'Erro ao processar requisição.' }, { status: 500 })
  }
}
