'use client'

import { CadastroFormData } from '@/lib/types'
import { Checkbox } from '@/components/ui/checkbox'

interface StepConfirmacaoProps {
  data: Partial<CadastroFormData>
  aceiteTermos: boolean
  aceitePrivacidade: boolean
  onAceiteTermosChange: (value: boolean) => void
  onAceitePrivacidadeChange: (value: boolean) => void
}

export function StepConfirmacao({
  data,
  aceiteTermos,
  aceitePrivacidade,
  onAceiteTermosChange,
  onAceitePrivacidadeChange,
}: StepConfirmacaoProps) {
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg">
        <p className="text-sm text-blue-900">
          ✓ Revise os dados abaixo antes de finalizar seu cadastro.
        </p>
      </div>

      {/* Resumo dos Dados */}
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
            <p className="text-xs text-gray-600">Selfie</p>
            <p className="font-medium text-gray-800">
              {data.selfie_blob ? '✓ Capturada' : '✗ Não capturada'}
            </p>
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
                  {index + 1}. {dep.nome} - {dep.relacao} | Sexo: {dep.sexo || '-'} | Celular:{' '}
                  {dep.telefone_celular || '-'}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Checkboxes de Aceite */}
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

      {/* Informações Importantes */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
        <p className="text-sm font-medium text-amber-900">📌 Informações Importantes</p>
        <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside">
          <li>Um email será enviado para {data.email} com o termo de adesão assinado</li>
          <li>Seu cadastro será armazenado com segurança em nossos servidores</li>
          <li>Você poderá acessar seu termo assinado a qualquer momento</li>
          <li>Sua selfie será utilizada apenas para verificação de identidade</li>
        </ul>
      </div>

      <p className="text-xs text-gray-500">
        Ao clicar em "Concluir Cadastro", você será redirecionado para a tela de sucesso e receberá
        um email com seu termo de adesão assinado.
      </p>
    </div>
  )
}
