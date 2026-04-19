'use client'

import { useState } from 'react'
import { CadastroFormData } from '@/lib/types'
import { getAgeFromIsoDate, isValidCPF, isValidEmail } from '@/lib/utils'
import { StepPessoal } from './steps/StepPessoal'
import { StepEndereco } from './steps/StepEndereco'
import { StepDependentes } from './steps/StepDependentes'
import { StepSelfie } from './steps/StepSelfie'
import { StepTermo } from './steps/StepTermo'
import { StepConfirmacao } from './steps/StepConfirmacao'
import { Button } from '@/components/ui/button'

const STEPS = [
  'Dados Pessoais',
  'Endereço',
  'Dependentes',
  'Selfie',
  'Termo de Adesão',
  'Confirmação',
]

interface CadastroFormProps {
  onSuccess: (data: any) => void
}

const CPF_CHECK_FALLBACK_ERROR = 'Não foi possível validar o CPF no momento. Tente novamente.'

function sanitizeApiErrorMessage(value: unknown) {
  if (typeof value !== 'string') return null

  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized) return null

  if (/(<!doctype|<html|cloudflare|error code 52\d|ssl handshake|cf-ray)/i.test(normalized)) {
    return null
  }

  const withoutHtmlTags = normalized.replace(/<[^>]+>/g, '').trim()
  if (!withoutHtmlTags || withoutHtmlTags.length > 220) {
    return null
  }

  return withoutHtmlTags
}

async function readApiErrorMessage(response: Response, fallbackMessage: string) {
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    return fallbackMessage
  }

  const payload = await response.json().catch(() => null) as { error?: unknown } | null
  const safeMessage = sanitizeApiErrorMessage(payload?.error)
  return safeMessage || fallbackMessage
}

