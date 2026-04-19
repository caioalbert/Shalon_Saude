import { createClient } from '@/lib/supabase/server'
import { getAgeFromIsoDate, isValidCPF, isValidEmail } from '@/lib/utils'
import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'

function getAppBaseUrl(request: NextRequest) {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (envUrl) return envUrl.replace(/\/$/, '')
  return request.nextUrl.origin
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    // Extrair dados do formulário
    const nome = formData.get('nome') as string
    const email = formData.get('email') as string
    const cpf = formData.get('cpf') as string
    const rg = formData.get('rg') as string
    const data_nascimento = formData.get('data_nascimento') as string
    const telefone = formData.get('telefone') as string
    const sexo = formData.get('sexo') as string
    const estado_civil = formData.get('estado_civil') as string
    const nome_conjuge = formData.get('nome_conjuge') as string
    const escolaridade = formData.get('escolaridade') as string
    const situacao_profissional = formData.get('situacao_profissional') as string
    const profissao = formData.get('profissao') as string
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
    const rgValue = rg?.trim()
    const dataNascimentoValue = data_nascimento?.trim()
    const telefoneValue = telefone?.trim()
    const sexoValue = sexo?.trim()
    const estadoCivilValue = estado_civil?.trim()
    const nomeConjugeValue = nome_conjuge?.trim()
    const escolaridadeValue = escolaridade?.trim()
    const situacaoProfissionalValue = situacao_profissional?.trim()
    const profissaoValue = profissao?.trim()
    const enderecoValue = endereco?.trim()
    const numeroValue = numero?.trim()
    const complementoValue = complemento?.trim()
    const bairroValue = bairro?.trim()
    const cidadeValue = cidade?.trim()
    const estadoValue = estado?.trim()
    const cepValue = cep?.trim()

    // Validação básica
    if (
      !nomeValue ||
      !emailValue ||
      !cpfValue ||
      !rgValue ||
      !telefoneValue ||
      !sexoValue ||
      !dataNascimentoValue ||
      !estadoCivilValue ||
      !escolaridadeValue ||
      !situacaoProfissionalValue
    ) {
      return NextResponse.json(
        { error: 'Dados pessoais obrigatórios faltando' },
        { status: 400 }
      )
    }

    if (estadoCivilValue === 'Casado(a)' && !nomeConjugeValue) {
      return NextResponse.json(
        { error: 'Nome do cônjuge é obrigatório para estado civil casado(a)' },
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

    if (!isValidEmail(emailValue)) {
      return NextResponse.json(
        { error: 'Email do titular inválido' },
        { status: 400 }
      )
    }

    let dependentes: Array<{
      nome: string
      rg: string
      cpf?: string
      data_nascimento?: string
      relacao: string
      email: string
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

        const toTrimmed = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

        const invalidDependente = parsed.find(
          (dep) =>
            !toTrimmed(dep?.nome) ||
            !toTrimmed(dep?.rg) ||
            !toTrimmed(dep?.relacao) ||
            !toTrimmed(dep?.email) ||
            !toTrimmed(dep?.telefone_celular) ||
            !toTrimmed(dep?.sexo)
        )

        if (invalidDependente) {
          return NextResponse.json(
            {
              error:
                'Cada dependente precisa ter nome, RG, relação, email, sexo e telefone celular para acesso à telemedicina',
            },
            { status: 400 }
          )
        }

        const invalidDependenteEmail = parsed.find((dep) => !isValidEmail(toTrimmed(dep?.email)))

        if (invalidDependenteEmail) {
          return NextResponse.json(
            { error: `Email inválido para dependente: ${invalidDependenteEmail.nome || 'sem nome'}` },
            { status: 400 }
          )
        }

        const titularEmail = emailValue.toLowerCase()
        const dependenteComMesmoEmailTitularSemRegra = parsed.find((dep) => {
          const dependenteEmail = toTrimmed(dep?.email).toLowerCase()
          if (!titularEmail || dependenteEmail !== titularEmail) return false

          const age = getAgeFromIsoDate(toTrimmed(dep?.data_nascimento))
          return age === null || age >= 18
        })

        if (dependenteComMesmoEmailTitularSemRegra) {
          return NextResponse.json(
            {
              error: `Dependente ${dependenteComMesmoEmailTitularSemRegra.nome || 'sem nome'} só pode usar email do titular se for menor de idade`,
            },
            { status: 400 }
          )
        }

        const invalidDependenteCpf = parsed.find(
          (dep) => {
            const cpf = toTrimmed(dep?.cpf)
            return cpf && !isValidCPF(cpf)
          }
        )

        if (invalidDependenteCpf) {
          return NextResponse.json(
            { error: `CPF inválido para dependente: ${invalidDependenteCpf.nome || 'sem nome'}` },
            { status: 400 }
          )
        }

        dependentes = parsed.map((dep) => ({
          nome: toTrimmed(dep?.nome),
          rg: toTrimmed(dep?.rg),
          cpf: toTrimmed(dep?.cpf) || undefined,
          data_nascimento: toTrimmed(dep?.data_nascimento) || undefined,
          relacao: toTrimmed(dep?.relacao),
          email: toTrimmed(dep?.email),
          telefone_celular: toTrimmed(dep?.telefone_celular),
          sexo: toTrimmed(dep?.sexo),
        }))
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
          rg: rgValue,
          data_nascimento: dataNascimentoValue,
          telefone: telefoneValue,
          sexo: sexoValue,
          estado_civil: estadoCivilValue,
          nome_conjuge: nomeConjugeValue || null,
          escolaridade: escolaridadeValue,
          situacao_profissional: situacaoProfissionalValue,
          profissao: profissaoValue || null,
          endereco: enderecoValue,
          numero: numeroValue,
          complemento: complementoValue || null,
          bairro: bairroValue,
          cidade: cidadeValue,
          estado: estadoValue,
          cep: cepValue,
          tem_dependentes,
          selfie_path,
        },
      ])
      .select()
      .single()

    if (cadastroError) {
      const details = `${cadastroError.message || ''} ${cadastroError.details || ''}`

      if (/duplicate key|cadastros_cpf|cadastros_cpf_idx/i.test(details)) {
        return NextResponse.json(
          { error: 'CPF já identificado na nossa base de cadastrados.' },
          { status: 409 }
        )
      }

      if (/duplicate key|cadastros_email|cadastros_email_idx/i.test(details)) {
        return NextResponse.json(
          { error: 'Email já identificado na nossa base de cadastrados.' },
          { status: 409 }
        )
      }

      if (
        /column .*sexo|sexo .*column|telefone_celular|estado_civil|nome_conjuge|escolaridade|situacao_profissional|profissao|rg/i.test(
          details
        )
      ) {
        return NextResponse.json(
          {
            error:
              'Banco desatualizado. Execute novamente o script scripts/001_create_tables.sql no Supabase SQL Editor para adicionar as novas colunas.',
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
        rg: dep.rg,
        cpf: dep.cpf || null,
        data_nascimento: dep.data_nascimento || null,
        relacao: dep.relacao,
        email: dep.email,
        telefone_celular: dep.telefone_celular,
        sexo: dep.sexo,
      }))

      const { error: dependentesError } = await supabase
        .from('dependentes')
        .insert(dependentesComCadastroId)

      if (dependentesError) {
        const details = `${dependentesError.message || ''} ${dependentesError.details || ''}`
        if (/column .*email|email .*column/i.test(details)) {
          await supabase.from('cadastros').delete().eq('id', cadastroData.id)
          return NextResponse.json(
            {
              error:
                'Banco desatualizado. Execute novamente o script scripts/001_create_tables.sql e depois scripts/002_add_campos_cadastro.sql para adicionar email em dependentes.',
            },
            { status: 500 }
          )
        }

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
      const appBaseUrl = getAppBaseUrl(request)
      const emailResponse = await fetch(`${appBaseUrl}/api/enviar-termo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cadastroId: cadastroData.id,
        }),
      })

      if (!emailResponse.ok) {
        const responseText = await emailResponse.text()
        console.error('Email API returned non-200', {
          cadastroId: cadastroData.id,
          status: emailResponse.status,
          body: responseText,
        })
      }
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
