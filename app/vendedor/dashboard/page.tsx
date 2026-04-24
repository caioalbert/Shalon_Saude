'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

type CadastroVendedor = {
  id: string
  nome: string
  email: string
  cpf: string
  status: string
  created_at: string
  adesao_pago_em?: string | null
  mensalidade_valor?: number | null
  vendedor_codigo?: string | null
}

type ResumoPayload = {
  vendedor: {
    id: string
    nome: string
    email: string
    codigoIndicacao: string
    linkVenda: string
  }
  resumo: {
    totalClientes: number
    totalPagos: number
    totalPendentes: number
    totalPagoMesAtual: number
  }
  cadastros: CadastroVendedor[]
}

export default function VendedorDashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<ResumoPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const fetchResumo = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/vendedor/resumo', { cache: 'no-store' })
      const payload = await response.json().catch(() => null)

      if (response.status === 401) {
        router.push('/vendedor/login')
        return
      }

      if (!response.ok) {
        throw new Error(payload?.error || 'Erro ao carregar painel do vendedor.')
      }

      setData(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar painel do vendedor.')
    } finally {
      setIsLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchResumo()
  }, [fetchResumo])

  const handleLogout = async () => {
    try {
      await fetch('/api/vendedor/logout', { method: 'POST' })
      router.push('/vendedor/login')
    } catch (err) {
      console.error('Vendedor logout error:', err)
    }
  }

  const handleCopyLink = async () => {
    if (!data?.vendedor.linkVenda) return

    try {
      await navigator.clipboard.writeText(data.vendedor.linkVenda)
      setMessage('Link de venda copiado com sucesso.')
    } catch {
      setError('Não foi possível copiar o link automaticamente.')
    }
  }

  const formatCurrency = useCallback(
    (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    []
  )

  const tableRows = useMemo(() => data?.cadastros || [], [data?.cadastros])

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-gray-900 sm:text-2xl">Painel do Vendedor</h1>
            <p className="text-xs text-gray-600 sm:text-sm">Acompanhe suas vendas por link de indicação</p>
          </div>
          <div className="hidden items-center gap-2 lg:flex">
            <Button onClick={fetchResumo} variant="outline">Atualizar</Button>
            <Button onClick={handleLogout} variant="outline">Sair</Button>
          </div>

          <div className="lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Abrir menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>Menu Vendedor</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-2 px-4 pb-4">
                  <SheetClose asChild>
                    <Button onClick={fetchResumo} variant="outline" className="w-full justify-start">
                      Atualizar
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button onClick={handleLogout} variant="outline" className="w-full justify-start">
                      Sair
                    </Button>
                  </SheetClose>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {message && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3">
            <p className="text-sm text-green-700">{message}</p>
          </div>
        )}

        {isLoading ? (
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <p className="text-sm text-gray-600">Carregando dados do vendedor...</p>
          </div>
        ) : data ? (
          <>
            <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-gray-900">{data.vendedor.nome}</h2>
                <p className="text-sm text-gray-600">{data.vendedor.email}</p>
                <p className="text-xs font-mono text-gray-500">Código: {data.vendedor.codigoIndicacao}</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Seu link de venda</p>
                <div className="rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-xs font-mono text-gray-800 break-all">
                  {data.vendedor.linkVenda}
                </div>
                <Button onClick={handleCopyLink} variant="outline">Copiar Link de Venda</Button>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-600">Clientes via seu link</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{data.resumo.totalClientes}</p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-600">Adesões pagas</p>
                <p className="text-3xl font-bold text-green-700 mt-1">{data.resumo.totalPagos}</p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-600">Adesões pendentes</p>
                <p className="text-3xl font-bold text-amber-700 mt-1">{data.resumo.totalPendentes}</p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-600">Total a receber no mês</p>
                <p className="text-2xl font-bold text-indigo-700 mt-1">
                  {formatCurrency(data.resumo.totalPagoMesAtual)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Somatório das adesões pagas no mês atual</p>
              </div>
            </section>

            <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Clientes que utilizaram seu link</h3>

              {tableRows.length === 0 ? (
                <p className="text-sm text-gray-600">Nenhum cliente vinculado ao seu link até o momento.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-gray-600">
                        <th className="py-2 pr-4">Cliente</th>
                        <th className="py-2 pr-4">Email</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4">Valor da adesão</th>
                        <th className="py-2 pr-4">Pago em</th>
                        <th className="py-2">Cadastro em</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows.map((cadastro) => {
                        const pago = cadastro.status === 'ATIVO'

                        return (
                          <tr key={cadastro.id} className="border-b border-gray-100">
                            <td className="py-2 pr-4 font-medium text-gray-900">{cadastro.nome}</td>
                            <td className="py-2 pr-4 text-gray-700">{cadastro.email}</td>
                            <td className="py-2 pr-4">
                              <span
                                className={`rounded px-2 py-1 text-xs font-medium ${
                                  pago ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                }`}
                              >
                                {pago ? 'Pago' : 'Pendente'}
                              </span>
                            </td>
                            <td className="py-2 pr-4 text-gray-700">
                              {formatCurrency(Number(cadastro.mensalidade_valor || 0))}
                            </td>
                            <td className="py-2 pr-4 text-gray-700">
                              {cadastro.adesao_pago_em
                                ? new Date(cadastro.adesao_pago_em).toLocaleDateString('pt-BR')
                                : '-'}
                            </td>
                            <td className="py-2 text-gray-700">
                              {new Date(cadastro.created_at).toLocaleDateString('pt-BR')}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <p className="text-sm text-gray-600">Sem dados para exibir.</p>
            <Link href="/vendedor/login" className="mt-3 inline-block">
              <Button variant="outline">Voltar ao Login</Button>
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
