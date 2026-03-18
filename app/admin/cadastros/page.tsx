'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Eye, Loader2, Pencil, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Cadastro } from '@/lib/types'

const REQUIRED_CADASTRO_FIELDS: Array<{ key: keyof Cadastro; label: string }> = [
  { key: 'nome', label: 'Nome' },
  { key: 'email', label: 'Email' },
  { key: 'cpf', label: 'CPF' },
  { key: 'rg', label: 'RG' },
  { key: 'telefone', label: 'Telefone' },
  { key: 'sexo', label: 'Sexo' },
  { key: 'data_nascimento', label: 'Data de nascimento' },
  { key: 'estado_civil', label: 'Estado civil' },
  { key: 'escolaridade', label: 'Escolaridade' },
  { key: 'situacao_profissional', label: 'Situação profissional' },
  { key: 'congregacao_atual', label: 'Congregação atual' },
  { key: 'posicao_igreja', label: 'Posição na igreja' },
  { key: 'endereco', label: 'Endereço' },
  { key: 'numero', label: 'Número' },
  { key: 'bairro', label: 'Bairro' },
  { key: 'cidade', label: 'Cidade' },
  { key: 'estado', label: 'Estado' },
  { key: 'cep', label: 'CEP' },
]

function getMissingCadastroFields(cadastro: Cadastro) {
  const missing = REQUIRED_CADASTRO_FIELDS.filter(({ key }) => !String(cadastro[key] || '').trim()).map(
    ({ label }) => label
  )

  if (cadastro.estado_civil === 'Casado(a)' && !String(cadastro.nome_conjuge || '').trim()) {
    missing.push('Nome do cônjuge')
  }

  return missing
}

export default function AdminCadastrosPage() {
  const router = useRouter()
  const [cadastros, setCadastros] = useState<Cadastro[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [exportLoading, setExportLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchCadastros = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
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

  const summary = useMemo(() => {
    const withDependentes = cadastros.filter((item) => item.tem_dependentes).length
    const withSelfie = cadastros.filter((item) => item.selfie_path).length
    const signedTerms = cadastros.filter((item) => item.termo_assinado_em).length
    return {
      total: cadastros.length,
      withDependentes,
      withSelfie,
      signedTerms,
    }
  }, [cadastros])

  const filteredCadastros = useMemo(
    () =>
      cadastros.filter(
        (cadastro) =>
          cadastro.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cadastro.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cadastro.cpf.includes(searchTerm)
      ),
    [cadastros, searchTerm]
  )

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cadastros</h1>
            <p className="text-sm text-gray-600">Busca e gestão detalhada dos registros</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link href="/admin/dashboard">
              <Button variant="outline">Dashboard</Button>
            </Link>
            <Link href="/admin/termo-template">
              <Button variant="outline">Atualizar Termo de Adesão</Button>
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
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
            <p className="text-sm text-gray-600">Termos Assinados</p>
            <p className="mt-1 text-2xl font-bold text-purple-700">
              {summary.signedTerms.toLocaleString('pt-BR')}
            </p>
          </div>
        </div>

        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row">
            <input
              type="text"
              placeholder="Pesquisar por nome, email ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
            <Button onClick={fetchCadastros} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Atualizar lista
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-8 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="font-medium text-red-700">{error}</p>
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
                      Congregação
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-700">Posição</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-700">
                      Data de Assinatura
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
                      <td className="px-6 py-4 text-sm text-gray-600">{cadastro.congregacao_atual || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{cadastro.posicao_igreja || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {cadastro.termo_assinado_em
                          ? new Date(cadastro.termo_assinado_em).toLocaleDateString('pt-BR', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                            })
                          : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex flex-wrap gap-1">
                          {cadastro.termo_assinado_em && (
                            <span className="inline-flex items-center gap-1 rounded bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
                              <CheckCircle2 className="h-3 w-3" />
                              Assinado
                            </span>
                          )}
                          {!cadastro.termo_assinado_em && (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                              Não assinado
                            </span>
                          )}
                          {(() => {
                            const missingFields = getMissingCadastroFields(cadastro)
                            if (missingFields.length === 0) {
                              return (
                                <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                                  Dados completos
                                </span>
                              )
                            }

                            return (
                              <span
                                title={`Campos faltantes: ${missingFields.join(', ')}`}
                                className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700"
                              >
                                Dados faltantes ({missingFields.length})
                              </span>
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
    </main>
  )
}
