'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CalendarDays, Clock3, ExternalLink, History, Loader2, Video, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ClienteScreenHeader } from '@/components/cliente/screen-header'
import { clienteColors, clienteCopy, clienteRadius } from '@/lib/cliente-ui'

type Cadastro = {
  id: string
  nome: string
}

const RAPIDOC_FALLBACK_URL =
  process.env.NEXT_PUBLIC_RAPIDOC_FALLBACK_URL ||
  process.env.NEXT_PUBLIC_RAPIDOC_API_BASE_URL ||
  'https://api.rapidoc.tech/tema/api'

function openExternalUrl(url: string) {
  const opened = window.open(url, '_blank', 'noopener,noreferrer')
  if (!opened) {
    window.location.href = url
  }
}

export default function ClienteTelemedicinaPage() {
  const router = useRouter()
  const [cadastro, setCadastro] = useState<Cadastro | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingUrl, setIsLoadingUrl] = useState(false)
  const [error, setError] = useState('')

  const fetchCadastro = useCallback(async () => {
    try {
      const response = await fetch('/api/cliente/me')

      if (response.status === 401) {
        router.push('/login')
        return
      }

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Erro ao carregar dados')
        return
      }

      setCadastro(data.cadastro)
    } catch {
      setError('Erro ao conectar com o servidor')
    } finally {
      setIsLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchCadastro()
  }, [fetchCadastro])

  const handleEntrarFila = useCallback(async () => {
    setIsLoadingUrl(true)
    setError('')

    try {
      const response = await fetch('/api/cliente/telemedicina/url')

      if (response.status === 401) {
        router.push('/login')
        return
      }

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar acesso à telemedicina')
      }

      if (!data.url) {
        throw new Error('URL de acesso à telemedicina não retornada.')
      }

      openExternalUrl(data.url || RAPIDOC_FALLBACK_URL)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao abrir telemedicina')
    } finally {
      setIsLoadingUrl(false)
    }
  }, [router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: clienteColors.background }}>
        <p style={{ color: clienteColors.textMuted }}>Carregando...</p>
      </div>
    )
  }

  if (!cadastro) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4" style={{ backgroundColor: clienteColors.background }}>
        <div
          className="w-full max-w-md border p-6"
          style={{
            backgroundColor: clienteColors.surface,
            borderColor: '#FECACA',
            borderRadius: clienteRadius.lg,
          }}
        >
          <p className="mb-4" style={{ color: clienteColors.danger }}>
            {error || 'Erro ao carregar dados'}
          </p>
          <Button
            onClick={() => router.push('/login')}
            style={{
              backgroundColor: clienteColors.primary,
              color: clienteColors.surface,
              borderRadius: clienteRadius.full,
            }}
          >
            Voltar ao login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: clienteColors.background }}>
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <div className="mb-4">
          <Link href="/cliente/dashboard">
            <Button variant="outline" className="gap-2" style={{ borderRadius: clienteRadius.full, borderColor: clienteColors.border }}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </Link>
        </div>

        <ClienteScreenHeader
          title={clienteCopy.modules.telemedicina.title}
          subtitle={clienteCopy.modules.telemedicina.subtitle}
        />

        {error ? (
          <div
            className="mb-4 border p-4"
            style={{
              borderColor: '#FECACA',
              backgroundColor: '#FEF2F2',
              borderRadius: clienteRadius.md,
              color: clienteColors.danger,
            }}
          >
            <p className="text-sm">{error}</p>
          </div>
        ) : null}

        <section
          className="mb-4 border p-5"
          style={{
            backgroundColor: clienteColors.surface,
            borderColor: clienteColors.border,
            borderRadius: clienteRadius.lg,
          }}
        >
          <div className="flex items-start gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center"
              style={{ backgroundColor: `${clienteColors.accent}18`, borderRadius: clienteRadius.md }}
            >
              <Video className="h-7 w-7" style={{ color: clienteColors.accent }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold" style={{ color: clienteColors.text }}>
                Atendimento por vídeo
              </p>
              <p className="mt-1 text-sm" style={{ color: clienteColors.textMuted }}>
                {cadastro.nome}
              </p>
              <p className="mt-1 text-sm font-semibold" style={{ color: clienteColors.accent }}>
                Telemedicina Rapidoc
              </p>
            </div>
          </div>
        </section>

        <section
          className="mb-4 border p-4"
          style={{
            backgroundColor: '#ECFEFF',
            borderColor: '#A5F3FC',
            borderRadius: clienteRadius.md,
          }}
        >
          <div className="flex items-start gap-3">
            <Clock3 className="mt-0.5 h-5 w-5 shrink-0" style={{ color: clienteColors.accent }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: '#0E7490' }}>
                24h · sem hora marcada
              </p>
              <p className="mt-1 text-sm leading-5" style={{ color: '#155E75' }}>
                Receita e atestado digital inclusos no plano.
              </p>
            </div>
          </div>
        </section>

        <button
          type="button"
          onClick={handleEntrarFila}
          disabled={isLoadingUrl}
          className="mb-3 flex w-full items-center gap-4 border-0 p-4 text-left text-white transition disabled:opacity-85"
          style={{ backgroundColor: clienteColors.accent, borderRadius: clienteRadius.lg }}
        >
          {isLoadingUrl ? <Loader2 className="h-6 w-6 animate-spin" /> : <Zap className="h-6 w-6" />}
          <span className="min-w-0 flex-1">
            <span className="block text-base font-bold">Entrar na fila agora</span>
            <span className="mt-0.5 block text-sm text-white/80">Clínico geral - atendimento imediato</span>
          </span>
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">Rápido</span>
        </button>

        <section className="space-y-2">
          <a
            href={RAPIDOC_FALLBACK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 border p-4 transition hover:opacity-90"
            style={{
              backgroundColor: clienteColors.surface,
              borderColor: clienteColors.border,
              borderRadius: clienteRadius.md,
            }}
          >
            <CalendarDays className="h-6 w-6" style={{ color: clienteColors.accent }} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold" style={{ color: clienteColors.text }}>
                Agendar consulta
              </span>
              <span className="mt-0.5 block text-sm" style={{ color: clienteColors.textMuted }}>
                Especialidades conforme seu plano
              </span>
            </span>
            <ExternalLink className="h-5 w-5" style={{ color: clienteColors.textMuted }} />
          </a>

          <a
            href={RAPIDOC_FALLBACK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 border p-4 transition hover:opacity-90"
            style={{
              backgroundColor: clienteColors.surface,
              borderColor: clienteColors.border,
              borderRadius: clienteRadius.md,
            }}
          >
            <History className="h-6 w-6" style={{ color: clienteColors.accent }} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold" style={{ color: clienteColors.text }}>
                Histórico e receitas
              </span>
              <span className="mt-0.5 block text-sm" style={{ color: clienteColors.textMuted }}>
                Consultas anteriores e atestados
              </span>
            </span>
            <ExternalLink className="h-5 w-5" style={{ color: clienteColors.textMuted }} />
          </a>
        </section>
      </main>
    </div>
  )
}
