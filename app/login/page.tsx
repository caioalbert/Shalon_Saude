'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import Image from 'next/image'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { trackPwaEvent } from '@/lib/pwa/analytics'

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

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCPF(e.target.value))
  }

  const handlePrefixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpfPrefix(e.target.value.replace(/\D/g, '').slice(0, 4))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const cpfClean = cpf.replace(/\D/g, '')
    if (cpfClean.length !== 11) {
      setError('Informe um CPF válido com 11 dígitos.')
      return
    }
    if (cpfPrefix.length !== 4) {
      setError('Informe os 4 primeiros dígitos do CPF.')
      return
    }
    if (cpfClean.slice(0, 4) !== cpfPrefix) {
      setError('Os 4 primeiros dígitos não conferem com o CPF informado.')
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
    <div className="app-login-shell min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <Image
              src="/logo-horizontal-v2.png"
              alt="SHALOM Saúde"
              width={520}
              height={169}
              unoptimized
              className="mx-auto h-14 w-auto sm:h-16"
            />
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="cpf" className="mb-2 block">CPF</Label>
              <Input
                id="cpf"
                type="text"
                value={cpf}
                onChange={handleCpfChange}
                placeholder="000.000.000-00"
                maxLength={14}
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="cpf_prefix" className="mb-2 block">
                4 primeiros dígitos do CPF
              </Label>
              <Input
                id="cpf_prefix"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={cpfPrefix}
                onChange={handlePrefixChange}
                placeholder="0000"
                maxLength={4}
                required
                disabled={isLoading}
                className="tracking-widest"
              />
              <p className="mt-1 text-xs text-gray-500">
                Confirmação de segurança (somente números).
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {!isOnline && !error && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded">
                Sem conexão. Conecte-se à internet para entrar.
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !isOnline}
            >
              {isLoading ? 'Entrando...' : !isOnline ? 'Sem conexão' : 'Entrar'}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-600">
              Ainda não tem cadastro?{' '}
              <Link href="/cadastro" className="text-blue-600 hover:underline font-medium">
                Cadastre-se aqui
              </Link>
            </p>
            <p className="text-sm text-gray-600">
              <Link href="/" className="text-blue-600 hover:underline">
                Voltar para o início
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-4 text-center text-sm text-gray-600">
          <p>Use seu CPF completo e os 4 primeiros dígitos para acessar</p>
        </div>
      </div>
    </div>
  )
}
