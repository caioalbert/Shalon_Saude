'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, Loader2, Mail, Menu, Pencil, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Cadastro } from '@/lib/types'
import { getMissingCadastroFields } from '@/lib/cadastro-completeness'

type FinanceiroFilterOption = 'TODOS' | 'EM_DIA' | 'EM_ATRASO' | 'ADESAO_NAO_CONCLUIDA'
type DadosFilterOption = 'TODOS' | 'PENDENTES' | 'COMPLETOS'
type ExportScopeOption = 'FILTRADOS' | 'TODOS'

export default function AdminCadastrosPage() {
  const router = useRouter()
  const [cadastros, setCadastros] = useState<Cadastro[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [exportLoading, setExportLoading] = useState(false)
  const [exportListLoading, setExportListLoading] = useState<'CSV' | 'PDF' | null>(null)
  const [financeiroFilter, setFinanceiroFilter] = useState<FinanceiroFilterOption>('TODOS')
  const [dadosFilter, setDadosFilter] = useState<DadosFilterOption>('TODOS')
  const [exportScope, setExportScope] = useState<ExportScopeOption>('FILTRADOS')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [missingFieldsDialog, setMissingFieldsDialog] = useState<{
    cadastroNome: string
    fields: string[]
  } | null>(null)

  const fetchCadastros = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      setSuccessMessage(null)
      const response = await fetch('/api/admin/cadastros')

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/admin/login')
          return
        }
        throw new Error('Erro ao carregar cadastros')
      }

      const data = await response.json()
      setCadastros(data.cadastros || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setIsLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchCadastros()
  }, [fetchCadastros])

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
      router.push('/admin/login')
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  const handleExportAllContracts = async () => {
    try {
      setExportLoading(true)
      setError(null)
      setSuccessMessage(null)

      const response = await fetch('/api/admin/exportar-contratos')

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/admin/login')
          return
        }

        let message = 'Erro ao exportar contratos'
        try {
          const data = await response.json()
          message = data.error || message
        } catch {
          // ignore parse error
        }
        throw new Error(message)
      }

      const blob = await response.blob()
      const contentDisposition = response.headers.get('content-disposition')
      const filenameMatch = contentDisposition?.match(/filename="?([^"]+)"?/)
      const filename = filenameMatch?.[1] || 'contratos-shalon.zip'

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao exportar contratos')
    } finally {
      setExportLoading(false)
    }
  }

  const handleDeleteCadastro = async (cadastro: Cadastro) => {
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir o cadastro de "${cadastro.nome}"?\n\nEsta ação não pode ser desfeita.`
    )

    if (!confirmed) return

    try {
      setDeletingId(cadastro.id)
      setError(null)
      setSuccessMessage(null)

      const response = await fetch(`/api/admin/cadastro/${cadastro.id}`, {
        method: 'DELETE',
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/admin/login')
          return
        }
        throw new Error(data.error || 'Erro ao excluir cadastro')
      }

      setCadastros((prev) => prev.filter((item) => item.id !== cadastro.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir cadastro')
    } finally {
      setDeletingId(null)
    }
  }

  const handleResendTerm = async (cadastro: Cadastro) => {
    if (String(cadastro.status || '').toUpperCase() !== 'ATIVO') {
      setError('Termo disponível somente após confirmação do pagamento da adesão.')
      return
    }

    try {
      setResendingId(cadastro.id)
      setError(null)
      setSuccessMessage(null)

      const response = await fetch('/api/enviar-termo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cadastroId: cadastro.id }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/admin/login')
          return
        }
        throw new Error(data.error || 'Erro ao reenviar termo')
      }

      setSuccessMessage(
        cadastro.termo_pdf_path
          ? `Termo reenviado com sucesso para ${cadastro.email}.`
          : `Termo gerado e enviado com sucesso para ${cadastro.email}.`
      )
      setCadastros((prev) =>
        prev.map((item) =>
          item.id === cadastro.id
            ? {
                ...item,
                email_enviado_em: new Date().toISOString(),
              }
            : item
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao reenviar termo')
    } finally {
      setResendingId(null)
    }
  }

  const handleExportCadastros = async (
    format: 'csv' | 'pdf',
    options?: { template?: 'default' | 'partner'; days?: number; scope?: 'all' | 'filtered' }
  ) => {
    try {
      setExportListLoading(format === 'csv' ? 'CSV' : 'PDF')
      setError(null)
      setSuccessMessage(null)

      const params = new URLSearchParams()
      params.set('format', format)
      params.set('template', options?.template || 'default')

      if (options?.template === 'partner') {
        params.set('days', String(options.days || 30))
      }

      params.set('scope', options?.scope || (exportScope === 'TODOS' ? 'all' : 'filtered'))

      if (exportScope === 'FILTRADOS') {
        const normalizedSearch = searchTerm.trim()
        if (normalizedSearch) {
          params.set('search', normalizedSearch)
        }

        if (financeiroFilter !== 'TODOS') {
          params.set('financeiroStatus', financeiroFilter)
        }

        if (dadosFilter !== 'TODOS') {
          params.set('dadosStatus', dadosFilter)
        }
      }

      const response = await fetch(`/api/admin/cadastros/exportar?${params.toString()}`)
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/admin/login')
          return
        }

        let message = 'Erro ao exportar lista de cadastros'
        try {
          const data = await response.json()
          message = data.error || message
        } catch {
          // ignore parse error
        }

        throw new Error(message)
      }

      const blob = await response.blob()
      const contentDisposition = response.headers.get('content-disposition')
      const filenameMatch = contentDisposition?.match(/filename="?([^"]+)"?/)
      const filename = filenameMatch?.[1] || `cadastros.${format}`

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao exportar lista de cadastros')
    } finally {
      setExportListLoading(null)
    }
  }

  const summary = useMemo(() => {
    const withDependentes = cadastros.filter((item) => item.tem_dependentes).length
    const withSelfie = cadastros.filter((item) => item.selfie_path).length
    const generatedTerms = cadastros.filter((item) => item.termo_pdf_path).length
    return {
      total: cadastros.length,
      withDependentes,
      withSelfie,
      generatedTerms,
    }
  }, [cadastros])

  const filteredCadastros = useMemo(
    () =>
      cadastros.filter((cadastro) => {
        const normalizedSearch = searchTerm.trim().toLowerCase()
        const matchesSearch =
          !normalizedSearch ||
          cadastro.nome.toLowerCase().includes(normalizedSearch) ||
          cadastro.email.toLowerCase().includes(normalizedSearch) ||
          cadastro.cpf.includes(normalizedSearch)

        if (!matchesSearch) return false

        if (financeiroFilter !== 'TODOS' && cadastro.financeiro_status !== financeiroFilter) {
          return false
        }

        if (dadosFilter === 'TODOS') {
          return true
        }

        const missingFields = getMissingCadastroFields(cadastro)
        if (dadosFilter === 'PENDENTES') {
          return missingFields.length > 0
        }

        return missingFields.length === 0
      }),
    [cadastros, searchTerm, financeiroFilter, dadosFilter]
  )

  const openMissingFieldsDialog = (cadastro: Cadastro) => {
    const missingFields = getMissingCadastroFields(cadastro)
    if (missingFields.length === 0) return

    setMissingFieldsDialog({
      cadastroNome: cadastro.nome,
      fields: missingFields,
    })
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-gray-900 sm:text-2xl">Cadastros</h1>
            <p className="text-xs text-gray-600 sm:text-sm">Busca e gestão detalhada dos registros</p>
          </div>
          <div className="hidden flex-wrap items-center justify-end gap-2 lg:flex">
            <Link href="/admin/dashboard">
              <Button variant="outline">Dashboard</Button>
            </Link>
            <Link href="/admin/configuracoes">
              <Button variant="outline">Configurações</Button>
            </Link>
            <Button
              onClick={handleExportAllContracts}
              disabled={exportLoading || cadastros.length === 0}
              className="bg-teal-700 hover:bg-teal-800"
            >
              {exportLoading ? 'Exportando...' : 'Exportar Contratos (.zip)'}
            </Button>
            <Button onClick={handleLogout} variant="outline">
              Sair
            </Button>
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
                  <SheetTitle>Menu Cadastros</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-2 px-4 pb-4">
                  <SheetClose asChild>
                    <Button asChild variant="outline" className="w-full justify-start">
                      <Link href="/admin/dashboard">Dashboard</Link>
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button asChild variant="outline" className="w-full justify-start">
                      <Link href="/admin/configuracoes">Configurações</Link>
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button onClick={fetchCadastros} variant="outline" className="w-full justify-start gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Atualizar lista
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button
                      onClick={handleExportAllContracts}
                      disabled={exportLoading || cadastros.length === 0}
                      className="w-full justify-start bg-teal-700 hover:bg-teal-800"
                    >
                      {exportLoading ? 'Exportando...' : 'Exportar Contratos (.zip)'}
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

      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-600">Total de Cadastros</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{summary.total.toLocaleString('pt-BR')}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-600">Com Dependentes</p>
            <p className="mt-1 text-2xl font-bold text-green-700">
              {summary.withDependentes.toLocaleString('pt-BR')}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-600">Com Selfie</p>
            <p className="mt-1 text-2xl font-bold text-blue-700">{summary.withSelfie.toLocaleString('pt-BR')}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-600">Termos Gerados</p>
            <p className="mt-1 text-2xl font-bold text-purple-700">
              {summary.generatedTerms.toLocaleString('pt-BR')}
            </p>
          </div>
        </div>

        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <input
              type="text"
              placeholder="Pesquisar por nome, email ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-600 lg:col-span-2"
            />
            <select
              value={financeiroFilter}
              onChange={(e) => setFinanceiroFilter(e.target.value as FinanceiroFilterOption)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              <option value="TODOS">Financeiro: Todos</option>
              <option value="EM_DIA">Financeiro: Em dias</option>
              <option value="EM_ATRASO">Financeiro: Em atraso</option>
              <option value="ADESAO_NAO_CONCLUIDA">Financeiro: Adesão não concluída</option>
            </select>
            <select
              value={dadosFilter}
              onChange={(e) => setDadosFilter(e.target.value as DadosFilterOption)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              <option value="TODOS">Dados: Todos</option>
              <option value="PENDENTES">Dados: Pendentes</option>
              <option value="COMPLETOS">Dados: Completos</option>
            </select>
          </div>

          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={fetchCadastros} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Atualizar lista
              </Button>
              <Button
                onClick={() => {
                  setSearchTerm('')
                  setFinanceiroFilter('TODOS')
                  setDadosFilter('TODOS')
                }}
                variant="outline"
              >
                Limpar filtros
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={exportScope}
                onChange={(e) => setExportScope(e.target.value as ExportScopeOption)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                <option value="FILTRADOS">Exportar: Filtros aplicados</option>
                <option value="TODOS">Exportar: Todos os cadastros</option>
              </select>
              <Button
                variant="outline"
                onClick={() => handleExportCadastros('csv')}
                disabled={isLoading || exportListLoading !== null || cadastros.length === 0}
              >
                {exportListLoading === 'CSV' ? 'Exportando CSV...' : 'Exportar CSV'}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExportCadastros('pdf')}
                disabled={isLoading || exportListLoading !== null || cadastros.length === 0}
              >
                {exportListLoading === 'PDF' ? 'Exportando PDF...' : 'Exportar PDF'}
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  handleExportCadastros('csv', {
                    template: 'partner',
                    days: 30,
                    scope: 'all',
                  })
                }
                disabled={isLoading || exportListLoading !== null || cadastros.length === 0}
                title="Layout da empresa parceira com cadastros dos últimos 30 dias"
              >
                CSV Parceiro (30 dias)
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-8 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="font-medium text-red-700">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-8 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <p className="font-medium text-emerald-700">{successMessage}</p>
          </div>
        )}

        {isLoading ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
            <p className="text-gray-600">Carregando cadastros...</p>
          </div>
        ) : filteredCadastros.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
            <p className="text-gray-600">Nenhum cadastro encontrado</p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Lista de Cadastros</h2>
                <p className="text-sm text-gray-600">Resultados conforme filtro aplicado</p>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                {filteredCadastros.length.toLocaleString('pt-BR')} resultados
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-700">Nome</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-700">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-700">CPF</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-700">
                      Data do Cadastro
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-700">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-700">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCadastros.map((cadastro) => (
                    <tr key={cadastro.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{cadastro.nome}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{cadastro.email}</td>
                      <td className="px-6 py-4 text-sm font-mono text-gray-600">{cadastro.cpf}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(cadastro.created_at).toLocaleDateString('pt-BR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex flex-wrap gap-1">
                          {cadastro.financeiro_status === 'EM_DIA' && (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                              Em dias
                            </span>
                          )}
                          {cadastro.financeiro_status === 'EM_ATRASO' && (
                            <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-2 py-1 text-xs font-medium text-rose-700">
                              Em atraso
                            </span>
                          )}
                          {cadastro.financeiro_status === 'ADESAO_NAO_CONCLUIDA' && (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                              Adesão não concluída
                            </span>
                          )}
                          {(() => {
                            const missingFields = getMissingCadastroFields(cadastro)
                            if (missingFields.length === 0) {
                              return null
                            }

                            return (
                              <button
                                type="button"
                                onClick={() => openMissingFieldsDialog(cadastro)}
                                title="Clique para ver os dados pendentes"
                                className="inline-flex cursor-pointer items-center gap-1 rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1"
                              >
                                Dados pendentes ({missingFields.length})
                              </button>
                            )
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Link href={`/admin/cadastro/${cadastro.id}`} title="Ver detalhes">
                            <Button size="icon-sm" variant="outline" aria-label="Ver detalhes">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/admin/cadastro/${cadastro.id}/editar`} title="Editar cadastro">
                            <Button size="icon-sm" variant="outline" aria-label="Editar cadastro">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            size="icon-sm"
                            variant="outline"
                            onClick={() => handleResendTerm(cadastro)}
                            disabled={
                              resendingId === cadastro.id ||
                              String(cadastro.status || '').toUpperCase() !== 'ATIVO'
                            }
                            aria-label="Reenviar termo"
                            title={
                              String(cadastro.status || '').toUpperCase() !== 'ATIVO'
                                ? 'Termo disponível somente após confirmação do pagamento'
                                : cadastro.termo_pdf_path
                                  ? 'Reenviar termo por email'
                                  : 'Gerar e enviar termo por email'
                            }
                          >
                            {resendingId === cadastro.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Mail className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="destructive"
                            onClick={() => handleDeleteCadastro(cadastro)}
                            disabled={deletingId === cadastro.id}
                            aria-label="Excluir cadastro"
                            title="Excluir cadastro"
                          >
                            {deletingId === cadastro.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Dialog
        open={Boolean(missingFieldsDialog)}
        onOpenChange={(open) => {
          if (!open) setMissingFieldsDialog(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Dados pendentes do cadastro</DialogTitle>
            <DialogDescription>
              {missingFieldsDialog
                ? `Campos pendentes para ${missingFieldsDialog.cadastroNome}:`
                : 'Campos pendentes do cadastro selecionado.'}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-red-100 bg-red-50 p-3">
            <ul className="list-disc space-y-1 pl-5 text-sm text-red-700">
              {(missingFieldsDialog?.fields || []).map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMissingFieldsDialog(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
