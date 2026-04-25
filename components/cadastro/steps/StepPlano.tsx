import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Check, X } from 'lucide-react'

type PlanOption = {
  codigo: string
  nome: string
  descricao: string
  beneficios: Array<{ texto: string; inclui: boolean }>
  valor: number
  permiteDependentes: boolean
  minDependentes: number
  maxDependentes: number | null
  valorDependenteAdicional: number
}

interface StepPlanoProps {
  planos: PlanOption[]
  selectedPlanCode: string
  onSelectPlan: (codigo: string) => void
  onNext: () => void
  isLoading?: boolean
}

export function StepPlano({
  planos,
  selectedPlanCode,
  onSelectPlan,
  onNext,
  isLoading = false,
}: StepPlanoProps) {
  const selectedPlan = planos.find((p) => p.codigo === selectedPlanCode)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Escolha seu plano</h2>
        <p className="mt-2 text-sm text-gray-600">
          Selecione o plano que melhor atende suas necessidades
        </p>
      </div>

      <RadioGroup value={selectedPlanCode} onValueChange={onSelectPlan}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {planos.map((plano) => {
            const isSelected = plano.codigo === selectedPlanCode

            return (
              <label
                key={plano.codigo}
                className={`relative cursor-pointer rounded-lg border-2 p-6 transition-all ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <RadioGroupItem value={plano.codigo} id={plano.codigo} />
                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{plano.nome}</h3>
                      {plano.descricao && (
                        <p className="mt-1 text-sm text-gray-600">{plano.descricao}</p>
                      )}
                    </div>

                    <div className="text-2xl font-bold text-gray-900">
                      R$ {plano.valor.toFixed(2)}
                      <span className="text-sm font-normal text-gray-600">/mês</span>
                    </div>

                    {plano.beneficios.length > 0 && (
                      <ul className="space-y-2 text-sm">
                        {plano.beneficios.map((beneficio, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            {beneficio.inclui ? (
                              <Check className="h-4 w-4 shrink-0 text-green-600 mt-0.5" />
                            ) : (
                              <X className="h-4 w-4 shrink-0 text-gray-400 mt-0.5" />
                            )}
                            <span className={beneficio.inclui ? 'text-gray-700' : 'text-gray-500'}>
                              {beneficio.texto}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {plano.permiteDependentes && (
                      <div className="pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-600">
                          ✓ Permite dependentes
                          {plano.minDependentes > 0 && ` (mín: ${plano.minDependentes})`}
                          {plano.maxDependentes !== null && ` (máx: ${plano.maxDependentes})`}
                        </p>
                        {plano.valorDependenteAdicional > 0 && (
                          <p className="text-xs text-gray-600">
                            + R$ {plano.valorDependenteAdicional.toFixed(2)} por dependente adicional
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </label>
            )
          })}
        </div>
      </RadioGroup>

      {selectedPlan && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
          <p className="text-sm text-blue-900">
            <strong>Plano selecionado:</strong> {selectedPlan.nome} - R${' '}
            {selectedPlan.valor.toFixed(2)}/mês
          </p>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!selectedPlanCode || isLoading}>
          {isLoading ? 'Carregando...' : 'Continuar'}
        </Button>
      </div>
    </div>
  )
}
