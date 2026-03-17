import { createClient } from '@/lib/supabase/server'
import { isValidCPF } from '@/lib/utils'
import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    // Extrair dados do formulário
    const nome = formData.get('nome') as string
    const email = formData.get('email') as string
    const cpf = formData.get('cpf') as string
    const data_nascimento = formData.get('data_nascimento') as string
    const telefone = formData.get('telefone') as string
    const sexo = formData.get('sexo') as string
    const endereco = formData.get('endereco') as string
    const numero = formData.get('numero') as string
    const complemento = formData.get('complemento') as string
    const bairro = formData.get('bairro') as string
    const cidade = formData.get('cidade') as string
    const estado = formData.get('estado') as string
    const cep = formData.get('cep') as string
    const tem_dependentes = formData.get('tem_dependentes') === 'true'
    const dependentes_json = formData.get('dependentes') as string
    const selfie = formData.get('selfie') as File | null

    const nomeValue = nome?.trim()
    const emailValue = email?.trim()
    const cpfValue = cpf?.trim()
    const dataNascimentoValue = data_nascimento?.trim()
    const telefoneValue = telefone?.trim()
    const sexoValue = sexo?.trim()
    const enderecoValue = endereco?.trim()
    const numeroValue = numero?.trim()
    const complementoValue = complemento?.trim()
    const bairroValue = bairro?.trim()
    const cidadeValue = cidade?.trim()
    const estadoValue = estado?.trim()
    const cepValue = cep?.trim()

    // Validação básica
    if (!nomeValue || !emailValue || !cpfValue || !telefoneValue || !sexoValue || !dataNascimentoValue) {
      return NextResponse.json(
        { error: 'Dados pessoais obrigatórios faltando' },
        { status: 400 }
      )
    }

    if (!enderecoValue || !numeroValue || !bairroValue || !cidadeValue || !estadoValue || !cepValue) {
      return NextResponse.json(
        { error: 'Dados de endereço obrigatórios faltando' },
        { status: 400 }
      )
    }

    if (!isValidCPF(cpfValue)) {
      return NextResponse.json(
        { error: 'CPF do titular inválido' },
        { status: 400 }
      )
    }

    let dependentes: Array<{
      nome: string
      cpf?: string
      data_nascimento?: string
      relacao: string
      telefone_celular: string
      sexo: string
    }> = []

    if (tem_dependentes) {
      if (!dependentes_json) {
        return NextResponse.json(
          { error: 'Informe ao menos um dependente para continuar' },
          { status: 400 }
        )
      }

      try {
        const parsed = JSON.parse(dependentes_json)
        if (!Array.isArray(parsed) || parsed.length === 0) {
          return NextResponse.json(
            { error: 'Informe ao menos um dependente para continuar' },
            { status: 400 }
          )
        }

        const invalidDependente = parsed.find(
          (dep) => !dep?.nome || !dep?.relacao || !dep?.telefone_celular || !dep?.sexo
        )

        if (invalidDependente) {
          return NextResponse.json(
            {
              error:
                'Cada dependente precisa ter nome, relação, sexo e telefone celular para acesso à telemedicina',
            },
            { status: 400 }
          )
        }

        const invalidDependenteCpf = parsed.find(
          (dep) => dep?.cpf && !isValidCPF(String(dep.cpf))
        )

        if (invalidDependenteCpf) {
          return NextResponse.json(
            { error: `CPF inválido para dependente: ${invalidDependenteCpf.nome || 'sem nome'}` },
            { status: 400 }
          )
        }

        dependentes = parsed
      } catch {
        return NextResponse.json(
          { error: 'Formato inválido de dependentes' },
          { status: 400 }
        )
      }
    }

    // Inicializar Supabase
    const supabase = await createClient()

    // Fazer upload da selfie se houver
    let selfie_path: string | null = null
    if (selfie) {
      try {
        const blob = await put(`selfies/${Date.now()}-${nome.replace(/\s+/g, '-')}.jpg`, selfie, {
          access: 'private',
        })
        selfie_path = blob.pathname
      } catch (uploadError) {
        console.error('Selfie upload error:', uploadError)
        // Continuar mesmo se falhar o upload da selfie
      }
    }

    // Inserir cadastro no banco
    const { data: cadastroData, error: cadastroError } = await supabase
      .from('cadastros')
      .insert([
        {
          nome: nomeValue,
          email: emailValue,
          cpf: cpfValue,
          data_nascimento: dataNascimentoValue,
          telefone: telefoneValue,
          sexo: sexoValue,
          endereco: enderecoValue,
          numero: numeroValue,
          complemento: complementoValue || null,
          bairro: bairroValue,
          cidade: cidadeValue,
          estado: estadoValue,
          cep: cepValue,
          tem_dependentes,
          selfie_path,
          termo_assinado_em: new Date().toISOString(),
          ip_assinante: request.headers.get('x-forwarded-for') || 'unknown',
        },
      ])
      .select()
      .single()

    if (cadastroError) {
      const details = `${cadastroError.message || ''} ${cadastroError.details || ''}`
      if (/column .*sexo|sexo .*column|telefone_celular/i.test(details)) {
        return NextResponse.json(
          {
            error:
              'Banco desatualizado. Execute novamente o script scripts/001_create_tables.sql no Supabase SQL Editor para adicionar as novas colunas (sexo e telefone_celular).',
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

      console.error('Database error:', cadastroError)
      return NextResponse.json(
        { error: cadastroError.message || 'Erro ao salvar cadastro' },
        { status: 500 }
      )
    }

    // Inserir dependentes se houver
    if (tem_dependentes && dependentes.length > 0) {
      const dependentesComCadastroId = dependentes.map((dep) => ({
        cadastro_id: cadastroData.id,
        nome: dep.nome,
        cpf: dep.cpf || null,
        data_nascimento: dep.data_nascimento || null,
        relacao: dep.relacao,
        telefone_celular: dep.telefone_celular,
        sexo: dep.sexo,
      }))

      const { error: dependentesError } = await supabase
        .from('dependentes')
        .insert(dependentesComCadastroId)

      if (dependentesError) {
        console.error('Dependentes error:', dependentesError)
        await supabase.from('cadastros').delete().eq('id', cadastroData.id)
        return NextResponse.json(
          { error: 'Erro ao salvar dependentes' },
          { status: 500 }
        )
      }
    }

    // Enviar email com termo de adesão
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/enviar-termo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cadastroId: cadastroData.id }),
      })
    } catch (emailError) {
      console.error('Error sending email:', emailError)
      // Não falhar o cadastro se o email falhar
    }

    return NextResponse.json({
      success: true,
      id: cadastroData.id,
      nome: cadastroData.nome,
      email: cadastroData.email,
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

    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Erro ao processar cadastro' },
      { status: 500 }
    )
  }
}
