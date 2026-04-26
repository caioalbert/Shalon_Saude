'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

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
  dependentes: Array<{
    id: string
    nome: string
    relacao: string
  }>
}

export default function ClienteDashboard() {
  const router = useRouter()
  const [cadastro, setCadastro] = useState<Cadastro | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchCadastro()
  }, [])

  const fetchCadastro = async () => {
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
    } catch (err) {
      setError('Erro ao conectar com o servidor')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/cliente/logout', { method: 'POST' })
    router.push('/login')
  }

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('pt-BR')

  const billingTypeLabels: Record<string, string> = {
    PIX: 'PIX',
    BOLETO: 'Boleto',
    CREDIT_CARD: 'Cartão de Crédito',
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Carregando...</p>
      </div>
    )
  }

  if (error || !cadastro) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow p-6 max-w-md w-full">
          <p className="text-red-600 mb-4">{error || 'Erro ao carregar dados'}</p>
          <Button onClick={() => router.push('/login')}>Voltar ao Login</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-blue-900">SHALOM Saúde</h1>
            <p className="text-sm text-gray-600">Olá, {cadastro.nome.split(' ')[0]}</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Sair
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Status do Cadastro</h2>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                cadastro.status === 'ATIVO'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {cadastro.status}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Plano</p>
              <p className="font-medium text-gray-900">{cadastro.tipo_plano}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Mensalidade</p>
              <p className="font-medium text-gray-900">
                {formatCurrency(cadastro.mensalidade_valor)} / mês
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Forma de Pagamento</p>
              <p className="font-medium text-gray-900">
                {billingTypeLabels[cadastro.mensalidade_billing_type] || cadastro.mensalidade_billing_type}
              </p>
            </div>
            {cadastro.adesao_pago_em && (
              <div>
                <p className="text-sm text-gray-600">Adesão paga em</p>
                <p className="font-medium text-gray-900">{formatDate(cadastro.adesao_pago_em)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Link href="/cliente/pagamentos">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer">
              <div className="text-blue-600 mb-2">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Pagamentos</h3>
              <p className="text-sm text-gray-600">Ver histórico e faturas</p>
            </div>
          </Link>

          <Link href="/cliente/dependentes">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer">
              <div className="text-blue-600 mb-2">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Dependentes</h3>
              <p className="text-sm text-gray-600">
                {cadastro.dependentes.length} cadastrado{cadastro.dependentes.length !== 1 ? 's' : ''}
              </p>
            </div>
          </Link>

          <div className="bg-white rounded-lg shadow p-6 opacity-50 cursor-not-allowed">
            <div className="text-gray-400 mb-2">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Consultas</h3>
            <p className="text-sm text-gray-600">Em breve</p>
          </div>
        </div>

        {/* Personal Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Dados Pessoais</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Nome Completo</p>
              <p className="font-medium text-gray-900">{cadastro.nome}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">CPF</p>
              <p className="font-medium text-gray-900">{cadastro.cpf}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium text-gray-900">{cadastro.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Telefone</p>
              <p className="font-medium text-gray-900">{cadastro.telefone || 'Não informado'}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
