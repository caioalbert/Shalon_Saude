'use client'

import { CadastroFormData } from '@/lib/types'
import { isValidCPF } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState } from 'react'

interface StepPessoalProps {
  data: Partial<CadastroFormData>
  onUpdate: (data: Partial<CadastroFormData>) => void
  showValidation?: boolean
}

const ESCOLARIDADE_OPTIONS = [
  'Ensino Fundamental - Incompleto',
  'Ensino Fundamental - Completo',
  'Ensino Médio - Incompleto',
  'Ensino Médio - Completo',
  'Ensino Superior - Incompleto',
  'Ensino Superior - Completo',
]

const CONGREGACAO_OPTIONS = [
  'Sede',
  'Alquiraz',
  'Eusébio',
  'Barra do Ceará',
  'Aldemir Martins',
  'Jabuti',
  'Capuan',
  'Lagoa Redonda',
  'Maraponga',
  'Metrópole',
  'Maracanaú',
  'Ocara',
  'São Cristóvão',
  'Aracati',
]

const POSICAO_IGREJA_OPTIONS = [
  'Novo(a) Convertido(a)',
  'Juvenil (Menor)',
  'Jovem',
  'Membro',
  'Obreiro(a) cooperador',
  'Diácono',
  'Evangelista',
  'Presbítero',
  'Pastor',
  'Missionário(a)',
]

