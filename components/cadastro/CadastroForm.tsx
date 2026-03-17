'use client'

import { useState } from 'react'
import { CadastroFormData } from '@/lib/types'
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

export function CadastroForm({ onSuccess }: CadastroFormProps) {
  const [step, setStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aceiteTermos, setAceiteTermos] = useState(false)
  const [aceitePrivacidade, setAceitePrivacidade] = useState(false)
  const [formData, setFormData] = useState<Partial<CadastroFormData>>({
    dependentes: [],
    tem_dependentes: false,
  })

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1)
      setError(null)
    }
  }

  const handlePrev = () => {
    if (step > 0) {
      setStep(step - 1)
      setError(null)
    }
  }

  const updateFormData = (data: Partial<CadastroFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }))
  }

  const handleSubmit = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Validar dados obrigatórios
      if (
        !formData.nome ||
        !formData.cpf ||
        !formData.email ||
        !formData.telefone ||
        !formData.sexo ||
        !formData.data_nascimento
      ) {
        throw new Error('Dados pessoais incompletos')
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

      // Criar FormData para envio
      const submitData = new FormData()
      submitData.append('nome', formData.nome)
      submitData.append('cpf', formData.cpf)
      submitData.append('email', formData.email)
      submitData.append('data_nascimento', formData.data_nascimento || '')
      submitData.append('telefone', formData.telefone || '')
      submitData.append('sexo', formData.sexo || '')
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
        return <StepPessoal data={formData} onUpdate={updateFormData} />
      case 1:
        return <StepEndereco data={formData} onUpdate={updateFormData} />
      case 2:
        return <StepDependentes data={formData} onUpdate={updateFormData} />
      case 3:
        return <StepSelfie data={formData} onUpdate={updateFormData} />
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
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
        )}
        {renderStep()}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
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
          <Button onClick={handleNext} disabled={isLoading}>
            Próximo
          </Button>
        )}
      </div>
    </div>
  )
}
