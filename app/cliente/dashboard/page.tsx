'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  AlertTriangle,
  ChevronRight,
  CreditCard,
  Flower2,
  HeartPulse,
  LogOut,
  PhoneCall,
  Users,
  Video,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { clienteColors, clienteCopy, clienteRadius, clienteSupport } from '@/lib/cliente-ui'

type Cadastro = {
  id: string
  nome: string
  email: string
  cpf: string
  telefone: string
  status: string
  tipo_plano: string
  mensalidade_valor: number
  mensalidade_billing_type: string
  adesao_pago_em: string | null
  created_at: string
  financeiro_status?: string | null
  dependentes: Array<{
    id: string
    nome: string
    relacao: string
  }>
}

type QuickAction = {
  title: string
  description: string
  href?: string
  icon: LucideIcon
  iconColor: string
  badge?: string
}

export default function ClienteDashboard() {
  const router = useRouter()
  const [cadastro, setCadastro] = useState<Cadastro | null>(null)
  const [isLoading, setIsLoading] = useState(true)
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

  const handleLogout = async () => {
    await fetch('/api/cliente/logout', { method: 'POST' })
    router.push('/login')
  }

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const quickActions = useMemo<QuickAction[]>(() => {
    const dependentesCount = cadastro?.dependentes.length ?? 0

    return [
      {
        title: clienteCopy.modules.pagamentos.title,
        description: clienteCopy.modules.pagamentos.subtitle,
        href: '/cliente/pagamentos',
        icon: CreditCard,
        iconColor: '#2196F3',
      },
      {
        title: clienteCopy.modules.dependentes.title,
        description: `${dependentesCount} cadastrado${dependentesCount !== 1 ? 's' : ''} no plano`,
        href: '/cliente/dependentes',
        icon: Users,
        iconColor: '#FF9800',
      },
      {
        title: clienteCopy.modules.saude.title,
        description: clienteCopy.modules.saude.subtitle,
        icon: HeartPulse,
        iconColor: clienteColors.primary,
      },
      {
        title: clienteCopy.modules.telemedicina.title,
        description: 'Agendar ou entrar na fila de atendimento',
        href: '/cliente/telemedicina',
        icon: Video,
        iconColor: clienteColors.accent,
        badge: 'Online',
      },
      {
        title: clienteCopy.modules.funeraria.title,
        description: clienteCopy.modules.funeraria.subtitle,
        icon: Flower2,
        iconColor: clienteColors.funeral,
      },
    ]
  }, [cadastro?.dependentes.length])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: clienteColors.background }}>
        <p style={{ color: clienteColors.textMuted }}>Carregando...</p>
      </div>
    )
  }

  if (error || !cadastro) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: clienteColors.background }}>
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

  const greeting = cadastro.nome.split(' ')[0]
  const isActive = cadastro.status === 'ATIVO'
  const hasDebt = String(cadastro.financeiro_status || '').trim().toUpperCase() === 'EM_ATRASO'

  return (
    <div className="min-h-screen" style={{ backgroundColor: clienteColors.background }}>
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <section className="mb-6 flex items-start justify-between gap-4">
          <div>
            <Image
              src="/logo-horizontal-v2.png"
              alt="SHALOM Saúde"
              width={420}
              height={136}
              unoptimized
              className="h-12 w-auto"
            />
            <p className="mt-4 text-2xl font-bold" style={{ color: clienteColors.text }}>
              Olá, {greeting} 👋
            </p>
            <p className="mt-1 text-sm" style={{ color: clienteColors.textMuted }}>
              {clienteCopy.appTagline}
            </p>
          </div>

          <Button
            variant="outline"
            className="gap-2"
            onClick={handleLogout}
            style={{ borderRadius: clienteRadius.full, borderColor: clienteColors.border }}
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </section>

        <section
          className="mb-4 border p-6"
          style={{
            backgroundColor: clienteColors.surface,
            borderColor: clienteColors.border,
            borderRadius: clienteRadius.lg,
          }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold" style={{ color: clienteColors.text }}>
              Meu plano
            </h2>
            <span
              className="rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                backgroundColor: isActive ? '#D1FAE5' : '#FEF3C7',
                color: isActive ? clienteColors.success : clienteColors.warning,
              }}
            >
              {cadastro.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p style={{ color: clienteColors.textMuted }}>Plano</p>
              <p className="mt-1 font-semibold" style={{ color: clienteColors.text }}>
                {cadastro.tipo_plano}
              </p>
            </div>
            <div>
              <p style={{ color: clienteColors.textMuted }}>Mensalidade</p>
              <p className="mt-1 font-semibold" style={{ color: clienteColors.text }}>
                {formatCurrency(cadastro.mensalidade_valor)}
              </p>
            </div>
          </div>
        </section>

        {hasDebt ? (
          <section
            className="mb-4 flex items-start gap-2 border p-4"
            style={{
              backgroundColor: clienteColors.amberBg,
              borderColor: '#FDE68A',
              borderRadius: clienteRadius.md,
            }}
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" style={{ color: clienteColors.amber }} />
            <p className="text-sm leading-5" style={{ color: clienteColors.amber }}>
              Você possui pagamentos em atraso.{' '}
              <Link href="/cliente/pagamentos" className="font-bold underline">
                Ver financeiro →
              </Link>
            </p>
          </section>
        ) : null}

        <section
          className="mb-6 flex items-center justify-between gap-3 border p-4"
          style={{
            backgroundColor: clienteColors.danger,
            borderColor: clienteColors.danger,
            borderRadius: clienteRadius.md,
          }}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/90">Emergência</p>
            <p className="text-lg font-bold text-white">{clienteSupport.emergencyPhone}</p>
          </div>
          <a
            href={`tel:${clienteSupport.emergencyPhone.replace(/\D/g, '')}`}
            className="inline-flex items-center gap-2 rounded-full border border-white/40 px-4 py-2 text-sm font-semibold text-white"
          >
            <PhoneCall className="h-4 w-4" />
            Ligar
          </a>
        </section>

        <p
          className="mb-2 text-xs font-semibold uppercase tracking-[0.08em]"
          style={{ color: clienteColors.textMuted }}
        >
          Acesso rápido
        </p>

        <section className="space-y-2">
          {quickActions.map((action) => {
            const Icon = action.icon
            const disabled = !action.href
            const content = (
              <div
                className={`flex items-center gap-4 border p-4 transition ${disabled ? 'opacity-65' : 'hover:opacity-90'}`}
                style={{
                  backgroundColor: clienteColors.surface,
                  borderColor: clienteColors.border,
                  borderRadius: clienteRadius.md,
                }}
              >
                <div
                  className="flex h-12 w-12 items-center justify-center"
                  style={{
                    borderRadius: clienteRadius.sm,
                    backgroundColor: `${action.iconColor}18`,
                  }}
                >
                  <Icon className="h-6 w-6" style={{ color: action.iconColor }} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-base font-semibold" style={{ color: clienteColors.text }}>
                      {action.title}
                    </p>
                    {action.badge ? (
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                        style={{ backgroundColor: clienteColors.secondary }}
                      >
                        {action.badge}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-sm" style={{ color: clienteColors.textMuted }}>
                    {action.description}
                  </p>
                </div>

                <ChevronRight className="h-5 w-5" style={{ color: clienteColors.textMuted }} />
              </div>
            )

            if (action.href) {
              return (
                <Link key={action.title} href={action.href}>
                  {content}
                </Link>
              )
            }

            return (
              <div key={action.title} aria-disabled>
                {content}
              </div>
            )
          })}
        </section>
      </main>
    </div>
  )
}
