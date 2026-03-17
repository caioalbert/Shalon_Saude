import { createClient } from '@/lib/supabase/server'
import { getTermoBodyText } from '@/lib/termo-template'
import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'
import JSZip from 'jszip'
import React from 'react'
import { TermoAdesaoPDF } from '../gerar-pdf/TermoAdesaoPDF'

function sanitizeFileName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s_-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()
}

function getUniqueFileName(baseName: string, usedNames: Map<string, number>) {
  const count = usedNames.get(baseName) || 0
  usedNames.set(baseName, count + 1)

  if (count === 0) {
    return baseName
  }

  return `${baseName}-${count + 1}`
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('supabase-auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    const { data: cadastros, error: cadastrosError } = await supabase
      .from('cadastros')
      .select('*')
      .order('created_at', { ascending: false })

    if (cadastrosError) {
      return NextResponse.json(
        { error: 'Erro ao buscar cadastros' },
        { status: 500 }
      )
    }

    if (!cadastros || cadastros.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum contrato encontrado para exportar' },
        { status: 404 }
      )
    }

    const cadastroIds = cadastros.map((cadastro) => cadastro.id)
    const { data: dependentes, error: dependentesError } = await supabase
      .from('dependentes')
      .select('*')
      .in('cadastro_id', cadastroIds)

    if (dependentesError) {
      console.error('Dependentes fetch error:', dependentesError)
    }

    const dependentesByCadastroId = new Map<string, any[]>()
    ;(dependentes || []).forEach((dependente) => {
      const current = dependentesByCadastroId.get(dependente.cadastro_id) || []
      current.push(dependente)
      dependentesByCadastroId.set(dependente.cadastro_id, current)
    })

    const termoBodyText = await getTermoBodyText()
    const zip = new JSZip()
    const usedNames = new Map<string, number>()

    for (const cadastro of cadastros) {
      const pdfDocument = React.createElement(TermoAdesaoPDF, {
        data: cadastro,
        dependentes: dependentesByCadastroId.get(cadastro.id) || [],
        termoBodyText,
      }) as unknown as React.ReactElement<DocumentProps>

      const pdfBuffer = await renderToBuffer(pdfDocument)

      const safeName = sanitizeFileName(cadastro.nome || '')
      const baseFileName = safeName || 'contrato'
      const uniqueFileName = getUniqueFileName(baseFileName, usedNames)

      zip.file(`${uniqueFileName}.pdf`, pdfBuffer)
    }

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    })

    const date = new Date().toISOString().slice(0, 10)

    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="contratos-shalon-${date}.zip"`,
      },
    })
  } catch (error) {
    console.error('Bulk PDF export error:', error)
    return NextResponse.json(
      { error: 'Erro ao exportar contratos' },
      { status: 500 }
    )
  }
}
