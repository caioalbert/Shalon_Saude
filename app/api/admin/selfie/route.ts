import { NextRequest, NextResponse } from 'next/server'
import { get } from '@vercel/blob'
import { requireAdminAuth } from '@/lib/supabase/admin-auth'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminAuth(request)
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const pathname = request.nextUrl.searchParams.get('pathname')

    if (!pathname) {
      return NextResponse.json(
        { error: 'Pathname não fornecido' },
        { status: 400 }
      )
    }

    const result = await get(pathname, {
      access: 'private',
      ifNoneMatch: request.headers.get('if-none-match') ?? undefined,
    })

    if (!result) {
      return NextResponse.json(
        { error: 'Arquivo não encontrado' },
        { status: 404 }
      )
    }

    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: result.blob.etag,
          'Cache-Control': 'private, no-cache',
        },
      })
    }

    return new NextResponse(result.stream, {
      headers: {
        'Content-Type': result.blob.contentType,
        ETag: result.blob.etag,
        'Cache-Control': 'private, no-cache',
      },
    })
  } catch (error) {
    console.error('Selfie serve error:', error)
    return NextResponse.json(
      { error: 'Erro ao servir arquivo' },
      { status: 500 }
    )
  }
}
