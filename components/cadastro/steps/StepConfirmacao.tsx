'use client'

import { CadastroFormData } from '@/lib/types'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

type BillingType = 'PIX' | 'BOLETO' | 'CREDIT_CARD'

type PlanOption = {
  codigo: string
  nome: string
  valor: number
  permiteDependentes: boolean
  minDependentes: number
  maxDependentes: number | null
  valorDependenteAdicional: number
}

type BillingConfig = {
  adesaoByPlanType: Record<string, number>
  mensalidadeByPlanType: Record<string, number>
  defaultPlanType: string
  planos: PlanOption[]
  mensalidadeBillingTypes: BillingType[]
  defaultMensalidadeBillingType: BillingType
} | null

interface StepConfirmacaoProps {
  data: Partial<CadastroFormData>
  aceiteTermos: boolean
  aceitePrivacidade: boolean
  billingConfig: BillingConfig
  isLoadingBillingConfig: boolean
  onAceiteTermosChange: (value: boolean) => void
  onAceitePrivacidadeChange: (value: boolean) => void
  onMensalidadeBillingTypeChange: (value: BillingType) => void
  showValidation?: boolean
}

export function StepConfirmacao({
  data,
  aceiteTermos,
  aceitePrivacidade,
  billingConfig,
  isLoadingBillingConfig,
  onAceiteTermosChange,
  onAceitePrivacidadeChange,
  onMensalidadeBillingTypeChange,
}: StepConfirmacaoProps) {
  const billingTypeLabels: Record<BillingType, string> = {
    PIX: 'PIX',
    BOLETO: 'Boleto',
    CREDIT_CARD: 'Cartão de Crédito',
  }

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const selectedBillingType =
    (data.mensalidade_billing_type as BillingType | undefined) ||
    billingConfig?.defaultMensalidadeBillingType ||
    'PIX'

  const selectedPlanType =
    (data.tipo_plano as string | undefined) ||
    billingConfig?.defaultPlanType ||
    (billingConfig?.planos[0]?.codigo || '')

  const selectedPlan =
    billingConfig?.planos?.find((plan) => plan.codigo === selectedPlanType) ||
    billingConfig?.planos?.[0] ||
    null

  const dependentesCount = Array.isArray(data.dependentes) ? data.dependentes.length : 0
  const selectedPlanBaseValue =
    selectedPlan
      ? Number.isFinite(Number(selectedPlan.valor))
        ? Number(selectedPlan.valor)
        : 0
      : billingConfig?.mensalidadeByPlanType?.[selectedPlanType] ?? 0

  const selectedPlanMinDependentes = selectedPlan?.permiteDependentes
    ? Math.max(1, Number(selectedPlan.minDependentes || 1))
    : 0
  const selectedPlanValorDependenteAdicional = selectedPlan?.permiteDependentes
    ? Math.max(0, Number(selectedPlan.valorDependenteAdicional || 0))
    : 0
  const dependentesExcedentes = selectedPlan?.permiteDependentes
    ? Math.max(0, dependentesCount - selectedPlanMinDependentes)
    : 0
  const adicionalDependentes = dependentesExcedentes * selectedPlanValorDependenteAdicional
  const selectedMensalidadeValue = Math.round((selectedPlanBaseValue + adicionalDependentes + Number.EPSILON) * 100) / 100
  const selectedAdesaoValue = selectedMensalidadeValue

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg">
        <p className="text-sm text-blue-900">✓ Revise os dados abaixo antes de finalizar seu cadastro.</p>
      </div>

      <div className="space-y-4 border border-gray-200 rounded-lg p-6 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-800">Dados do Cadastro</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-600">Nome Completo</p>
            <p className="font-medium text-gray-800">{data.nome}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">CPF</p>
            <p className="font-medium text-gray-800">{data.cpf}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">RG</p>
            <p className="font-medium text-gray-800">{data.rg || 'Não informado'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Email</p>
            <p className="font-medium text-gray-800">{data.email}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Telefone</p>
            <p className="font-medium text-gray-800">{data.telefone || 'Não informado'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Data de Nascimento</p>
            <p className="font-medium text-gray-800">
              {data.data_nascimento
                ? new Date(data.data_nascimento).toLocaleDateString('pt-BR')
                : 'Não informada'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Sexo</p>
            <p className="font-medium text-gray-800">{data.sexo || 'Não informado'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Estado Civil</p>
            <p className="font-medium text-gray-800">{data.estado_civil || 'Não informado'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Nome do Cônjuge</p>
            <p className="font-medium text-gray-800">{data.nome_conjuge || 'Não informado'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Escolaridade</p>
            <p className="font-medium text-gray-800">{data.escolaridade || 'Não informada'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Situação Profissional</p>
            <p className="font-medium text-gray-800">{data.situacao_profissional || 'Não informada'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Profissão</p>
            <p className="font-medium text-gray-800">{data.profissao || 'Não informada'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Selfie</p>
            <p className="font-medium text-gray-800">{data.selfie_blob ? '✓ Capturada' : '✗ Não capturada'}</p>
          </div>
        </div>

        <div className="border-t pt-4 mt-4">
          <p className="text-sm font-medium text-gray-800 mb-2">Endereço</p>
          <p className="text-sm text-gray-700">
            {data.endereco && `${data.endereco}, ${data.numero}`}
            {data.complemento && ` - ${data.complemento}`}
            {data.bairro && <br />}
            {data.bairro && `${data.bairro}`}
            {data.cidade && `, ${data.cidade}`}
            {data.estado && ` - ${data.estado}`}
            {data.cep && <br />}
            {data.cep && `CEP: ${data.cep}`}
          </p>
        </div>

        {data.tem_dependentes && data.dependentes && data.dependentes.length > 0 && (
          <div className="border-t pt-4 mt-4">
            <p className="text-sm font-medium text-gray-800 mb-2">Dependentes</p>
            <div className="space-y-2">
              {data.dependentes.map((dep, index) => (
                <p key={index} className="text-sm text-gray-700">
                  {index + 1}. {dep.nome} - {dep.relacao} | Email: {dep.email || '-'} | RG: {dep.rg || '-'} |
                  {' '}Sexo: {dep.sexo || '-'} | Celular: {dep.telefone_celular || '-'}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800">Cobrança e Plano</h3>

        {isLoadingBillingConfig ? (
          <p className="text-sm text-gray-600">Carregando opções de cobrança...</p>
        ) : (
          <>
            {billingConfig && (
              <div className="space-y-4">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs text-gray-600">Tipo de plano escolhido</p>
                  <p className="text-base font-semibold text-gray-900">
                    {selectedPlan?.nome || 'Plano não identificado'}
                  </p>
                  {selectedPlan ? (
                    <p className="text-xs text-gray-600">
                      {selectedPlan.permiteDependentes
                        ? selectedPlan.maxDependentes !== null && selectedPlan.maxDependentes > 0
                          ? `Mínimo ${selectedPlan.minDependentes} e máximo ${selectedPlan.maxDependentes} dependentes`
                          : `Mínimo ${selectedPlan.minDependentes} dependentes (sem limite máximo)`
                        : 'Sem dependentes'}
                    </p>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="text-xs text-gray-600">Taxa de adesão</p>
                    <p className="text-base font-semibold text-gray-900">
                      {formatCurrency(selectedAdesaoValue)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="text-xs text-gray-600">
                      Mensalidade ({selectedPlan?.nome || 'Plano selecionado'})
                    </p>
                    <p className="text-base font-semibold text-gray-900">
                      {formatCurrency(selectedMensalidadeValue)}
                    </p>
                    {selectedPlan?.permiteDependentes && selectedPlanValorDependenteAdicional > 0 ? (
                      <p className="mt-1 text-xs text-gray-600">
                        Base: {formatCurrency(selectedPlanBaseValue)}. Excedentes: {dependentesExcedentes} x{' '}
                        {formatCurrency(selectedPlanValorDependenteAdicional)} = {formatCurrency(adicionalDependentes)}.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-800">Forma de cobrança da mensalidade *</p>
              <RadioGroup
                value={selectedBillingType}
                onValueChange={(value) => onMensalidadeBillingTypeChange(value as BillingType)}
                className="space-y-2"
              >
                {(billingConfig?.mensalidadeBillingTypes || ['PIX']).map((billingType) => (
                  <label key={billingType} className="flex items-center gap-3 rounded-md border border-gray-200 p-2">
                    <RadioGroupItem value={billingType} id={`billing-${billingType}`} />
                    <span className="text-sm text-gray-800">{billingTypeLabels[billingType as BillingType]}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
          </>
        )}
      </div>

      <div className="space-y-4 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800">Confirmação</h3>

        <div className="flex items-start space-x-3">
          <Checkbox
            id="termos"
            checked={aceiteTermos}
            onCheckedChange={(value) => onAceiteTermosChange(value === true)}
            className="mt-1"
          />
          <label htmlFor="termos" className="text-sm text-gray-700 cursor-pointer">
            Li e concordo com o <strong>Termo de Adesão ao Serviço</strong> *
          </label>
        </div>

        <div className="flex items-start space-x-3">
          <Checkbox
            id="privacidade"
            checked={aceitePrivacidade}
            onCheckedChange={(value) => onAceitePrivacidadeChange(value === true)}
            className="mt-1"
          />
          <label htmlFor="privacidade" className="text-sm text-gray-700 cursor-pointer">
            Autorizo o armazenamento e processamento dos meus dados pessoais e imagem (selfie)
            conforme a <strong>Política de Privacidade</strong> *
          </label>
        </div>

        <p className="text-xs text-gray-500">* Campos obrigatórios para conclusão do cadastro</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
        <p className="text-sm font-medium text-amber-900">📌 Informações Importantes</p>
        <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside">
          <li>Após o cadastro você verá o QR Code PIX para pagar a adesão</li>
          <li>O termo será enviado para {data.email} após confirmação do pagamento</li>
          <li>Seu cadastro será armazenado com segurança em nossos servidores</li>
          <li>Sua selfie será utilizada apenas para verificação de identidade</li>
        </ul>
      </div>

      <p className="text-xs text-gray-500">
        Ao clicar em "Concluir Cadastro", você será redirecionado para o pagamento da adesão.
      </p>
    </div>
  )
}
