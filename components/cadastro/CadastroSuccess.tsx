'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Image from 'next/image'

interface CadastroSuccessProps {
  data: {
    nome: string
    email: string
    id: string
    status?: string
    pagamento?: {
      id: string
      valor: number
      vencimento: string
      pixCopiaECola: string
      qrCodeBase64: string
    }
  }
}

export function CadastroSuccess({ data }: CadastroSuccessProps) {
  const [status, setStatus] = useState(data.status || 'ATIVO')
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [copyMessage, setCopyMessage] = useState<string | null>(null)

  const isPendingPayment = status === 'PENDENTE_PAGAMENTO' && Boolean(data.pagamento)

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const formatDate = (value: string) => {
    const parsed = new Date(`${value}T00:00:00`)
    if (Number.isNaN(parsed.getTime())) return value
    return parsed.toLocaleDateString('pt-BR')
  }

  const handleCopyPixCode = async () => {
    if (!data.pagamento?.pixCopiaECola) return

    try {
      await navigator.clipboard.writeText(data.pagamento.pixCopiaECola)
      setCopyMessage('Código PIX copiado.')
    } catch {
      setCopyMessage('Não foi possível copiar automaticamente. Copie manualmente o código acima.')
    }
  }

  const handleCheckStatus = async () => {
    try {
      setIsCheckingStatus(true)
      setStatusMessage(null)

      const response = await fetch(`/api/cadastro/status?id=${encodeURIComponent(data.id)}`, {
        cache: 'no-store',
      })

      const payload = (await response.json().catch(() => null)) as { status?: string; error?: string } | null
      if (!response.ok) {
        throw new Error(payload?.error || 'Não foi possível verificar o status do pagamento.')
      }

      const nextStatus = payload?.status || 'PENDENTE_PAGAMENTO'
      setStatus(nextStatus)

      if (nextStatus === 'ATIVO') {
        setStatusMessage('Pagamento confirmado. Seu cadastro foi ativado.')
        return
      }

      setStatusMessage('Pagamento ainda não foi confirmado. Aguarde alguns instantes e tente novamente.')
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : 'Erro ao verificar status do pagamento.'
      )
    } finally {
      setIsCheckingStatus(false)
    }
  }

  if (isPendingPayment && data.pagamento) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl w-full">
          <div className="bg-white rounded-xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-10 sm:px-8 text-center">
              <h1 className="text-3xl font-bold text-white">Pagamento da Adesão</h1>
              <p className="text-amber-100 mt-2">Seu cadastro foi recebido e está pendente de pagamento</p>
            </div>

            <div className="px-6 py-8 sm:px-8 space-y-6">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                <p className="text-sm text-amber-900">
                  <strong>{data.nome}</strong>
                </p>
                <p className="text-sm text-amber-900">{data.email}</p>
                <p className="text-xs font-mono text-amber-800">Cadastro: {data.id}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs text-gray-500">Valor da adesão</p>
                  <p className="text-lg font-semibold text-gray-900">{formatCurrency(data.pagamento.valor)}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs text-gray-500">Vencimento</p>
                  <p className="text-lg font-semibold text-gray-900">{formatDate(data.pagamento.vencimento)}</p>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-4 space-y-3">
                <p className="text-sm font-medium text-gray-700">Escaneie o QR Code PIX:</p>
                <div className="flex justify-center">
                  <Image
                    src={`data:image/png;base64,${data.pagamento.qrCodeBase64}`}
                    alt="QR Code PIX da adesão"
                    className="h-56 w-56 rounded-lg border border-gray-200"
                    width={224}
                    height={224}
                    unoptimized
                  />
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-4 space-y-3">
                <p className="text-sm font-medium text-gray-700">Ou use o PIX copia e cola:</p>
                <textarea
                  readOnly
                  value={data.pagamento.pixCopiaECola}
                  className="w-full h-24 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-xs font-mono text-gray-800"
                />
                <Button onClick={handleCopyPixCode} variant="outline" className="w-full">
                  Copiar Código PIX
                </Button>
                {copyMessage && (
                  <p className="text-xs text-gray-600">{copyMessage}</p>
                )}
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleCheckStatus}
                  disabled={isCheckingStatus}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {isCheckingStatus ? 'Verificando pagamento...' : 'Já Paguei, Verificar Status'}
                </Button>
                {statusMessage && (
                  <p className="text-sm text-gray-700">{statusMessage}</p>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  O plano será ativado automaticamente após a confirmação do pagamento no Asaas.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <Link href="/" className="w-full">
                  <Button variant="outline" className="w-full">
                    Voltar para Início
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-12 sm:px-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-4">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white">Cadastro Realizado!</h1>
            <p className="text-green-100 mt-2">Pagamento confirmado e adesão ativada</p>
          </div>

          <div className="px-6 py-8 sm:px-8 space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
              <div>
                <p className="text-xs text-green-700 font-semibold">Nome</p>
                <p className="text-lg font-medium text-gray-800">{data.nome}</p>
              </div>
              <div>
                <p className="text-xs text-green-700 font-semibold">Email</p>
                <p className="text-lg font-medium text-gray-800">{data.email}</p>
              </div>
              <div>
                <p className="text-xs text-green-700 font-semibold">ID do Cadastro</p>
                <p className="text-sm font-mono text-gray-800">{data.id}</p>
              </div>
            </div>

            <div className="space-y-3 text-sm text-gray-700">
              <div className="flex items-start space-x-3">
                <svg
                  className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Seu termo de adesão foi gerado e salvo com segurança</span>
              </div>
              <div className="flex items-start space-x-3">
                <svg
                  className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Você receberá um email em breve com seu termo em PDF</span>
              </div>
              <div className="flex items-start space-x-3">
                <svg
                  className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Sua selfie foi armazenada com segurança</span>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Próximos passos:</strong> Verifique seu email para receber e acessar seu
                termo de adesão.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Link href="/" className="w-full">
                <Button variant="outline" className="w-full">
                  Voltar para Início
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
