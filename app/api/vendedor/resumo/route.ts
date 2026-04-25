import { createAdminClient } from '@/lib/supabase/admin'
import { buildComissaoResumo } from '@/lib/comissoes'
import { requireSellerAuth } from '@/lib/supabase/seller-auth'
import { NextRequest, NextResponse } from 'next/server'

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

    const allCadastros = cadastros || []
    const comissaoResumo = buildComissaoResumo(allCadastros, pagamentosComissao || [])
    const totalPendentes = allCadastros.length - comissaoResumo.totalVendasPagas
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
        totalPagos: comissaoResumo.totalVendasPagas,
        totalPendentes,
        totalPagoMesAtual: comissaoResumo.comissaoMesAtualPendente,
        totalPagoMesAtualBruto: comissaoResumo.comissaoMesAtualBruta,
        totalPagoMesAtualPaga: comissaoResumo.comissaoMesAtualPaga,
        comissaoTotalPaga: comissaoResumo.comissaoTotalPaga,
        comissaoTotalDevida: comissaoResumo.comissaoTotalDevida,
      },
      comissoesMensais: comissaoResumo.comissoesMensais,
      cadastros: allCadastros,
    })
  } catch (error) {
    console.error('Vendedor resumo error:', error)
    return NextResponse.json({ error: 'Erro ao processar requisição.' }, { status: 500 })
  }
}
