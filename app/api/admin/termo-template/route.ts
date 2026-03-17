import {
  getTermoTemplateInfo,
  removeCustomTermoBodyText,
  saveTermoBodyText,
} from '@/lib/termo-template'
import { NextRequest, NextResponse } from 'next/server'

function isAuthenticated(request: NextRequest) {
  return Boolean(request.cookies.get('supabase-auth-token')?.value)
}

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json(
      { error: 'Não autenticado' },
      { status: 401 }
    )
  }

  const info = await getTermoTemplateInfo()

  return NextResponse.json({
    success: true,
    ...info,
    instructions: [
      'Envie arquivo .txt ou .md em UTF-8.',
      'Máximo de 200KB.',
      'Separe os parágrafos com linha em branco.',
      'Use títulos em linha isolada (ex: TELEMEDICINA, ASSISTÊNCIA FUNERÁRIA).',
    ],
  })
}

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json(
      { error: 'Não autenticado' },
      { status: 401 }
    )
  }

  try {
    const formData = await request.formData()
    const template = formData.get('template')

    if (!template || !(template instanceof File)) {
      return NextResponse.json(
        { error: 'Arquivo de template não enviado' },
        { status: 400 }
      )
    }

    const allowedTypes = ['text/plain', 'text/markdown', 'application/octet-stream']
    const isAllowedType = template.type ? allowedTypes.includes(template.type) : true
    const isAllowedName = /\.(txt|md)$/i.test(template.name)

    if (!isAllowedType || !isAllowedName) {
      return NextResponse.json(
        { error: 'Formato inválido. Use arquivo .txt ou .md' },
        { status: 400 }
      )
    }

    const text = await template.text()
    await saveTermoBodyText(text)

    const info = await getTermoTemplateInfo()

    return NextResponse.json({
      success: true,
      message: 'Template salvo com sucesso',
      ...info,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao salvar template'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json(
      { error: 'Não autenticado' },
      { status: 401 }
    )
  }

  await removeCustomTermoBodyText()
  const info = await getTermoTemplateInfo()

  return NextResponse.json({
    success: true,
    message: 'Template personalizado removido. Voltando para o padrão.',
    ...info,
  })
}
