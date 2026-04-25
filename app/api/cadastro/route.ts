import {
  AsaasIntegrationError,
  createAsaasCustomer,
  createAsaasPixPayment,
  getAsaasPixQrCode,
} from '@/lib/asaas'
import {
  getBillingSettings,
  MIN_ASAAS_CHARGE_VALUE,
  type BillingTypeOption,
} from '@/lib/billing-settings'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getAgeFromIsoDate, isValidCPF, isValidEmail } from '@/lib/utils'
import { del, put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'

const CONNECTIVITY_ERROR_REGEX =
  /fetch failed|enotfound|getaddrinfo|network|ssl handshake|tls|cloudflare|error code 52\d/i

function isConnectivityIssue(details: string) {
  return CONNECTIVITY_ERROR_REGEX.test(details)
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, '')
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

type CadastroPlanOption = {
  codigo: string
  nome: string
  valor: number
  permiteDependentes: boolean
  minDependentes: number
  maxDependentes: number | null
  valorDependenteAdicional: number
}

function normalizePlanCode(value: unknown) {
  return String(value || '').trim().toUpperCase()
}

function toPositiveNumber(value: unknown, fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }

  return Math.round((parsed + Number.EPSILON) * 100) / 100
}

function toNonNegativeInteger(value: unknown, fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
    return fallback
  }

  return parsed
}

function toOptionalNonNegativeInteger(value: unknown, fallback: number | null = null) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return fallback
  }

  const parsed = Number(value)
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
    return fallback
  }

  return parsed
}

function toNonNegativeAmount(value: unknown, fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback
  }

  return Math.round((parsed + Number.EPSILON) * 100) / 100
}

function calculatePlanChargeValue(plan: CadastroPlanOption, dependentesCount: number) {
  const baseValue = toPositiveNumber(plan.valor, 0)
  const minDependentes = plan.permiteDependentes ? Math.max(0, plan.minDependentes) : 0
  const extraDependentes = plan.permiteDependentes
    ? Math.max(0, dependentesCount - minDependentes)
    : 0
  const extraUnitValue = plan.permiteDependentes ? toNonNegativeAmount(plan.valorDependenteAdicional, 0) : 0

  return Math.round((baseValue + extraDependentes * extraUnitValue + Number.EPSILON) * 100) / 100
}

function mapLegacyCadastroPlans(settings: Awaited<ReturnType<typeof getBillingSettings>>): CadastroPlanOption[] {
  return [
    {
      codigo: 'INDIVIDUAL',
      nome: 'Plano Individual',
      valor: settings.mensalidadeIndividualValue,
      permiteDependentes: false,
      minDependentes: 0,
      maxDependentes: null,
      valorDependenteAdicional: 0,
    },
    {
      codigo: 'FAMILIAR',
      nome: 'Plano Familiar',
      valor: settings.mensalidadeFamiliarValue,
      permiteDependentes: true,
      minDependentes: 1,
      maxDependentes: 4,
      valorDependenteAdicional: 0,
    },
  ]
}

async function loadCadastroPlanOptions(settings: Awaited<ReturnType<typeof getBillingSettings>>) {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('planos')
      .select(
        'codigo, nome, valor, permite_dependentes, dependentes_minimos, max_dependentes, valor_dependente_adicional, ordem, created_at'
      )
      .eq('ativo', true)
      .order('ordem', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      throw error
    }

    const mapped = (data || [])
      .map((plan) => {
        const codigo = normalizePlanCode(plan.codigo)
        const nome = String(plan.nome || '').trim()
        const valor = toPositiveNumber(plan.valor, 0)

        if (!codigo || !nome || valor <= 0) {
          return null
        }

        const isFamiliar = codigo === 'FAMILIAR'
        const permiteDependentes = Boolean(plan.permite_dependentes ?? isFamiliar)
        const minDependentes = permiteDependentes
          ? Math.max(1, toNonNegativeInteger(plan.dependentes_minimos, isFamiliar ? 1 : 1))
          : 0
        const maxDependentes = permiteDependentes
          ? toOptionalNonNegativeInteger(plan.max_dependentes, isFamiliar ? 4 : null)
          : null
        const valorDependenteAdicional = permiteDependentes
          ? toNonNegativeAmount(plan.valor_dependente_adicional, 0)
          : 0

        return {
          codigo,
          nome,
          valor,
          permiteDependentes,
          minDependentes,
          maxDependentes,
          valorDependenteAdicional,
        } satisfies CadastroPlanOption
      })
      .filter((value): value is CadastroPlanOption => Boolean(value))

    if (mapped.length > 0) {
      return mapped
    }
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error)
    if (
      !/relation .*planos|does not exist|42P01|permite_dependentes|dependentes_minimos|max_dependentes|valor_dependente_adicional/i.test(
        details
      )
    ) {
      throw error
    }
  }

  return mapLegacyCadastroPlans(settings)
}

