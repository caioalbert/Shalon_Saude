'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Link from 'next/link'

type Dependente = {
  id: string
  nome: string
  cpf: string
  data_nascimento: string
  relacao: string
  email?: string
  telefone_celular?: string
  sexo?: string
}

type Plano = {
  codigo: string
  nome: string
  permite_dependentes: boolean
  min_dependentes: number
  max_dependentes: number | null
}

export default function ClienteDependentes() {
  const router = useRouter()
  const [dependentes, setDependentes] = useState<Dependente[]>([])
  const [plano, setPlano] = useState<Plano | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    data_nascimento: '',
    relacao: '',
    email: '',
    telefone_celular: '',
    sexo: '',
  })

  useEffect(() => {
    fetchDependentes()
    fetchPlano()
  }, [])

  const fetchPlano = async () => {
    try {
      const response = await fetch('/api/cliente/plano')
      
      if (response.status === 401) {
        router.push('/login')
        return
      }

      const data = await response.json()

      if (response.ok) {
        setPlano(data.plano)
      }
    } catch (err) {
      console.error('Erro ao conectar com o servidor:', err)
    }
  }

  const fetchDependentes = async () => {
    try {
      const response = await fetch('/api/cliente/dependentes')
      
      if (response.status === 401) {
        router.push('/login')
        return
      }

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Erro ao carregar dependentes')
        return
      }

      setDependentes(data.dependentes || [])
    } catch (err) {
      setError('Erro ao conectar com o servidor')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingId(null)
    setFormData({
      nome: '',
      cpf: '',
      data_nascimento: '',
      relacao: '',
      email: '',
      telefone_celular: '',
      sexo: '',
    })
    setIsDialogOpen(true)
  }

  const handleEdit = (dependente: Dependente) => {
    setEditingId(dependente.id)
    setFormData({
      nome: dependente.nome,
      cpf: dependente.cpf,
      data_nascimento: dependente.data_nascimento,
      relacao: dependente.relacao,
      email: dependente.email || '',
      telefone_celular: dependente.telefone_celular || '',
      sexo: dependente.sexo || '',
    })
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError('')

    try {
      const url = '/api/cliente/dependentes'
      const method = editingId ? 'PUT' : 'POST'
      const body = editingId ? { ...formData, id: editingId } : formData

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Erro ao salvar dependente')
        return
      }

      setIsDialogOpen(false)
      fetchDependentes()
    } catch (err) {
      setError('Erro ao conectar com o servidor')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este dependente?')) {
      return
    }

    try {
      const response = await fetch(`/api/cliente/dependentes?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Erro ao remover dependente')
        return
      }

      fetchDependentes()
    } catch (err) {
      setError('Erro ao conectar com o servidor')
    }
  }

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    }
    return value
  }

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('pt-BR')

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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/cliente/dashboard">
                <Button variant="ghost" size="sm" className="text-gray-600">
                  ← Voltar
                </Button>
              </Link>
              <h1 className="text-2xl font-bold" style={{ color: '#006B54' }}>Dependentes</h1>
            </div>
            {plano?.permite_dependentes && (
              <Button 
                onClick={handleAdd}
                style={{ backgroundColor: '#006B54' }}
                className="text-white hover:opacity-90"
              >
                + Adicionar Dependente
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {/* Plano não identificado */}
        {plano === null && (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-gray-100">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Não conseguimos identificar seu plano</h2>
            <p className="text-gray-600 mb-6">
              Entre em contato com o suporte ou escolha um novo plano.
            </p>
            <div className="flex gap-3 justify-center">
              <Button 
                variant="outline"
                onClick={() => window.open('https://wa.me/5585991452514', '_blank')}
              >
                Contatar Suporte
              </Button>
              <Button 
                style={{ backgroundColor: '#006B54' }}
                className="text-white hover:opacity-90"
                disabled
              >
                Escolher Plano (Em breve)
              </Button>
            </div>
          </div>
        )}

        {/* Plano não permite dependentes */}
        {plano && !plano.permite_dependentes && (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: '#FFF4E6' }}>
              <svg className="w-8 h-8" style={{ color: '#FF9800' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Seu plano não permite dependentes</h2>
            <p className="text-gray-600 mb-6">
              Faça upgrade para um plano familiar e adicione seus dependentes.
            </p>
            <Button 
              style={{ backgroundColor: '#006B54' }}
              className="text-white hover:opacity-90"
              disabled
            >
              Fazer Upgrade (Em breve)
            </Button>
          </div>
        )}

        {/* Plano permite dependentes */}
        {plano && plano.permite_dependentes && (
          <>
            {dependentes.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                <p className="text-gray-600 mb-4">Nenhum dependente cadastrado.</p>
                <Button 
                  onClick={handleAdd}
                  style={{ backgroundColor: '#006B54' }}
                  className="text-white hover:opacity-90"
                >
                  Adicionar Primeiro Dependente
                </Button>
              </div>
            ) : (
              <>
                {/* Info do plano */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                  <p className="text-sm text-blue-900">
                    <strong>{plano.nome}</strong> - {dependentes.length} de {plano.max_dependentes || '∞'} dependentes cadastrados
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dependentes.map((dependente) => (
              <div key={dependente.id} className="bg-white rounded-lg shadow p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{dependente.nome}</h3>
                  <p className="text-sm text-gray-600">{dependente.relacao}</p>
                </div>

                <div className="space-y-2 mb-4">
                  <div>
                    <p className="text-xs text-gray-600">CPF</p>
                    <p className="text-sm text-gray-900">{formatCPF(dependente.cpf)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Data de Nascimento</p>
                    <p className="text-sm text-gray-900">{formatDate(dependente.data_nascimento)}</p>
                  </div>
                  {dependente.email && (
                    <div>
                      <p className="text-xs text-gray-600">Email</p>
                      <p className="text-sm text-gray-900">{dependente.email}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEdit(dependente)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleDelete(dependente.id)}
                  >
                    Remover
                  </Button>
                </div>
              </div>
            ))}
          </div>
              </>
            )}
          </>
        )}
      </main>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar Dependente' : 'Adicionar Dependente'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nome">Nome Completo *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="cpf">CPF *</Label>
              <Input
                id="cpf"
                value={formatCPF(formData.cpf)}
                onChange={(e) => setFormData({ ...formData, cpf: e.target.value.replace(/\D/g, '') })}
                maxLength={14}
                required
              />
            </div>

            <div>
              <Label htmlFor="data_nascimento">Data de Nascimento *</Label>
              <Input
                id="data_nascimento"
                type="date"
                value={formData.data_nascimento}
                onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="relacao">Relação *</Label>
              <Select
                value={formData.relacao}
                onValueChange={(value) => setFormData({ ...formData, relacao: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cônjuge">Cônjuge</SelectItem>
                  <SelectItem value="Filho(a)">Filho(a)</SelectItem>
                  <SelectItem value="Pai/Mãe">Pai/Mãe</SelectItem>
                  <SelectItem value="Irmão(ã)">Irmão(ã)</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="sexo">Sexo</Label>
              <Select
                value={formData.sexo}
                onValueChange={(value) => setFormData({ ...formData, sexo: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Masculino">Masculino</SelectItem>
                  <SelectItem value="Feminino">Feminino</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="telefone_celular">Telefone Celular</Label>
              <Input
                id="telefone_celular"
                value={formData.telefone_celular}
                onChange={(e) => setFormData({ ...formData, telefone_celular: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
