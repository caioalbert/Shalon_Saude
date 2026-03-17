'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Cadastro } from '@/lib/types'
import Link from 'next/link'

export default function AdminDashboard() {
  const router = useRouter()
  const [cadastros, setCadastros] = useState<Cadastro[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [templateFile, setTemplateFile] = useState<File | null>(null)
  const [templateInputKey, setTemplateInputKey] = useState(0)
  const [templateMessage, setTemplateMessage] = useState<string | null>(null)
  const [templateLoading, setTemplateLoading] = useState(false)
  const [hasCustomTemplate, setHasCustomTemplate] = useState(false)

  useEffect(() => {
    fetchCadastros()
    fetchTemplateInfo()
  }, [])

  const fetchTemplateInfo = async () => {
    try {
      const response = await fetch('/api/admin/termo-template')
      if (!response.ok) return

      const data = await response.json()
      setHasCustomTemplate(Boolean(data.hasCustomTemplate))
    } catch {
      // ignore
    }
  }

  const fetchCadastros = async () => {
    try {
      setIsLoading(true)
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
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
      router.push('/admin/login')
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  const handleTemplateUpload = async () => {
    if (!templateFile) {
      setTemplateMessage('Selecione um arquivo .txt ou .md')
      return
    }

    try {
      setTemplateLoading(true)
      setTemplateMessage(null)

      const formData = new FormData()
      formData.append('template', templateFile)

      const response = await fetch('/api/admin/termo-template', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao enviar template')
      }

      setTemplateMessage('Template salvo com sucesso. Novos PDFs já usarão este conteúdo.')
      setTemplateFile(null)
      setTemplateInputKey((prev) => prev + 1)
      setHasCustomTemplate(true)
    } catch (err) {
      setTemplateMessage(err instanceof Error ? err.message : 'Erro ao enviar template')
    } finally {
      setTemplateLoading(false)
    }
  }

  const handleTemplateReset = async () => {
    try {
      setTemplateLoading(true)
      setTemplateMessage(null)

      const response = await fetch('/api/admin/termo-template', {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao restaurar template')
      }

      setTemplateMessage('Template padrão restaurado com sucesso.')
      setTemplateFile(null)
      setTemplateInputKey((prev) => prev + 1)
      setHasCustomTemplate(false)
    } catch (err) {
      setTemplateMessage(err instanceof Error ? err.message : 'Erro ao restaurar template')
    } finally {
      setTemplateLoading(false)
    }
  }

  const filteredCadastros = cadastros.filter(
    (cadastro) =>
      cadastro.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cadastro.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cadastro.cpf.includes(searchTerm)
  )

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SHALON Saúde - Admin</h1>
            <p className="text-sm text-gray-600">Painel de Gerenciamento de Cadastros</p>
          </div>
          <Button onClick={handleLogout} variant="outline">
            Sair
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Total de Cadastros</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{cadastros.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Com Selfie</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              {cadastros.filter((c) => c.selfie_path).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Com Dependentes</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {cadastros.filter((c) => c.tem_dependentes).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Termos Assinados</p>
            <p className="text-3xl font-bold text-purple-600 mt-2">
              {cadastros.filter((c) => c.termo_assinado_em).length}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Pesquisar por nome, email ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button onClick={fetchCadastros} variant="outline">
              Atualizar
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Template do Termo (PDF)</h2>
            <p className="text-sm text-gray-600 mt-1">
              Você pode enviar um arquivo para customizar o texto legal do termo sem editar código.
            </p>
          </div>

          <div className="text-sm text-gray-700 space-y-1">
            <p>Como carregar corretamente:</p>
            <p>1. Use arquivo .txt ou .md em UTF-8.</p>
            <p>2. Separe parágrafos com uma linha em branco.</p>
            <p>3. Títulos em linha isolada (ex.: TELEMEDICINA, ASSISTÊNCIA FUNERÁRIA).</p>
            <p>4. Tamanho máximo: 200KB.</p>
          </div>

          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <input
              key={templateInputKey}
              type="file"
              accept=".txt,.md,text/plain,text/markdown"
              onChange={(event) => setTemplateFile(event.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-700 border border-gray-300 rounded-lg p-2"
            />
            <Button
              onClick={handleTemplateUpload}
              disabled={templateLoading || !templateFile}
              className="md:w-auto"
            >
              {templateLoading ? 'Enviando...' : 'Enviar Template'}
            </Button>
            <Button
              onClick={handleTemplateReset}
              variant="outline"
              disabled={templateLoading || !hasCustomTemplate}
              className="md:w-auto"
            >
              Restaurar Padrão
            </Button>
          </div>

          <p className="text-sm text-gray-600">
            Template ativo: {hasCustomTemplate ? 'Personalizado' : 'Padrão do sistema'}
          </p>

          {templateMessage && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-700">{templateMessage}</p>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        )}

        {/* Loading */}
        {isLoading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">Carregando cadastros...</p>
          </div>
        ) : filteredCadastros.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">Nenhum cadastro encontrado</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Nome
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      CPF
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Data de Assinatura
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCadastros.map((cadastro) => (
                    <tr key={cadastro.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {cadastro.nome}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{cadastro.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 font-mono">{cadastro.cpf}</td>
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
                        <div className="flex gap-1">
                          {cadastro.selfie_path && (
                            <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                              Selfie
                            </span>
                          )}
                          {cadastro.tem_dependentes && (
                            <span className="inline-block px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                              Dependentes
                            </span>
                          )}
                          {cadastro.termo_assinado_em && (
                            <span className="inline-block px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                              Assinado
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Link href={`/admin/cadastro/${cadastro.id}`}>
                          <Button size="sm" variant="outline">
                            Ver Detalhes
                          </Button>
                        </Link>
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
