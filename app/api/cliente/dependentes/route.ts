import { requireClienteAuth } from '@/lib/supabase/cliente-auth'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET - Listar dependentes
export async function GET(request: NextRequest) {
  try {
    const auth = await requireClienteAuth(request)
    
    const supabase = await createClient()
    const { data: dependentes, error } = await supabase
      .from('dependentes')
      .select('*')
      .eq('cadastro_id', auth.clienteId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Erro ao buscar dependentes:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar dependentes.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      dependentes: dependentes || [],
      canManage: auth.tipo === 'titular',
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json(
        { error: 'Não autenticado.' },
        { status: 401 }
      )
    }

    console.error('Erro ao buscar dependentes:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar dependentes.' },
      { status: 500 }
    )
  }
}

// POST - Adicionar dependente
export async function POST(request: NextRequest) {
  try {
    const auth = await requireClienteAuth(request)

    if (auth.tipo !== 'titular') {
      return NextResponse.json(
        { error: 'Apenas o titular pode adicionar dependentes.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { nome, cpf, data_nascimento, relacao, email, telefone_celular, sexo } = body

    if (!nome || !cpf || !data_nascimento || !relacao) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: nome, cpf, data_nascimento, relacao' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    // Verificar CPF duplicado
    const cpfClean = cpf.replace(/\D/g, '')
    const { data: cpfExists } = await supabase
      .from('cadastros')
      .select('id')
      .eq('cpf', cpfClean)
      .maybeSingle()

    if (cpfExists) {
      return NextResponse.json(
        { error: 'Este CPF já está cadastrado como titular.' },
        { status: 409 }
      )
    }

    const { data: cpfDependenteExists } = await supabase
      .from('dependentes')
      .select('id')
      .eq('cpf', cpfClean)
      .maybeSingle()

    if (cpfDependenteExists) {
      return NextResponse.json(
        { error: 'Este CPF já está cadastrado como dependente.' },
        { status: 409 }
      )
    }

    // Verificar se o plano permite dependentes
    const { data: cadastro } = await supabase
      .from('cadastros')
      .select('tipo_plano')
      .eq('id', auth.clienteId)
      .single()

    if (!cadastro) {
      return NextResponse.json(
        { error: 'Cadastro não encontrado.' },
        { status: 404 }
      )
    }

    // Buscar configuração do plano
    const { data: plano } = await supabase
      .from('planos')
      .select('permite_dependentes, max_dependentes')
      .eq('codigo', cadastro.tipo_plano)
      .eq('ativo', true)
      .single()

    if (!plano || !plano.permite_dependentes) {
      return NextResponse.json(
        { error: 'Seu plano não permite adicionar dependentes. Faça upgrade para um plano familiar.' },
        { status: 403 }
      )
    }

    // Verificar limite de dependentes
    if (plano.max_dependentes !== null) {
      const { count } = await supabase
        .from('dependentes')
        .select('*', { count: 'exact', head: true })
        .eq('cadastro_id', auth.clienteId)

      if (count !== null && count >= plano.max_dependentes) {
        return NextResponse.json(
          { error: `Você atingiu o limite de ${plano.max_dependentes} dependentes do seu plano.` },
          { status: 403 }
        )
      }
    }

    const { data: dependente, error } = await supabase
      .from('dependentes')
      .insert([
        {
          cadastro_id: auth.clienteId,
          nome,
          cpf: cpf.replace(/\D/g, ''),
          data_nascimento,
          relacao,
          email: email || null,
          telefone_celular: telefone_celular || null,
          sexo: sexo || null,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('Erro ao adicionar dependente:', error)
      return NextResponse.json(
        { error: 'Erro ao adicionar dependente.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ dependente })
  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json(
        { error: 'Não autenticado.' },
        { status: 401 }
      )
    }

    console.error('Erro ao adicionar dependente:', error)
    return NextResponse.json(
      { error: 'Erro ao adicionar dependente.' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar dependente
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireClienteAuth(request)

    if (auth.tipo !== 'titular') {
      return NextResponse.json(
        { error: 'Apenas o titular pode alterar dependentes.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { id, nome, cpf, data_nascimento, relacao, email, telefone_celular, sexo } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID do dependente é obrigatório' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    // Verificar se o dependente pertence ao cliente
    const { data: existing } = await supabase
      .from('dependentes')
      .select('id, cpf')
      .eq('id', id)
      .eq('cadastro_id', auth.clienteId)
      .single()

    if (!existing) {
      return NextResponse.json(
        { error: 'Dependente não encontrado.' },
        { status: 404 }
      )
    }

    // Verificar CPF duplicado apenas se o CPF foi alterado
    if (cpf) {
      const cpfClean = cpf.replace(/\D/g, '')
      const cpfExistente = existing.cpf?.replace(/\D/g, '')

      if (cpfClean !== cpfExistente) {
        const { data: cpfCadastro } = await supabase
          .from('cadastros')
          .select('id')
          .eq('cpf', cpfClean)
          .maybeSingle()

        if (cpfCadastro) {
          return NextResponse.json(
            { error: 'Este CPF já está cadastrado como titular.' },
            { status: 409 }
          )
        }

        const { data: cpfDependente } = await supabase
          .from('dependentes')
          .select('id')
          .eq('cpf', cpfClean)
          .neq('id', id)
          .maybeSingle()

        if (cpfDependente) {
          return NextResponse.json(
            { error: 'Este CPF já está cadastrado como dependente.' },
            { status: 409 }
          )
        }
      }
    }

    const { data: dependente, error } = await supabase
      .from('dependentes')
      .update({
        nome,
        cpf: cpf?.replace(/\D/g, ''),
        data_nascimento,
        relacao,
        email: email || null,
        telefone_celular: telefone_celular || null,
        sexo: sexo || null,
      })
      .eq('id', id)
      .eq('cadastro_id', auth.clienteId)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar dependente:', error)
      return NextResponse.json(
        { error: 'Erro ao atualizar dependente.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ dependente })
  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json(
        { error: 'Não autenticado.' },
        { status: 401 }
      )
    }

    console.error('Erro ao atualizar dependente:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar dependente.' },
      { status: 500 }
    )
  }
}

// DELETE - Remover dependente
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireClienteAuth(request)
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (auth.tipo !== 'titular') {
      return NextResponse.json(
        { error: 'Apenas o titular pode remover dependentes.' },
        { status: 403 }
      )
    }

    if (!id) {
      return NextResponse.json(
        { error: 'ID do dependente é obrigatório' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from('dependentes')
      .delete()
      .eq('id', id)
      .eq('cadastro_id', auth.clienteId)

    if (error) {
      console.error('Erro ao remover dependente:', error)
      return NextResponse.json(
        { error: 'Erro ao remover dependente.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Não autenticado') {
      return NextResponse.json(
        { error: 'Não autenticado.' },
        { status: 401 }
      )
    }

    console.error('Erro ao remover dependente:', error)
    return NextResponse.json(
      { error: 'Erro ao remover dependente.' },
      { status: 500 }
    )
  }
}