async function cleanupSelfieBlob(selfiePath: string | null) {
  if (!selfiePath) return

  try {
    await del(selfiePath)
  } catch (error) {
    console.warn('Could not cleanup selfie blob:', { selfiePath, error })
  }
}

async function cleanupFailedCadastro(cadastroId: string, selfiePath: string | null) {
  try {
    const supabaseAdmin = createAdminClient()
    const { error } = await supabaseAdmin.from('cadastros').delete().eq('id', cadastroId)
    if (error) {
      console.error('Rollback cadastro delete error:', error)
    }
  } catch (error) {
    console.error('Rollback cadastro delete unexpected error:', error)
  }

  await cleanupSelfieBlob(selfiePath)
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
    const tipo_plano = formData.get('tipo_plano') as string
    const mensalidade_billing_type = formData.get('mensalidade_billing_type') as string
    const vendedor_ref = formData.get('vendedor_ref') as string
    const temDependentesPayload = formData.get('tem_dependentes') === 'true'
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
    const tipoPlanoRequested = tipo_plano?.trim().toUpperCase()
    const temDependentesInformado = temDependentesPayload
    const mensalidadeBillingTypeRequested = mensalidade_billing_type?.trim().toUpperCase()
    const vendedorRefValue = vendedor_ref?.trim().toUpperCase()

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

    let dependentesPayload: unknown[] = []

    if (dependentes_json) {
      try {
        const parsed = JSON.parse(dependentes_json)
        if (!Array.isArray(parsed)) {
          return NextResponse.json(
            { error: 'Formato inválido de dependentes' },
            { status: 400 }
          )
        }

        dependentesPayload = parsed
      } catch {
        return NextResponse.json(
          { error: 'Formato inválido de dependentes' },
          { status: 400 }
        )
      }
    }

    // Inicializar Supabase
    const supabase = await createClient()
    let vendedorId: string | null = null
    let vendedorCodigo: string | null = null

    if (vendedorRefValue) {
      let supabaseAdmin

      try {
        supabaseAdmin = createAdminClient()
      } catch {
        return NextResponse.json(
          {
            error:
              'Configuração ausente para validar vendedor. Defina SUPABASE_SERVICE_ROLE_KEY no ambiente.',
          },
          { status: 500 }
        )
      }

      const { data: vendedor, error: vendedorError } = await supabaseAdmin
        .from('vendedores')
        .select('id, codigo_indicacao, ativo')
        .eq('codigo_indicacao', vendedorRefValue)
        .maybeSingle()

      if (vendedorError) {
        const details = `${vendedorError.message || ''} ${vendedorError.details || ''}`

        if (/relation .*vendedores|does not exist|42P01|column .*vendedor_id|vendedor_codigo/i.test(details)) {
          return NextResponse.json(
            {
              error:
                'Banco desatualizado. Execute scripts/007_add_vendedores_module.sql no Supabase SQL Editor.',
            },
            { status: 500 }
          )
        }

        if (isConnectivityIssue(details)) {
          return NextResponse.json(
            {
              error:
                'Falha ao conectar no Supabase. Verifique NEXT_PUBLIC_SUPABASE_URL e as chaves no arquivo .env/.env.local.',
            },
            { status: 503 }
          )
        }

        console.error('Vendedor lookup error:', vendedorError)
        return NextResponse.json(
          { error: 'Erro ao validar link de vendedor.' },
          { status: 500 }
        )
      }

      if (!vendedor || vendedor.ativo !== true) {
        return NextResponse.json(
          { error: 'Link de vendedor inválido ou inativo.' },
          { status: 400 }
        )
      }

      vendedorId = vendedor.id
      vendedorCodigo = vendedor.codigo_indicacao
    }

    // Evita criar cliente no Asaas para CPF já cadastrado no sistema.
    const { data: cadastroByCpf, error: cadastroByCpfError } = await supabase
      .from('cadastros')
      .select('id')
      .eq('cpf', cpfValue)
      .limit(1)

    if (cadastroByCpfError) {
      const details = `${cadastroByCpfError.message || ''} ${cadastroByCpfError.details || ''}`
      if (isConnectivityIssue(details)) {
        return NextResponse.json(
          {
            error:
              'Falha ao conectar no Supabase. Verifique NEXT_PUBLIC_SUPABASE_URL e as chaves no arquivo .env/.env.local.',
          },
          { status: 503 }
        )
      }

      console.error('CPF pre-check error:', cadastroByCpfError)
      return NextResponse.json(
        { error: 'Erro ao validar CPF já cadastrado' },
        { status: 500 }
      )
    }

    if ((cadastroByCpf || []).length > 0) {
      return NextResponse.json(
        { error: 'CPF já identificado na nossa base de cadastrados.' },
        { status: 409 }
      )
    }

    // Evita criar cliente no Asaas para email já cadastrado no sistema.
    const { data: cadastroByEmail, error: cadastroByEmailError } = await supabase
      .from('cadastros')
      .select('id')
      .eq('email', emailValue)
      .limit(1)

    if (cadastroByEmailError) {
      const details = `${cadastroByEmailError.message || ''} ${cadastroByEmailError.details || ''}`
      if (isConnectivityIssue(details)) {
        return NextResponse.json(
          {
            error:
              'Falha ao conectar no Supabase. Verifique NEXT_PUBLIC_SUPABASE_URL e as chaves no arquivo .env/.env.local.',
          },
          { status: 503 }
        )
      }

      console.error('Email pre-check error:', cadastroByEmailError)
      return NextResponse.json(
        { error: 'Erro ao validar email já cadastrado' },
        { status: 500 }
      )
    }

    if ((cadastroByEmail || []).length > 0) {
      return NextResponse.json(
        { error: 'Email já identificado na nossa base de cadastrados.' },
        { status: 409 }
      )
    }

    const cadastroId = crypto.randomUUID()

    const billingSettings = await getBillingSettings()
    const planOptions = await loadCadastroPlanOptions(billingSettings)
    const adesaoDueDate = toIsoDate(new Date())
    const tipoPlano = (() => {
      if (planOptions.length === 0) {
        throw new Error('Nenhum plano ativo disponível no momento.')
      }

      if (!tipoPlanoRequested) {
        const defaultPlanFromSettings = planOptions.find(
          (plan) => plan.codigo === billingSettings.defaultPlanType
        )
        return defaultPlanFromSettings?.codigo || planOptions[0].codigo
      }

      const selected = planOptions.find((plan) => plan.codigo === tipoPlanoRequested)
      if (!selected) {
        throw new Error('Tipo de plano inválido.')
      }

      return selected.codigo
    })()
    const selectedPlan = planOptions.find((plan) => plan.codigo === tipoPlano)

    if (!selectedPlan) {
      throw new Error('Tipo de plano inválido.')
    }

    const tem_dependentes = selectedPlan.permiteDependentes

    if (!tem_dependentes && (temDependentesInformado || dependentesPayload.length > 0)) {
      return NextResponse.json(
        { error: 'O plano selecionado não permite dependentes.' },
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
      if (dependentesPayload.length === 0) {
        return NextResponse.json(
          { error: 'Informe ao menos um dependente para continuar.' },
          { status: 400 }
        )
      }

      const toTrimmed = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
      const toRecord = (value: unknown) =>
        value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

      dependentes = dependentesPayload.map((item) => {
        const dep = toRecord(item)
        return {
          nome: toTrimmed(dep.nome),
          rg: toTrimmed(dep.rg),
          cpf: toTrimmed(dep.cpf) || undefined,
          data_nascimento: toTrimmed(dep.data_nascimento) || undefined,
          relacao: toTrimmed(dep.relacao),
          email: toTrimmed(dep.email),
          telefone_celular: toTrimmed(dep.telefone_celular),
          sexo: toTrimmed(dep.sexo),
        }
      })

      const invalidDependente = dependentes.find(
        (dep) =>
          !dep.nome ||
          !dep.rg ||
          !dep.relacao ||
          !dep.email ||
          !dep.telefone_celular ||
          !dep.sexo
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

      const invalidDependenteEmail = dependentes.find((dep) => !isValidEmail(dep.email))

      if (invalidDependenteEmail) {
        return NextResponse.json(
          { error: `Email inválido para dependente: ${invalidDependenteEmail.nome || 'sem nome'}` },
          { status: 400 }
        )
      }

      const titularEmail = emailValue.toLowerCase()
      const dependenteComMesmoEmailTitularSemRegra = dependentes.find((dep) => {
        const dependenteEmail = dep.email.toLowerCase()
        if (!titularEmail || dependenteEmail !== titularEmail) return false

        const age = getAgeFromIsoDate(dep.data_nascimento || '')
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

      const invalidDependenteCpf = dependentes.find((dep) => dep.cpf && !isValidCPF(dep.cpf))

      if (invalidDependenteCpf) {
        return NextResponse.json(
          { error: `CPF inválido para dependente: ${invalidDependenteCpf.nome || 'sem nome'}` },
          { status: 400 }
        )
      }
    }

    if (tem_dependentes && dependentes.length < Math.max(1, selectedPlan.minDependentes)) {
      return NextResponse.json(
        { error: `O plano selecionado exige pelo menos ${Math.max(1, selectedPlan.minDependentes)} dependentes.` },
        { status: 400 }
      )
    }

    if (
      selectedPlan.maxDependentes !== null &&
      selectedPlan.maxDependentes > 0 &&
      dependentes.length > selectedPlan.maxDependentes
    ) {
      return NextResponse.json(
        {
          error: `O plano selecionado permite no máximo ${selectedPlan.maxDependentes} dependentes.`,
        },
        { status: 400 }
      )
    }

    const mensalidadeBillingType = (() => {
      if (!mensalidadeBillingTypeRequested) {
        return billingSettings.defaultMensalidadeBillingType
      }

      if (
        !billingSettings.mensalidadeBillingTypes.includes(
          mensalidadeBillingTypeRequested as BillingTypeOption
        )
      ) {
        throw new Error('Forma de cobrança mensal inválida para o plano atual.')
      }

      return mensalidadeBillingTypeRequested
    })()
    const mensalidadeValor = calculatePlanChargeValue(selectedPlan, dependentes.length)
    const adesaoValue = mensalidadeValor

    if (adesaoValue < MIN_ASAAS_CHARGE_VALUE) {
      return NextResponse.json(
        {
          error: `Configuração de cobrança inválida. O valor mínimo permitido pelo Asaas é R$ ${MIN_ASAAS_CHARGE_VALUE.toFixed(2).replace('.', ',')}.`,
        },
        { status: 400 }
      )
    }

    let asaasCustomerId: string
    let asaasPaymentId: string
    let pixCopyPaste: string
    let pixQrCodeImage: string
    try {
      const asaasCustomer = await createAsaasCustomer({
        name: nomeValue,
        cpfCnpj: onlyDigits(cpfValue),
        email: emailValue,
        phone: onlyDigits(telefoneValue),
        mobilePhone: onlyDigits(telefoneValue),
        address: enderecoValue,
        addressNumber: numeroValue,
        complement: complementoValue || undefined,
        province: bairroValue,
        postalCode: onlyDigits(cepValue),
        externalReference: cadastroId,
      })
      asaasCustomerId = asaasCustomer.id

      const payment = await createAsaasPixPayment({
        customer: asaasCustomerId,
        value: adesaoValue,
        dueDate: adesaoDueDate,
        description: 'Taxa de adesão SHALOM Saúde',
        externalReference: cadastroId,
      })
      asaasPaymentId = payment.id

      const pixQrCode = await getAsaasPixQrCode(asaasPaymentId)
      pixCopyPaste = pixQrCode.payload
      pixQrCodeImage = pixQrCode.encodedImage
    } catch (error) {
      if (error instanceof AsaasIntegrationError) {
        return NextResponse.json({ error: error.message }, { status: error.status })
      }

      console.error('Asaas create customer error:', error)
      return NextResponse.json(
        { error: 'Não foi possível registrar o cliente no Asaas.' },
        { status: 502 }
      )
    }

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
          id: cadastroId,
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
          status: 'PENDENTE_PAGAMENTO',
          asaas_customer_id: asaasCustomerId,
          asaas_payment_id: asaasPaymentId,
          vendedor_id: vendedorId,
          vendedor_codigo: vendedorCodigo,
          tipo_plano: tipoPlano,
          mensalidade_valor: mensalidadeValor,
          mensalidade_billing_type: mensalidadeBillingType,
        },
      ])
      .select()
      .single()

    if (cadastroError) {
      const details = `${cadastroError.message || ''} ${cadastroError.details || ''}`

      if (/duplicate key|cadastros_cpf|cadastros_cpf_idx/i.test(details)) {
        await cleanupSelfieBlob(selfie_path)
        return NextResponse.json(
          { error: 'CPF já identificado na nossa base de cadastrados.' },
          { status: 409 }
        )
      }

      if (/duplicate key|cadastros_email|cadastros_email_idx/i.test(details)) {
        await cleanupSelfieBlob(selfie_path)
        return NextResponse.json(
          { error: 'Email já identificado na nossa base de cadastrados.' },
          { status: 409 }
        )
      }

      if (
        /column .*sexo|sexo .*column|telefone_celular|estado_civil|nome_conjuge|escolaridade|situacao_profissional|profissao|rg|asaas_customer_id|asaas_payment_id|asaas_subscription_id|status|adesao_pago_em|mensalidade_billing_type|tipo_plano|mensalidade_valor|vendedor_id|vendedor_codigo/i.test(
          details
        )
      ) {
        await cleanupSelfieBlob(selfie_path)
        return NextResponse.json(
          {
            error:
              'Banco desatualizado. Execute scripts/001_create_tables.sql, scripts/004_add_cadastro_pagamentos.sql, scripts/005_add_billing_settings_admin.sql, scripts/006_add_plan_type_pricing.sql e scripts/007_add_vendedores_module.sql no Supabase SQL Editor.',
          },
          { status: 500 }
        )
      }

      if (isConnectivityIssue(details)) {
        await cleanupSelfieBlob(selfie_path)
        return NextResponse.json(
          {
            error:
              'Falha ao conectar no Supabase. Verifique NEXT_PUBLIC_SUPABASE_URL e as chaves no arquivo .env/.env.local.',
          },
          { status: 503 }
        )
      }

      console.error('Database error:', cadastroError)
      await cleanupSelfieBlob(selfie_path)
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
          await cleanupFailedCadastro(cadastroData.id, selfie_path)
          return NextResponse.json(
            {
              error:
                'Banco desatualizado. Execute novamente o script scripts/001_create_tables.sql e depois scripts/002_add_campos_cadastro.sql para adicionar email em dependentes.',
            },
            { status: 500 }
          )
        }

        console.error('Dependentes error:', dependentesError)
        await cleanupFailedCadastro(cadastroData.id, selfie_path)
        return NextResponse.json(
          { error: 'Erro ao salvar dependentes' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      id: cadastroData.id,
      nome: cadastroData.nome,
      email: cadastroData.email,
      status: cadastroData.status || 'PENDENTE_PAGAMENTO',
      pagamento: {
        id: asaasPaymentId,
        valor: adesaoValue,
        vencimento: adesaoDueDate,
        pixCopiaECola: pixCopyPaste,
        qrCodeBase64: pixQrCodeImage,
      },
      tipoPlanoEscolhido: tipoPlano,
      mensalidadeValor,
      mensalidadeBillingTypeEscolhida: mensalidadeBillingType,
    })
  } catch (error) {
    if (error instanceof AsaasIntegrationError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    const message = error instanceof Error ? error.message : String(error)
    if (
      /forma de cobrança mensal inválida|tipo de plano inválido|nenhum plano ativo disponível/i.test(
        message
      )
    ) {
      return NextResponse.json({ error: message }, { status: 400 })
    }

    if (isConnectivityIssue(message)) {
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
