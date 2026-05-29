'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import Image from 'next/image'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { trackPwaEvent } from '@/lib/pwa/analytics'
import { clienteColors, clienteCopy, clienteRadius } from '@/lib/cliente-ui'

const CPF_PASSWORD_LENGTH = 4

export default function LoginPage() {
  const router = useRouter()
  const isOnline = useOnlineStatus()
  const [cpf, setCpf] = useState('')
  const [cpfPrefix, setCpfPrefix] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    }
    return cpf
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const cpfClean = cpf.replace(/\D/g, '')
    if (cpfClean.length !== 11) {
      setError('Informe um CPF válido com 11 dígitos.')
      return
    }

    if (cpfPrefix.length !== CPF_PASSWORD_LENGTH) {
      setError(`Informe os ${CPF_PASSWORD_LENGTH} primeiros dígitos do CPF.`)
      return
    }

    if (cpfClean.slice(0, CPF_PASSWORD_LENGTH) !== cpfPrefix) {
      setError(`Os ${CPF_PASSWORD_LENGTH} primeiros dígitos não conferem com o CPF informado.`)
      return
    }

    if (!isOnline) {
      trackPwaEvent('pwa_login_blocked_offline', { area: 'cliente' })
      setError('Sem conexão. Conecte-se à internet para entrar.')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/cliente/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cpf: cpfClean,
          cpf_prefix: cpfPrefix,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Erro ao fazer login')
        return
      }

      router.push('/cliente/dashboard')
    } catch {
      if (!navigator.onLine) {
        trackPwaEvent('pwa_login_blocked_offline', { area: 'cliente' })
        setError('Sem conexão. Conecte-se à internet para entrar.')
      } else {
        setError('Erro ao conectar com o servidor')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{
        background: `linear-gradient(180deg, ${clienteColors.background} 0%, ${clienteColors.backgroundGradientEnd} 100%)`,
      }}
    >
      <div
        className="w-full max-w-md border p-8 sm:p-10"
        style={{
          backgroundColor: clienteColors.surface,
          borderColor: clienteColors.borderMint,
          borderRadius: clienteRadius.xl,
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.10)',
        }}
      >
        <div className="text-center">
          <Image
            src="/logo-horizontal-v2.png"
            alt="SHALOM Saúde"
            width={520}
            height={169}
            unoptimized
            className="mx-auto h-16 w-auto"
          />
          <p className="mt-3 text-sm" style={{ color: clienteColors.textMuted }}>
            {clienteCopy.appTagline}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="cpf" className="mb-1.5 block text-sm font-medium" style={{ color: clienteColors.text }}>
              CPF
            </label>
            <Input
              id="cpf"
              type="text"
              value={cpf}
              onChange={(e) => setCpf(formatCPF(e.target.value))}
              placeholder="000.000.000-00"
              maxLength={14}
              required
              disabled={isLoading}
              autoComplete="off"
              className="h-12 text-base"
              style={{ borderColor: clienteColors.border, borderRadius: clienteRadius.md }}
            />
          </div>

          <div>
            <label htmlFor="cpf_prefix" className="mb-1.5 block text-sm font-medium" style={{ color: clienteColors.text }}>
              Senha
            </label>
            <Input
              id="cpf_prefix"
              type="password"
              inputMode="numeric"
              value={cpfPrefix}
              onChange={(e) => setCpfPrefix(e.target.value.replace(/\D/g, '').slice(0, CPF_PASSWORD_LENGTH))}
              placeholder={'0'.repeat(CPF_PASSWORD_LENGTH)}
              maxLength={CPF_PASSWORD_LENGTH}
              required
              disabled={isLoading}
              autoComplete="off"
              className="h-12 text-center text-2xl font-semibold tracking-[0.35em]"
              style={{ borderColor: clienteColors.border, borderRadius: clienteRadius.md }}
            />
            <p className="mt-2 text-xs" style={{ color: clienteColors.textMuted }}>
              Os {CPF_PASSWORD_LENGTH} primeiros dígitos do seu CPF (somente números).
            </p>
          </div>

          {error ? (
            <div
              className="rounded-xl border px-4 py-3 text-sm"
              style={{
                backgroundColor: '#FEF2F2',
                borderColor: '#FECACA',
                color: clienteColors.danger,
              }}
            >
              {error}
            </div>
          ) : null}

          {!isOnline && !error ? (
            <div
              className="rounded-xl border px-4 py-3 text-sm"
              style={{
                backgroundColor: clienteColors.amberBg,
                borderColor: '#FDE68A',
                color: clienteColors.amber,
              }}
            >
              Sem conexão. Conecte-se à internet para entrar.
            </div>
          ) : null}

          <Button
            type="submit"
            className="h-12 w-full text-base font-bold"
            disabled={isLoading || !isOnline}
            style={{
              backgroundColor: clienteColors.primary,
              color: clienteColors.surface,
              borderRadius: clienteRadius.full,
            }}
          >
            {isLoading ? 'Entrando...' : 'Entrar'}
          </Button>

          <p className="text-center text-sm leading-relaxed" style={{ color: clienteColors.textMuted }}>
            CPF completo + senha com os {CPF_PASSWORD_LENGTH} primeiros dígitos do CPF.
          </p>
        </form>

        <div
          className="mt-5 rounded-xl border px-3 py-2 text-center"
          style={{
            borderColor: clienteColors.borderMint,
            backgroundColor: `${clienteColors.primary}10`,
          }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: clienteColors.primary }}>
            Acesso rápido
          </p>
          <p className="mt-0.5 text-xs" style={{ color: clienteColors.textMuted }}>
            <Link href="/cadastro" className="underline">
              Não tem cadastro? Cadastre-se aqui
            </Link>
            {' | '}
            <Link href="/" className="underline">
              Voltar ao início
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
