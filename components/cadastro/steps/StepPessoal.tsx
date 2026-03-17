'use client'

import { CadastroFormData } from '@/lib/types'
import { isValidCPF } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState } from 'react'

interface StepPessoalProps {
  data: Partial<CadastroFormData>
  onUpdate: (data: Partial<CadastroFormData>) => void
}

export function StepPessoal({ data, onUpdate }: StepPessoalProps) {
  const [localData, setLocalData] = useState({
    nome: data.nome || '',
    email: data.email || '',
    cpf: data.cpf || '',
    data_nascimento: data.data_nascimento || '',
    telefone: data.telefone || '',
    sexo: data.sexo || '',
  })
  const [cpfError, setCpfError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setLocalData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target
    const next = { ...localData, [name]: value }
    setLocalData(next)
    onUpdate(next)
  }

  const handleBlur = () => {
    onUpdate(localData)
  }

  const handleCpfBlur = () => {
    if (!localData.cpf) {
      setCpfError('CPF é obrigatório')
      onUpdate(localData)
      return
    }

    if (!isValidCPF(localData.cpf)) {
      setCpfError('CPF inválido')
      onUpdate(localData)
      return
    }

    setCpfError(null)
    onUpdate(localData)
  }

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      .substring(0, 14)
  }

  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, '')
    return cleaned
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .substring(0, 15)
  }

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="nome" className="text-gray-700 font-medium">
          Nome Completo *
        </Label>
        <Input
          id="nome"
          name="nome"
          type="text"
          placeholder="João Silva"
          value={localData.nome}
          onChange={handleChange}
          onBlur={handleBlur}
          required
          className="mt-2 border-gray-300"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="cpf" className="text-gray-700 font-medium">
            CPF *
          </Label>
          <Input
            id="cpf"
            name="cpf"
            type="text"
            placeholder="000.000.000-00"
            value={formatCPF(localData.cpf)}
            onChange={(e) => {
              const formatted = formatCPF(e.target.value)
              setLocalData((prev) => ({ ...prev, cpf: formatted }))
              setCpfError(null)
            }}
            onBlur={handleCpfBlur}
            required
            className={`mt-2 ${cpfError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'}`}
            maxLength={14}
          />
          {cpfError && <p className="mt-1 text-xs text-red-600">{cpfError}</p>}
        </div>

        <div>
          <Label htmlFor="data_nascimento" className="text-gray-700 font-medium">
            Data de Nascimento *
          </Label>
          <Input
            id="data_nascimento"
            name="data_nascimento"
            type="date"
            value={localData.data_nascimento}
            onChange={handleChange}
            onBlur={handleBlur}
            required
            className="mt-2 border-gray-300"
          />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="sexo" className="text-gray-700 font-medium">
            Sexo *
          </Label>
          <select
            id="sexo"
            name="sexo"
            value={localData.sexo}
            onChange={handleSelectChange}
            onBlur={handleBlur}
            required
            className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecione...</option>
            <option value="Feminino">Feminino</option>
            <option value="Masculino">Masculino</option>
            <option value="Outro">Outro</option>
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="email" className="text-gray-700 font-medium">
          Email *
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="seu@email.com"
          value={localData.email}
          onChange={handleChange}
          onBlur={handleBlur}
          required
          className="mt-2 border-gray-300"
        />
      </div>

      <div>
        <Label htmlFor="telefone" className="text-gray-700 font-medium">
          Telefone Celular *
        </Label>
        <Input
          id="telefone"
          name="telefone"
          type="tel"
          placeholder="(11) 99999-9999"
          value={formatPhone(localData.telefone)}
          onChange={(e) => {
            const formatted = formatPhone(e.target.value)
            setLocalData((prev) => ({ ...prev, telefone: formatted }))
          }}
          onBlur={handleBlur}
          required
          className="mt-2 border-gray-300"
          maxLength={15}
        />
        <p className="mt-1 text-xs text-gray-500">Necessário para acesso aos serviços de telemedicina.</p>
      </div>

      <p className="text-xs text-gray-500">* Campo obrigatório</p>
    </div>
  )
}