export function StepPessoal({ data, onUpdate, showValidation = false }: StepPessoalProps) {
  const [localData, setLocalData] = useState({
    nome: data.nome || '',
    email: data.email || '',
    cpf: data.cpf || '',
    rg: data.rg || '',
    data_nascimento: data.data_nascimento || '',
    telefone: data.telefone || '',
    sexo: data.sexo || '',
    estado_civil: data.estado_civil || '',
    nome_conjuge: data.nome_conjuge || '',
    escolaridade: data.escolaridade || '',
    situacao_profissional: data.situacao_profissional || '',
    profissao: data.profissao || '',
    congregacao_atual: data.congregacao_atual || '',
    posicao_igreja: data.posicao_igreja || '',
  })
  const [cpfError, setCpfError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const next = { ...localData, [name]: value }
    setLocalData(next)
    onUpdate(next)
  }

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target
    const next = {
      ...localData,
      [name]: value,
      ...(name === 'estado_civil' && value !== 'Casado(a)' ? { nome_conjuge: '' } : {}),
    }
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

  const isMissingField = (field: keyof typeof localData) =>
    showValidation && !String(localData[field] || '').trim()

  const inputClass = (field: keyof typeof localData) =>
    `mt-2 ${isMissingField(field) ? 'border-red-400 focus-visible:ring-red-500' : 'border-gray-300'}`

  const selectClass = (field: keyof typeof localData) =>
    `mt-2 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
      isMissingField(field)
        ? 'border-red-400 focus:ring-red-500'
        : 'border-gray-300 focus:ring-blue-500'
    }`

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
          className={inputClass('nome')}
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
              const next = { ...localData, cpf: formatted }
              setLocalData(next)
              onUpdate(next)
              setCpfError(null)
            }}
            onBlur={handleCpfBlur}
            required
            className={`mt-2 ${
              cpfError || isMissingField('cpf')
                ? 'border-red-400 focus-visible:ring-red-500'
                : 'border-gray-300'
            }`}
            maxLength={14}
          />
          {cpfError && <p className="mt-1 text-xs text-red-600">{cpfError}</p>}
        </div>

        <div>
          <Label htmlFor="rg" className="text-gray-700 font-medium">
            RG *
          </Label>
          <Input
            id="rg"
            name="rg"
            type="text"
            placeholder="00.000.000-0"
            value={localData.rg}
            onChange={handleChange}
            onBlur={handleBlur}
            required
            className={inputClass('rg')}
          />
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
            className={inputClass('data_nascimento')}
          />
        </div>

        <div>
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
            className={selectClass('sexo')}
          >
            <option value="">Selecione...</option>
            <option value="Feminino">Feminino</option>
            <option value="Masculino">Masculino</option>
            <option value="Outro">Outro</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="estado_civil" className="text-gray-700 font-medium">
            Estado Civil *
          </Label>
          <select
            id="estado_civil"
            name="estado_civil"
            value={localData.estado_civil}
            onChange={handleSelectChange}
            onBlur={handleBlur}
            required
            className={selectClass('estado_civil')}
          >
            <option value="">Selecione...</option>
            <option value="Solteiro(a)">Solteiro(a)</option>
            <option value="Casado(a)">Casado(a)</option>
            <option value="Divorciado(a)">Divorciado(a)</option>
            <option value="Viúvo(a)">Viúvo(a)</option>
          </select>
        </div>

        {localData.estado_civil === 'Casado(a)' && (
          <div className="sm:col-span-2">
            <Label htmlFor="nome_conjuge" className="text-gray-700 font-medium">
              Nome do Cônjuge (se casado) *
            </Label>
            <Input
              id="nome_conjuge"
              name="nome_conjuge"
              type="text"
              placeholder="Nome do cônjuge"
              value={localData.nome_conjuge}
              onChange={handleChange}
              onBlur={handleBlur}
              required
              className={`mt-2 ${
                showValidation &&
                localData.estado_civil === 'Casado(a)' &&
                !localData.nome_conjuge.trim()
                  ? 'border-red-400 focus-visible:ring-red-500'
                  : 'border-gray-300'
              }`}
            />
          </div>
        )}

        <div className="sm:col-span-2">
          <Label htmlFor="escolaridade" className="text-gray-700 font-medium">
            Escolaridade *
          </Label>
          <select
            id="escolaridade"
            name="escolaridade"
            value={localData.escolaridade}
            onChange={handleSelectChange}
            onBlur={handleBlur}
            required
            className={selectClass('escolaridade')}
          >
            <option value="">Selecione...</option>
            {ESCOLARIDADE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="situacao_profissional" className="text-gray-700 font-medium">
            Situação Profissional *
          </Label>
          <select
            id="situacao_profissional"
            name="situacao_profissional"
            value={localData.situacao_profissional}
            onChange={handleSelectChange}
            onBlur={handleBlur}
            required
            className={selectClass('situacao_profissional')}
          >
            <option value="">Selecione...</option>
            <option value="Empregado">Empregado</option>
            <option value="Desempregado">Desempregado</option>
          </select>
        </div>

        <div>
          <Label htmlFor="profissao" className="text-gray-700 font-medium">
            Profissão
          </Label>
          <Input
            id="profissao"
            name="profissao"
            type="text"
            placeholder="Ex.: Auxiliar administrativo"
            value={localData.profissao}
            onChange={handleChange}
            onBlur={handleBlur}
            className="mt-2 border-gray-300"
          />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="congregacao_atual" className="text-gray-700 font-medium">
            Congregação Atual *
          </Label>
          <select
            id="congregacao_atual"
            name="congregacao_atual"
            value={localData.congregacao_atual}
            onChange={handleSelectChange}
            onBlur={handleBlur}
            required
            className={selectClass('congregacao_atual')}
          >
            <option value="">Selecione...</option>
            {CONGREGACAO_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="posicao_igreja" className="text-gray-700 font-medium">
            Posição na Igreja *
          </Label>
          <select
            id="posicao_igreja"
            name="posicao_igreja"
            value={localData.posicao_igreja}
            onChange={handleSelectChange}
            onBlur={handleBlur}
            required
            className={selectClass('posicao_igreja')}
          >
            <option value="">Selecione...</option>
            {POSICAO_IGREJA_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
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
          className={inputClass('email')}
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
            const next = { ...localData, telefone: formatted }
            setLocalData(next)
            onUpdate(next)
          }}
          onBlur={handleBlur}
          required
          className={inputClass('telefone')}
          maxLength={15}
        />
        <p className="mt-1 text-xs text-gray-500">Necessário para acesso aos serviços de telemedicina.</p>
      </div>

      <p className="text-xs text-gray-500">* Campo obrigatório</p>
    </div>
  )
}
