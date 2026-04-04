'use client'

import { CadastroFormData, DependenteFormData } from '@/lib/types'
import { getAgeFromIsoDate, isValidCPF, isValidEmail } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface StepDependentesProps {
  data: Partial<CadastroFormData>
  onUpdate: (data: Partial<CadastroFormData>) => void
  showValidation?: boolean
}

export function StepDependentes({ data, onUpdate, showValidation = false }: StepDependentesProps) {
  const [tem_dependentes, setTemDependentes] = useState(data.tem_dependentes || false)
  const [dependentes, setDependentes] = useState<DependenteFormData[]>(data.dependentes || [])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [cpfError, setCpfError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [formData, setFormData] = useState<DependenteFormData>({
    nome: '',
    rg: '',
    cpf: '',
    data_nascimento: '',
    relacao: '',
    email: '',
    telefone_celular: '',
    sexo: '',
  })

  const handleAddDependente = () => {
    const dependente = {
      ...formData,
      nome: formData.nome.trim(),
      rg: formData.rg.trim(),
      email: formData.email.trim(),
      telefone_celular: formatPhone(formData.telefone_celular),
    }

    if (
      !dependente.nome ||
      !dependente.rg ||
      !dependente.relacao ||
      !dependente.email ||
      !dependente.telefone_celular ||
      !dependente.sexo
    ) {
      return
    }

    if (dependente.cpf && !isValidCPF(dependente.cpf)) {
      setCpfError('CPF do dependente inválido')
      return
    }

    if (!isValidEmail(dependente.email)) {
      setEmailError('Email do dependente inválido')
      return
    }

    const titularEmail = String(data.email || '').trim().toLowerCase()
    const dependenteEmail = dependente.email.toLowerCase()
    const isSameAsTitular = titularEmail && dependenteEmail === titularEmail

    if (isSameAsTitular) {
      const age = getAgeFromIsoDate(dependente.data_nascimento || '')
      if (age === null) {
        setEmailError('Para usar o email do titular, informe a data de nascimento do dependente.')
        return
      }

      if (age >= 18) {
        setEmailError('Dependente maior de idade deve possuir email próprio.')
        return
      }
    }

    setCpfError(null)
    setEmailError(null)

    const nextDependentes =
      editingIndex !== null
        ? dependentes.map((dep, index) => (index === editingIndex ? dependente : dep))
        : [...dependentes, dependente]

    setDependentes(nextDependentes)
    onUpdate({ tem_dependentes, dependentes: nextDependentes })

    setFormData({
      nome: '',
      rg: '',
      cpf: '',
      data_nascimento: '',
      relacao: '',
      email: '',
      telefone_celular: '',
      sexo: '',
    })

    if (editingIndex !== null) {
      setEditingIndex(null)
    }
  }

  const handleRemoveDependente = (index: number) => {
    const newDependentes = dependentes.filter((_, i) => i !== index)
    setDependentes(newDependentes)
    onUpdate({ tem_dependentes, dependentes: newDependentes })
  }

  const handleEditDependente = (index: number) => {
    const dependente = dependentes[index]
    setFormData({
      ...dependente,
      rg: dependente.rg || '',
      email: dependente.email || '',
      telefone_celular: dependente.telefone_celular || '',
      sexo: dependente.sexo || '',
    })
    setEditingIndex(index)
    setCpfError(null)
    setEmailError(null)
  }

  const handleTemDependentesChange = (value: boolean) => {
    setTemDependentes(value)
    if (!value) {
      setDependentes([])
      setEditingIndex(null)
      setFormData({
        nome: '',
        rg: '',
        cpf: '',
        data_nascimento: '',
        relacao: '',
        email: '',
        telefone_celular: '',
        sexo: '',
      })
      setCpfError(null)
      setEmailError(null)
    }
    onUpdate({ tem_dependentes: value, dependentes: value ? dependentes : [] })
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

  const highlightRequired = showValidation && tem_dependentes && dependentes.length === 0

  return (
    <div className="space-y-6">
      <div>
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={tem_dependentes}
            onChange={(e) => handleTemDependentesChange(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded cursor-pointer"
          />
          <span className="text-gray-700 font-medium">Tenho dependentes</span>
        </label>
        {tem_dependentes && (
          <p className="mt-2 text-xs text-gray-500">
            Cada dependente deve ter email. Se for menor de idade, pode usar o mesmo email do titular.
          </p>
        )}
      </div>

      {tem_dependentes && (
        <div className="space-y-6 border-t pt-6">
          {/* Formulário de adição */}
          <div className="bg-blue-50 p-6 rounded-lg space-y-4">
            <h3 className="font-semibold text-gray-800">
              {editingIndex !== null ? 'Editar Dependente' : 'Adicionar Dependente'}
            </h3>

            <div>
              <Label htmlFor="dep_nome" className="text-gray-700 font-medium">
                Nome *
              </Label>
              <Input
                id="dep_nome"
                type="text"
                placeholder="Nome do dependente"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className={`mt-2 ${
                  highlightRequired && !formData.nome.trim()
                    ? 'border-red-400 focus-visible:ring-red-500'
                    : 'border-gray-300'
                }`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dep_rg" className="text-gray-700 font-medium">
                  RG *
                </Label>
                <Input
                  id="dep_rg"
                  type="text"
                  placeholder="RG do dependente"
                  value={formData.rg}
                  onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                  className={`mt-2 ${
                    highlightRequired && !formData.rg.trim()
                      ? 'border-red-400 focus-visible:ring-red-500'
                      : 'border-gray-300'
                  }`}
                />
              </div>

              <div>
                <Label htmlFor="dep_cpf" className="text-gray-700 font-medium">
                  CPF
                </Label>
                <Input
                  id="dep_cpf"
                  type="text"
                  placeholder="000.000.000-00"
                  value={formatCPF(formData.cpf)}
                  onChange={(e) => {
                    setFormData({ ...formData, cpf: formatCPF(e.target.value) })
                    setCpfError(null)
                  }}
                  onBlur={() => {
                    if (!formData.cpf) {
                      setCpfError(null)
                      return
                    }

                    setCpfError(isValidCPF(formData.cpf) ? null : 'CPF do dependente inválido')
                  }}
                  className="mt-2 border-gray-300"
                  maxLength={14}
                />
                {cpfError && <p className="mt-1 text-xs text-red-600">{cpfError}</p>}
              </div>

              <div>
                <Label htmlFor="dep_data" className="text-gray-700 font-medium">
                  Data de Nascimento
                </Label>
                <Input
                  id="dep_data"
                  type="date"
                  value={formData.data_nascimento}
                  onChange={(e) =>
                    setFormData({ ...formData, data_nascimento: e.target.value })
                  }
                  className="mt-2 border-gray-300"
                />
              </div>

              <div>
                <Label htmlFor="dep_email" className="text-gray-700 font-medium">
                  Email *
                </Label>
                <Input
                  id="dep_email"
                  type="email"
                  placeholder="dependente@email.com"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value })
                    setEmailError(null)
                  }}
                  onBlur={() => {
                    if (!formData.email.trim()) {
                      setEmailError(null)
                      return
                    }

                    setEmailError(isValidEmail(formData.email) ? null : 'Email do dependente inválido')
                  }}
                  className={`mt-2 ${
                    (highlightRequired && !formData.email.trim()) || emailError
                      ? 'border-red-400 focus-visible:ring-red-500'
                      : 'border-gray-300'
                  }`}
                />
                {emailError && <p className="mt-1 text-xs text-red-600">{emailError}</p>}
              </div>

              <div>
                <Label htmlFor="dep_celular" className="text-gray-700 font-medium">
                  Telefone Celular *
                </Label>
                <Input
                  id="dep_celular"
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={formatPhone(formData.telefone_celular)}
                  onChange={(e) =>
                    setFormData({ ...formData, telefone_celular: formatPhone(e.target.value) })
                  }
                  className={`mt-2 ${
                    highlightRequired && !formData.telefone_celular.trim()
                      ? 'border-red-400 focus-visible:ring-red-500'
                      : 'border-gray-300'
                  }`}
                  maxLength={15}
                />
              </div>

              <div>
                <Label htmlFor="dep_sexo" className="text-gray-700 font-medium">
                  Sexo *
                </Label>
                <select
                  id="dep_sexo"
                  value={formData.sexo}
                  onChange={(e) => setFormData({ ...formData, sexo: e.target.value })}
                  className={`mt-2 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    highlightRequired && !formData.sexo
                      ? 'border-red-400 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                >
                  <option value="">Selecione...</option>
                  <option value="Feminino">Feminino</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="dep_relacao" className="text-gray-700 font-medium">
                Relação *
              </Label>
              <select
                id="dep_relacao"
                value={formData.relacao}
                onChange={(e) => setFormData({ ...formData, relacao: e.target.value })}
                className={`mt-2 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  highlightRequired && !formData.relacao
                    ? 'border-red-400 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
              >
                <option value="">Selecione...</option>
                <option value="cônjuge">Cônjuge</option>
                <option value="filho">Filho(a)</option>
                <option value="enteado">Enteado(a)</option>
                <option value="outro">Outro</option>
              </select>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleAddDependente}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={
                  !formData.nome ||
                  !formData.rg ||
                  !formData.relacao ||
                  !formData.email ||
                  !formData.telefone_celular ||
                  !formData.sexo
                }
              >
                {editingIndex !== null ? 'Atualizar' : 'Adicionar'}
              </Button>
              {editingIndex !== null && (
                <Button
                  onClick={() => {
                    setEditingIndex(null)
                    setFormData({
                      nome: '',
                      rg: '',
                      cpf: '',
                      data_nascimento: '',
                      relacao: '',
                      email: '',
                      telefone_celular: '',
                      sexo: '',
                    })
                    setCpfError(null)
                    setEmailError(null)
                  }}
                  variant="outline"
                >
                  Cancelar
                </Button>
              )}
            </div>
          </div>

          {/* Lista de dependentes */}
          {dependentes.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-800">Dependentes Adicionados</h3>
              {dependentes.map((dep, index) => (
                <div
                  key={index}
                  className="p-4 bg-gray-50 rounded-lg flex justify-between items-start"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{dep.nome}</p>
                    <p className="text-sm text-gray-600">
                      {dep.relacao && `Relação: ${dep.relacao}`}
                    </p>
                    {dep.sexo && (
                      <p className="text-sm text-gray-600">Sexo: {dep.sexo}</p>
                    )}
                    {dep.telefone_celular && (
                      <p className="text-sm text-gray-600">Celular: {dep.telefone_celular}</p>
                    )}
                    {dep.cpf && (
                      <p className="text-sm text-gray-600">CPF: {dep.cpf}</p>
                    )}
                    {dep.email && (
                      <p className="text-sm text-gray-600">Email: {dep.email}</p>
                    )}
                    {dep.rg && (
                      <p className="text-sm text-gray-600">RG: {dep.rg}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleEditDependente(index)}
                      variant="outline"
                      size="sm"
                    >
                      Editar
                    </Button>
                    <Button
                      onClick={() => handleRemoveDependente(index)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      Remover
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