export function CadastroForm({ onSuccess }: CadastroFormProps) {
  const [step, setStep] = useState(0)
  const [validationStep, setValidationStep] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingCpf, setIsCheckingCpf] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aceiteTermos, setAceiteTermos] = useState(false)
  const [aceitePrivacidade, setAceitePrivacidade] = useState(false)
  const [formData, setFormData] = useState<Partial<CadastroFormData>>({
    dependentes: [],
    tem_dependentes: false,
  })

  const checkCpfAlreadyRegistered = async (cpf: string) => {
    const response = await fetch(`/api/cadastro/verificar-cpf?cpf=${encodeURIComponent(cpf)}`)

    if (!response.ok) {
      const safeMessage = await readApiErrorMessage(response, CPF_CHECK_FALLBACK_ERROR)
      throw new Error(safeMessage)
    }

    const payload = await response.json().catch(() => ({}))
    return Boolean(payload.exists)
  }

  const handleNext = async () => {
    const stepError = getStepValidationError(step)
    if (stepError) {
      setError(stepError)
      setValidationStep(step)
      return
    }

    if (step === 0 && formData.cpf) {
      try {
        setIsCheckingCpf(true)
        const alreadyRegistered = await checkCpfAlreadyRegistered(formData.cpf)

        if (alreadyRegistered) {
          setError('CPF já identificado na nossa base de cadastrados.')
          setValidationStep(0)
          return
        }
      } catch (cpfCheckError) {
        setError(
          cpfCheckError instanceof Error
            ? cpfCheckError.message
            : CPF_CHECK_FALLBACK_ERROR
        )
        setValidationStep(0)
        return
      } finally {
        setIsCheckingCpf(false)
      }
    }

    if (step < STEPS.length - 1) {
      setStep(step + 1)
      setError(null)
      setValidationStep(null)
    }
  }

  const handlePrev = () => {
    if (step > 0) {
      setStep(step - 1)
      setError(null)
      setValidationStep(null)
    }
  }

  const updateFormData = (data: Partial<CadastroFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }))
    if (error) {
      setError(null)
    }
  }

  const hasValue = (value?: string) => Boolean(value?.trim())

  const getStepValidationError = (currentStep: number) => {
    if (currentStep === 0) {
      if (
        !hasValue(formData.nome) ||
        !hasValue(formData.cpf) ||
        !hasValue(formData.rg) ||
        !hasValue(formData.email) ||
        !hasValue(formData.telefone) ||
        !hasValue(formData.sexo) ||
        !hasValue(formData.data_nascimento) ||
        !hasValue(formData.estado_civil) ||
        !hasValue(formData.escolaridade) ||
        !hasValue(formData.situacao_profissional)
      ) {
        return 'Preencha todos os campos obrigatórios dos dados pessoais para continuar.'
      }

      if (formData.estado_civil === 'Casado(a)' && !hasValue(formData.nome_conjuge)) {
        return 'Informe o nome do cônjuge para continuar.'
      }

      if (formData.cpf && !isValidCPF(formData.cpf)) {
        return 'CPF do titular inválido.'
      }

      if (formData.email && !isValidEmail(formData.email)) {
        return 'Email do titular inválido.'
      }
    }

    if (currentStep === 1) {
      if (
        !hasValue(formData.endereco) ||
        !hasValue(formData.numero) ||
        !hasValue(formData.bairro) ||
        !hasValue(formData.cidade) ||
        !hasValue(formData.estado) ||
        !hasValue(formData.cep)
      ) {
        return 'Preencha todos os campos obrigatórios do endereço para continuar.'
      }
    }

    if (currentStep === 2 && formData.tem_dependentes) {
      const dependentes = formData.dependentes || []

      if (dependentes.length === 0) {
        return 'Adicione ao menos um dependente para continuar.'
      }

      const invalidDependente = dependentes.find(
        (dep) =>
          !hasValue(dep.nome) ||
          !hasValue(dep.rg) ||
          !hasValue(dep.relacao) ||
          !hasValue(dep.email) ||
          !hasValue(dep.telefone_celular) ||
          !hasValue(dep.sexo)
      )

      if (invalidDependente) {
        return 'Cada dependente precisa ter nome, RG, relação, email, sexo e telefone celular.'
      }

      const invalidDependenteEmail = dependentes.find((dep) => dep.email && !isValidEmail(dep.email))
      if (invalidDependenteEmail) {
        return `Email inválido para dependente: ${invalidDependenteEmail.nome || 'sem nome'}.`
      }

      const titularEmail = String(formData.email || '').trim().toLowerCase()
      const dependenteComMesmoEmailTitularSemRegra = dependentes.find((dep) => {
        const dependenteEmail = String(dep.email || '').trim().toLowerCase()
        if (!titularEmail || dependenteEmail !== titularEmail) return false

        const age = getAgeFromIsoDate(String(dep.data_nascimento || '').trim())
        return age === null || age >= 18
      })

      if (dependenteComMesmoEmailTitularSemRegra) {
        return `Dependente ${dependenteComMesmoEmailTitularSemRegra.nome || 'sem nome'} só pode usar email do titular se for menor de idade.`
      }

      const invalidDependenteCpf = dependentes.find((dep) => dep.cpf && !isValidCPF(dep.cpf))
      if (invalidDependenteCpf) {
        return `CPF inválido para dependente: ${invalidDependenteCpf.nome || 'sem nome'}.`
      }
    }

    if (currentStep === 3 && !formData.selfie_blob) {
      return 'Capture ou envie uma selfie para continuar.'
    }

    return null
  }

  const handleSubmit = async () => {
    try {
      setIsLoading(true)
      setError(null)

      if (
        !formData.nome ||
        !formData.cpf ||
        !formData.rg ||
        !formData.email ||
        !formData.telefone ||
        !formData.sexo ||
        !formData.data_nascimento ||
        !formData.estado_civil ||
        !formData.escolaridade ||
        !formData.situacao_profissional
      ) {
        throw new Error('Dados pessoais incompletos')
      }

      if (formData.estado_civil === 'Casado(a)' && !formData.nome_conjuge?.trim()) {
        throw new Error('Nome do cônjuge é obrigatório para estado civil casado(a)')
      }

      if (!isValidCPF(formData.cpf)) {
        throw new Error('CPF do titular inválido')
      }

      if (!isValidEmail(formData.email)) {
        throw new Error('Email do titular inválido')
      }

      const invalidDependente = (formData.dependentes || []).find(
        (dependente) =>
          !dependente.nome?.trim() ||
          !dependente.rg?.trim() ||
          !dependente.relacao?.trim() ||
          !dependente.email?.trim() ||
          !dependente.telefone_celular?.trim() ||
          !dependente.sexo?.trim()
      )

      if (formData.tem_dependentes && invalidDependente) {
        throw new Error(
          `Cada dependente precisa ter nome, RG, relação, email, sexo e telefone celular (${invalidDependente.nome || 'sem nome'}).`
        )
      }

      const invalidDependenteEmail = (formData.dependentes || []).find(
        (dependente) => dependente.email && !isValidEmail(dependente.email)
      )

      if (invalidDependenteEmail) {
        throw new Error(`Email inválido para dependente: ${invalidDependenteEmail.nome}`)
      }

      const titularEmail = String(formData.email || '').trim().toLowerCase()
      const dependenteComMesmoEmailTitularSemRegra = (formData.dependentes || []).find((dependente) => {
        const dependenteEmail = dependente.email?.trim().toLowerCase() || ''
        if (!titularEmail || dependenteEmail !== titularEmail) return false

        const age = getAgeFromIsoDate(dependente.data_nascimento?.trim() || '')
        return age === null || age >= 18
      })

      if (dependenteComMesmoEmailTitularSemRegra) {
        throw new Error(
          `Dependente ${dependenteComMesmoEmailTitularSemRegra.nome || 'sem nome'} só pode usar email do titular se for menor de idade.`
        )
      }

      const invalidDependenteCpf = (formData.dependentes || []).find(
        (dependente) => dependente.cpf && !isValidCPF(dependente.cpf)
      )

      if (invalidDependenteCpf) {
        throw new Error(`CPF inválido para dependente: ${invalidDependenteCpf.nome}`)
      }

      if (
        !formData.endereco ||
        !formData.numero ||
        !formData.bairro ||
        !formData.cidade ||
        !formData.estado ||
        !formData.cep
      ) {
        throw new Error('Endereço incompleto')
      }

      if (!aceiteTermos || !aceitePrivacidade) {
        throw new Error('Você precisa aceitar os termos e a política de privacidade para concluir o cadastro')
      }

      const submitData = new FormData()
      submitData.append('nome', formData.nome)
      submitData.append('cpf', formData.cpf)
      submitData.append('rg', formData.rg)
      submitData.append('email', formData.email)
      submitData.append('data_nascimento', formData.data_nascimento || '')
      submitData.append('telefone', formData.telefone || '')
      submitData.append('sexo', formData.sexo || '')
      submitData.append('estado_civil', formData.estado_civil || '')
      submitData.append('nome_conjuge', formData.nome_conjuge || '')
      submitData.append('escolaridade', formData.escolaridade || '')
      submitData.append('situacao_profissional', formData.situacao_profissional || '')
      submitData.append('profissao', formData.profissao || '')
      submitData.append('endereco', formData.endereco || '')
      submitData.append('numero', formData.numero || '')
      submitData.append('complemento', formData.complemento || '')
      submitData.append('bairro', formData.bairro || '')
      submitData.append('cidade', formData.cidade || '')
      submitData.append('estado', formData.estado || '')
      submitData.append('cep', formData.cep || '')
      submitData.append('tem_dependentes', String(formData.tem_dependentes))
      submitData.append('dependentes', JSON.stringify(formData.dependentes || []))

      if (formData.selfie_blob) {
        submitData.append('selfie', formData.selfie_blob)
      }

      const response = await fetch('/api/cadastro', {
        method: 'POST',
        body: submitData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao enviar cadastro')
      }

      const result = await response.json()
      onSuccess(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setIsLoading(false)
    }
  }

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <StepPessoal
            data={formData}
            onUpdate={updateFormData}
            showValidation={validationStep === 0}
          />
        )
      case 1:
        return (
          <StepEndereco
            data={formData}
            onUpdate={updateFormData}
            showValidation={validationStep === 1}
          />
        )
      case 2:
        return (
          <StepDependentes
            data={formData}
            onUpdate={updateFormData}
            showValidation={validationStep === 2}
          />
        )
      case 3:
        return (
          <StepSelfie
            data={formData}
            onUpdate={updateFormData}
            showValidation={validationStep === 3}
          />
        )
      case 4:
        return <StepTermo data={formData} />
      case 5:
        return (
          <StepConfirmacao
            data={formData}
            aceiteTermos={aceiteTermos}
            aceitePrivacidade={aceitePrivacidade}
            onAceiteTermosChange={setAceiteTermos}
            onAceitePrivacidadeChange={setAceitePrivacidade}
            showValidation={validationStep === 5}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-8">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm font-medium text-gray-600">
          <span>
            Etapa {step + 1} de {STEPS.length}
          </span>
          <span>{STEPS[step]}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Content */}
      <div className="min-h-96">
        {renderStep()}
      </div>

      {/* Navigation Buttons */}
      <div className="pt-6 border-t border-gray-200 space-y-4">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg" role="alert">
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="flex justify-between">
          <Button
            onClick={handlePrev}
            disabled={step === 0 || isLoading}
            variant="outline"
          >
            Voltar
          </Button>

          {step === STEPS.length - 1 ? (
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !aceiteTermos || !aceitePrivacidade}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? 'Enviando...' : 'Concluir Cadastro'}
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={isLoading || isCheckingCpf}>
              {isCheckingCpf ? 'Validando CPF...' : 'Próximo'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
