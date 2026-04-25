import { MIN_ASAAS_CHARGE_VALUE } from '@/lib/billing-settings'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminAuth } from '@/lib/supabase/admin-auth'
import { NextRequest, NextResponse } from 'next/server'

function normalizeCodePart(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toUpperCase()
}

function mapDatabaseErrorMessage(error: unknown) {
  const details = (() => {
    if (error instanceof Error) return error.message

    if (error && typeof error === 'object') {
      const maybePostgrestError = error as {
        message?: string
        details?: string
        hint?: string
        code?: string
      }

      return `${maybePostgrestError.message || ''} ${maybePostgrestError.details || ''} ${maybePostgrestError.hint || ''} ${maybePostgrestError.code || ''}`
    }

    return String(error)
  })()

  if (/relation .*planos|does not exist|42P01/i.test(details)) {
    return 'Banco desatualizado. Execute scripts/009_add_planos_module.sql no Supabase SQL Editor.'
  }

  if (/duplicate key|planos_codigo_idx/i.test(details)) {
    return 'Já existe um plano com este código.'
  }

  if (/fetch failed|enotfound|getaddrinfo|network/i.test(details)) {
    return 'Falha ao conectar no Supabase. Verifique NEXT_PUBLIC_SUPABASE_URL e as chaves no arquivo .env/.env.local.'
  }

  return null
}

async function generateUniquePlanCode(
  supabase: ReturnType<typeof createAdminClient>,
  baseName: string
) {
  const base = normalizeCodePart(baseName) || 'PLANO'

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`

    const { data, error } = await supabase
      .from('planos')
      .select('id')
      .eq('codigo', candidate)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!data) {
      return candidate
    }
  }

  throw new Error('Não foi possível gerar um código único para o plano.')
}

export async function GET(request: NextRequest) {
  const authResult = await requireAdminAuth(request)
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('planos')
      .select('id, codigo, nome, valor, ativo, ordem, created_at, updated_at')
      .order('ordem', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, planos: data || [] })
  } catch (error) {
    const mappedMessage = mapDatabaseErrorMessage(error)
    if (mappedMessage) {
      return NextResponse.json({ error: mappedMessage }, { status: 500 })
    }

    console.error('Admin planos GET error:', error)
    return NextResponse.json({ error: 'Erro ao buscar planos.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdminAuth(request)
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = (await request.json().catch(() => null)) as
      | {
          nome?: string
          valor?: number | string
        }
      | null

    if (!body) {
      return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })
    }

    const nome = String(body.nome || '').trim()
    const valor = Number(body.valor)

    if (!nome) {
      return NextResponse.json({ error: 'Nome do plano é obrigatório.' }, { status: 400 })
    }

    if (!Number.isFinite(valor) || valor < MIN_ASAAS_CHARGE_VALUE) {
      return NextResponse.json(
        {
          error: `Valor inválido. O mínimo permitido pelo Asaas é R$ ${MIN_ASAAS_CHARGE_VALUE.toFixed(2).replace('.', ',')}.`,
        },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const [{ data: highestOrder, error: highestOrderError }, code] = await Promise.all([
      supabase.from('planos').select('ordem').order('ordem', { ascending: false }).limit(1).maybeSingle(),
      generateUniquePlanCode(supabase, nome),
    ])

    if (highestOrderError) {
      throw highestOrderError
    }

    const nextOrder = Number(highestOrder?.ordem || 0) + 1

    const { data, error } = await supabase
      .from('planos')
      .insert({
        nome,
        codigo: code,
        valor,
        ativo: true,
        ordem: nextOrder,
      })
      .select('id, codigo, nome, valor, ativo, ordem, created_at, updated_at')
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, message: 'Plano criado com sucesso.', plano: data })
  } catch (error) {
    const mappedMessage = mapDatabaseErrorMessage(error)
    if (mappedMessage) {
      const status = /código/i.test(mappedMessage) ? 409 : 500
      return NextResponse.json({ error: mappedMessage }, { status })
    }

    const details = error instanceof Error ? error.message : String(error)
    if (/não foi possível gerar um código/i.test(details)) {
      return NextResponse.json({ error: details }, { status: 500 })
    }

    console.error('Admin planos POST error:', error)
    return NextResponse.json({ error: 'Erro ao criar plano.' }, { status: 500 })
  }
}
