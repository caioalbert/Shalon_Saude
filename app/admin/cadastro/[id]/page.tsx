'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Cadastro, Dependente } from '@/lib/types'
import Link from 'next/link'
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

export default function CadastroDetail() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [cadastro, setCadastro] = useState<Cadastro | null>(null)
  const [dependentes, setDependentes] = useState<Dependente[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null)

  useEffect(() => {
    fetchCadastro()
  }, [id])

  const fetchCadastro = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/admin/cadastro/${id}`)

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/admin/login')
          return
        }
        throw new Error('Cliente não encontrado')
      }

      const data = await response.json()
      setCadastro(data.cadastro)
      setDependentes(data.dependentes || [])

      // Buscar URL da selfie se existir
      if (data.cadastro.selfie_path) {
        try {
          const selfieResponse = await fetch(
            `/api/admin/selfie?pathname=${encodeURIComponent(data.cadastro.selfie_path)}`
          )
          if (selfieResponse.ok) {
            const blob = await selfieResponse.blob()
            setSelfieUrl(URL.createObjectURL(blob))
          }
        } catch (err) {
          console.error('Selfie fetch error:', err)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setIsLoading(false)
    }
  }

  const downloadPDF = async () => {
    if (!cadastro) return

    try {
      const response = await fetch('/api/admin/gerar-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cadastroId: cadastro.id }),
      })

      if (!response.ok) {
        throw new Error('Erro ao gerar PDF')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `termo-adesao-${cadastro.cpf}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao baixar PDF')
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Link href="/admin/clientes">
              <Button variant="outline">← Voltar</Button>
            </Link>
          </div>
        </header>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-gray-600">Carregando dados...</p>
        </div>
      </main>
    )
  }

  if (error || !cadastro) {
    return (
      <main className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Link href="/admin/clientes">
              <Button variant="outline">← Voltar</Button>
            </Link>
          </div>
        </header>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 font-medium">{error || 'Cliente não encontrado'}</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-gray-900 sm:text-2xl">{cadastro.nome}</h1>
            <p className="text-xs text-gray-600 sm:text-sm">Detalhes do cliente</p>
          </div>

          <div className="hidden items-center gap-2 lg:flex">
            <Link href="/admin/clientes">
              <Button variant="outline" size="sm">
                ← Voltar
              </Button>
            </Link>
            <Button onClick={downloadPDF} className="bg-blue-600 hover:bg-blue-700">
              📥 Baixar Termo
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
                  <SheetTitle>Menu Cliente</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-2 px-4 pb-4">
                  <SheetClose asChild>
                    <Button asChild variant="outline" className="w-full justify-start">
                      <Link href="/admin/clientes">Voltar</Link>
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button onClick={downloadPDF} className="w-full justify-start bg-blue-600 hover:bg-blue-700">
                      Baixar Termo
                    </Button>
                  </SheetClose>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Selfie */}
          {selfieUrl && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Selfie</h2>
                <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
                  <img
                    src={selfieUrl}
                    alt="Selfie do cliente"
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Capturada em: {new Date(cadastro.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          )}

          {/* Dados */}
          <div className={selfieUrl ? 'lg:col-span-2' : 'lg:col-span-3'}>
            <div className="space-y-6">
              {/* Dados Pessoais */}
              <div className="bg-white rounded-lg shadow p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Dados Pessoais</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs text-gray-600 uppercase font-medium">Nome</p>
                    <p className="text-lg font-medium text-gray-900">{cadastro.nome}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 uppercase font-medium">CPF</p>
                    <p className="text-lg font-medium text-gray-900 font-mono">{cadastro.cpf}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 uppercase font-medium">RG</p>
                    <p className="text-lg font-medium text-gray-900">{cadastro.rg || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 uppercase font-medium">Email</p>
                    <p className="text-lg font-medium text-gray-900">{cadastro.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 uppercase font-medium">Telefone</p>
                    <p className="text-lg font-medium text-gray-900">{cadastro.telefone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 uppercase font-medium">Data de Nascimento</p>
                    <p className="text-lg font-medium text-gray-900">
                      {cadastro.data_nascimento
                        ? new Date(cadastro.data_nascimento).toLocaleDateString('pt-BR')
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 uppercase font-medium">Sexo</p>
                    <p className="text-lg font-medium text-gray-900">{cadastro.sexo || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 uppercase font-medium">Estado Civil</p>
                    <p className="text-lg font-medium text-gray-900">{cadastro.estado_civil || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 uppercase font-medium">Nome do Cônjuge</p>
                    <p className="text-lg font-medium text-gray-900">{cadastro.nome_conjuge || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 uppercase font-medium">Escolaridade</p>
                    <p className="text-lg font-medium text-gray-900">{cadastro.escolaridade || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 uppercase font-medium">Situação Profissional</p>
                    <p className="text-lg font-medium text-gray-900">
                      {cadastro.situacao_profissional || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 uppercase font-medium">Profissão</p>
                    <p className="text-lg font-medium text-gray-900">{cadastro.profissao || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Endereço */}
              <div className="bg-white rounded-lg shadow p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Endereço</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="sm:col-span-2">
                    <p className="text-xs text-gray-600 uppercase font-medium">Endereço</p>
                    <p className="text-lg font-medium text-gray-900">
                      {cadastro.endereco} {cadastro.numero && `, ${cadastro.numero}`}
                    </p>
                    {cadastro.complemento && (
                      <p className="text-sm text-gray-600">{cadastro.complemento}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 uppercase font-medium">Bairro</p>
                    <p className="text-lg font-medium text-gray-900">{cadastro.bairro || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 uppercase font-medium">Cidade</p>
                    <p className="text-lg font-medium text-gray-900">{cadastro.cidade || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 uppercase font-medium">Estado</p>
                    <p className="text-lg font-medium text-gray-900">{cadastro.estado || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 uppercase font-medium">CEP</p>
                    <p className="text-lg font-medium text-gray-900 font-mono">{cadastro.cep || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Dependentes */}
              {cadastro.tem_dependentes && dependentes.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6 space-y-4">
                  <h2 className="text-lg font-semibold text-gray-900">Dependentes</h2>
                  <div className="space-y-3">
                    {dependentes.map((dep) => (
                      <div key={dep.id} className="border border-gray-200 rounded p-4">
                        <p className="font-medium text-gray-900">{dep.nome}</p>
                        <p className="text-sm text-gray-600">
                          {dep.relacao && `Relação: ${dep.relacao}`}
                        </p>
                        {dep.cpf && (
                          <p className="text-sm text-gray-600 font-mono">CPF: {dep.cpf}</p>
                        )}
                        {dep.email && (
                          <p className="text-sm text-gray-600">Email: {dep.email}</p>
                        )}
                        {dep.rg && (
                          <p className="text-sm text-gray-600">RG: {dep.rg}</p>
                        )}
                        {dep.data_nascimento && (
                          <p className="text-sm text-gray-600">
                            Data de Nascimento:{' '}
                            {new Date(dep.data_nascimento).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                        {dep.sexo && (
                          <p className="text-sm text-gray-600">Sexo: {dep.sexo}</p>
                        )}
                        {dep.telefone_celular && (
                          <p className="text-sm text-gray-600">Celular: {dep.telefone_celular}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Informações do Termo */}
              <div className="bg-white rounded-lg shadow p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Termo de Adesão</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs text-gray-600 uppercase font-medium">Cliente desde</p>
                    <p className="text-lg font-medium text-gray-900">
                      {new Date(cadastro.created_at).toLocaleDateString('pt-BR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 uppercase font-medium">Email enviado em</p>
                    <p className="text-lg font-medium text-gray-900">
                      {cadastro.email_enviado_em
                        ? new Date(cadastro.email_enviado_em).toLocaleDateString('pt-BR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
