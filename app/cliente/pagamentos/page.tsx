'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

type Payment = {
  id: string
  status?: string
  value?: number
  dueDate?: string
  description?: string
  billingType?: string
  invoiceUrl?: string
  bankSlipUrl?: string
}

export default function ClientePagamentos() {
  const router = useRouter()
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchPayments()
  }, [])

  const fetchPayments = async () => {
    try {
      const response = await fetch('/api/cliente/pagamentos')
      
      if (response.status === 401) {
        router.push('/login')
        return
      }

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Erro ao carregar pagamentos')
        return
      }

      setPayments(data.payments || [])
      
      // Mostrar mensagem se houver
      if (data.message && data.payments.length === 0) {
        setError(data.message)
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor')
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (value?: number) =>
    value ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'

  const formatDate = (date?: string) =>
    date ? new Date(date).toLocaleDateString('pt-BR') : '-'

  const statusLabels: Record<string, { label: string; color: string }> = {
    PENDING: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
    RECEIVED: { label: 'Pago', color: 'bg-green-100 text-green-800' },
    CONFIRMED: { label: 'Pago', color: 'bg-green-100 text-green-800' },
    OVERDUE: { label: 'Vencido', color: 'bg-red-100 text-red-800' },
    REFUNDED: { label: 'Reembolsado', color: 'bg-gray-100 text-gray-800' },
  }

  const billingTypeLabels: Record<string, string> = {
    PIX: 'PIX',
    BOLETO: 'Boleto',
    CREDIT_CARD: 'Cartão',
  }

  const isPaid = (status?: string) => ['RECEIVED', 'CONFIRMED'].includes(status || '')
  const paymentsPaid = payments.filter(p => isPaid(p.status))
  const paymentsPending = payments.filter(p => !isPaid(p.status))

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link href="/cliente/dashboard">
              <Button variant="ghost" size="sm" className="text-gray-600">
                ← Voltar
              </Button>
            </Link>
            <h1 className="text-2xl font-bold" style={{ color: '#006B54' }}>Pagamentos</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl mb-6">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {payments.length === 0 && !error ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <p className="text-gray-600">Nenhum pagamento encontrado.</p>
          </div>
        ) : payments.length === 0 && error ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-blue-50">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Aguardando confirmação</h2>
            <p className="text-gray-600">
              Seus pagamentos aparecerão aqui após a confirmação do pagamento de adesão.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Pagamentos Pendentes */}
            {paymentsPending.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Pendentes</h2>
                <div className="space-y-3">
                  {paymentsPending.map((payment) => {
                    const statusInfo = statusLabels[payment.status || ''] || {
                      label: payment.status || 'Desconhecido',
                      color: 'bg-gray-100 text-gray-800',
                    }

                    return (
                      <div key={payment.id} className="bg-white rounded-2xl shadow-sm p-6 border-l-4 border-yellow-400">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-semibold text-gray-900">{payment.description || 'Mensalidade'}</p>
                            <p className="text-sm text-gray-500">Vencimento: {formatDate(payment.dueDate)}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-500">Valor</p>
                            <p className="text-lg font-bold" style={{ color: '#006B54' }}>{formatCurrency(payment.value)}</p>
                          </div>
                          <div className="flex gap-2">
                            {payment.invoiceUrl && (
                              <a
                                href={payment.invoiceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm px-4 py-2 rounded-lg text-white hover:opacity-90"
                                style={{ backgroundColor: '#006B54' }}
                              >
                                Pagar
                              </a>
                            )}
                            {payment.bankSlipUrl && (
                              <a
                                href={payment.bankSlipUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
                              >
                                Ver Boleto
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Pagamentos Pagos */}
            {paymentsPaid.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Pagos</h2>
                <div className="space-y-3">
                  {paymentsPaid.map((payment) => {
                    const statusInfo = statusLabels[payment.status || ''] || {
                      label: payment.status || 'Desconhecido',
                      color: 'bg-gray-100 text-gray-800',
                    }

                    return (
                      <div key={payment.id} className="bg-white rounded-2xl shadow-sm p-6 border-l-4 border-green-400">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-semibold text-gray-900">{payment.description || 'Mensalidade'}</p>
                            <p className="text-sm text-gray-500">Pago em: {formatDate(payment.dueDate)}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                            ✓ {statusInfo.label}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-500">Valor</p>
                            <p className="text-lg font-bold text-gray-900">{formatCurrency(payment.value)}</p>
                          </div>
                          <div className="flex gap-2">
                            {payment.invoiceUrl && (
                              <a
                                href={payment.invoiceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
                              >
                                Ver Fatura
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
