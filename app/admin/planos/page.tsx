'use client'

import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

type BillingType = 'PIX' | 'BOLETO' | 'CREDIT_CARD'
type PlanType = 'INDIVIDUAL' | 'FAMILIAR'

type Plano = {
  id: string
  codigo: string
  nome: string
  valor: number
  ativo: boolean
  ordem: number
  created_at: string
  updated_at: string
}

type EditablePlan = {
  nome: string
  valor: string
  ativo: boolean
}

const MIN_CHARGE_VALUE = 5

const PLAN_TYPE_LABEL: Record<PlanType, string> = {
  INDIVIDUAL: 'Individual',
  FAMILIAR: 'Familiar',
}

export default function AdminPlanosPage() {
  const router = useRouter()

  const [planos, setPlanos] = useState<Plano[]>([])
  const [editablePlanos, setEditablePlanos] = useState<Record<string, EditablePlan>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [savingPlanId, setSavingPlanId] = useState<string | null>(null)
  const [isSavingBaseValues, setIsSavingBaseValues] = useState(false)
  const [isSavingDefaultPlan, setIsSavingDefaultPlan] = useState(false)

  const [allowedPlanTypes, setAllowedPlanTypes] = useState<PlanType[]>(['INDIVIDUAL', 'FAMILIAR'])
  const [defaultPlanType, setDefaultPlanType] = useState<PlanType>('INDIVIDUAL')
  const [mensalidadeBillingTypes, setMensalidadeBillingTypes] = useState<BillingType[]>(['PIX'])
  const [defaultMensalidadeBillingType, setDefaultMensalidadeBillingType] =
    useState<BillingType>('PIX')

  const [novoPlanoNome, setNovoPlanoNome] = useState('')
  const [novoPlanoValor, setNovoPlanoValor] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const fetchPlanos = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/admin/planos', { cache: 'no-store' })
      const payload = await response.json().catch(() => null)

      if (response.status === 401) {
        router.push('/admin/login')
        return
      }

      if (!response.ok) {
        throw new Error(payload?.error || 'Erro ao carregar planos.')
      }

      const list: Plano[] = Array.isArray(payload?.planos) ? payload.planos : []
      setPlanos(list)

      const editable = list.reduce<Record<string, EditablePlan>>((acc, plano) => {
        acc[plano.id] = {
          nome: String(plano.nome || ''),
          valor: String(plano.valor ?? ''),
          ativo: Boolean(plano.ativo),
        }
        return acc
      }, {})

      setEditablePlanos(editable)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar planos.')
    } finally {
      setIsLoading(false)
    }
  }, [router])

  const fetchBillingSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/cobranca-configuracoes', { cache: 'no-store' })
      const payload = await response.json().catch(() => null)

      if (response.status === 401) {
        router.push('/admin/login')
        return
      }

      if (!response.ok) {
        throw new Error(payload?.error || 'Erro ao carregar configuração de plano padrão.')
      }

      const types = Array.isArray(payload?.settings?.mensalidadeBillingTypes)
        ? payload.settings.mensalidadeBillingTypes
        : ['PIX']

      setAllowedPlanTypes(
        Array.isArray(payload?.allowedPlanTypes) && payload.allowedPlanTypes.length > 0
          ? payload.allowedPlanTypes
          : ['INDIVIDUAL', 'FAMILIAR']
      )
      setDefaultPlanType((payload?.settings?.defaultPlanType || 'INDIVIDUAL') as PlanType)
      setMensalidadeBillingTypes(types)
      setDefaultMensalidadeBillingType(
        (payload?.settings?.defaultMensalidadeBillingType || types[0] || 'PIX') as BillingType
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao carregar configuração de plano padrão.'
      )
    }
  }, [router])

  useEffect(() => {
    fetchPlanos()
    fetchBillingSettings()
  }, [fetchPlanos, fetchBillingSettings])

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
      router.push('/admin/login')
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  const sortedPlanos = useMemo(
    () => [...planos].sort((a, b) => a.ordem - b.ordem),
    [planos]
  )

  const individualPlan = useMemo(
    () => sortedPlanos.find((plano) => plano.codigo === 'INDIVIDUAL') || null,
    [sortedPlanos]
  )

  const familiarPlan = useMemo(
    () => sortedPlanos.find((plano) => plano.codigo === 'FAMILIAR') || null,
    [sortedPlanos]
  )

  const updateEditablePlan = (planId: string, next: Partial<EditablePlan>) => {
    setEditablePlanos((prev) => ({
      ...prev,
      [planId]: {
        ...(prev[planId] || { nome: '', valor: '', ativo: true }),
        ...next,
      },
    }))
  }

  const handleCreatePlano = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      setIsCreating(true)
      setError(null)
      setMessage(null)

      const nome = novoPlanoNome.trim()
      const valor = Number(novoPlanoValor)

      if (!nome) {
        throw new Error('Informe o nome do novo plano.')
      }

      if (!Number.isFinite(valor) || valor < MIN_CHARGE_VALUE) {
        throw new Error('Informe um valor válido (mínimo R$ 5,00).')
      }

      const response = await fetch('/api/admin/planos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, valor }),
      })

      const payload = await response.json().catch(() => null)

      if (response.status === 401) {
        router.push('/admin/login')
        return
      }

      if (!response.ok) {
        throw new Error(payload?.error || 'Erro ao criar plano.')
      }

      setMessage(payload?.message || 'Plano criado com sucesso.')
      setNovoPlanoNome('')
      setNovoPlanoValor('')
      await fetchPlanos()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar plano.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleSavePlano = async (planId: string) => {
    const plan = editablePlanos[planId]
    if (!plan) return

    try {
      setSavingPlanId(planId)
      setError(null)
      setMessage(null)

      const nome = plan.nome.trim()
      const valor = Number(plan.valor)

      if (!nome) {
        throw new Error('Nome do plano é obrigatório.')
      }

      if (!Number.isFinite(valor) || valor < MIN_CHARGE_VALUE) {
        throw new Error('Valor do plano inválido. Mínimo R$ 5,00.')
      }

      const response = await fetch(`/api/admin/planos/${encodeURIComponent(planId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome,
          valor,
          ativo: plan.ativo,
        }),
      })

      const payload = await response.json().catch(() => null)

      if (response.status === 401) {
        router.push('/admin/login')
        return
      }

      if (!response.ok) {
        throw new Error(payload?.error || 'Erro ao atualizar plano.')
      }

      setMessage(payload?.message || 'Plano atualizado com sucesso.')
      await fetchPlanos()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar plano.')
    } finally {
      setSavingPlanId(null)
    }
  }

  const handleSaveBaseValues = async () => {
    if (!individualPlan || !familiarPlan) {
      setError('Planos base INDIVIDUAL e FAMILIAR são obrigatórios para esta configuração.')
      return
    }

    const individualEditable = editablePlanos[individualPlan.id]
    const familiarEditable = editablePlanos[familiarPlan.id]

    if (!individualEditable || !familiarEditable) {
      setError('Não foi possível carregar os dados dos planos base para salvar.')
      return
    }

    try {
      setIsSavingBaseValues(true)
      setError(null)
      setMessage(null)

      const individualValue = Number(individualEditable.valor)
      const familiarValue = Number(familiarEditable.valor)

      if (!Number.isFinite(individualValue) || individualValue < MIN_CHARGE_VALUE) {
        throw new Error('Valor do Plano Individual inválido. Mínimo R$ 5,00.')
      }

      if (!Number.isFinite(familiarValue) || familiarValue < MIN_CHARGE_VALUE) {
        throw new Error('Valor do Plano Familiar inválido. Mínimo R$ 5,00.')
      }

      const updatePlan = async (planId: string, payload: EditablePlan) => {
        const response = await fetch(`/api/admin/planos/${encodeURIComponent(planId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome: payload.nome.trim(),
            valor: Number(payload.valor),
            ativo: payload.ativo,
          }),
        })

        const data = await response.json().catch(() => null)

        if (response.status === 401) {
          router.push('/admin/login')
          return false
        }

        if (!response.ok) {
          throw new Error(data?.error || 'Erro ao atualizar valores dos planos base.')
        }

        return true
      }

      const okIndividual = await updatePlan(individualPlan.id, individualEditable)
      if (!okIndividual) return

      const okFamiliar = await updatePlan(familiarPlan.id, familiarEditable)
      if (!okFamiliar) return

      setMessage('Valores dos planos base atualizados com sucesso.')
      await fetchPlanos()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar valores dos planos base.')
    } finally {
      setIsSavingBaseValues(false)
    }
  }

  const handleSaveDefaultPlan = async () => {
    if (!individualPlan || !familiarPlan) {
      setError('Planos base INDIVIDUAL e FAMILIAR são obrigatórios para definir plano padrão.')
      return
    }

    const individualEditable = editablePlanos[individualPlan.id]
    const familiarEditable = editablePlanos[familiarPlan.id]

    if (!individualEditable || !familiarEditable) {
      setError('Não foi possível carregar valores dos planos base para salvar o plano padrão.')
      return
    }

    try {
      setIsSavingDefaultPlan(true)
      setError(null)
      setMessage(null)

      const individualValue = Number(individualEditable.valor)
      const familiarValue = Number(familiarEditable.valor)

      if (!Number.isFinite(individualValue) || individualValue < MIN_CHARGE_VALUE) {
        throw new Error('Valor do Plano Individual inválido. Mínimo R$ 5,00.')
      }

      if (!Number.isFinite(familiarValue) || familiarValue < MIN_CHARGE_VALUE) {
        throw new Error('Valor do Plano Familiar inválido. Mínimo R$ 5,00.')
      }

      const response = await fetch('/api/admin/cobranca-configuracoes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensalidadeIndividualValue: individualValue,
          mensalidadeFamiliarValue: familiarValue,
          mensalidadeBillingTypes,
          defaultMensalidadeBillingType,
          defaultPlanType,
        }),
      })

      const payload = await response.json().catch(() => null)

      if (response.status === 401) {
        router.push('/admin/login')
        return
      }

      if (!response.ok) {
        throw new Error(payload?.error || 'Erro ao atualizar plano padrão.')
      }

      setMessage('Plano padrão atualizado com sucesso.')
      setDefaultPlanType((payload?.settings?.defaultPlanType || defaultPlanType) as PlanType)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar plano padrão.')
    } finally {
      setIsSavingDefaultPlan(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-gray-900 sm:text-2xl">Planos</h1>
            <p className="text-xs text-gray-600 sm:text-sm">Gerencie nome e valor dos planos disponíveis</p>
          </div>
          <div className="hidden items-center gap-2 lg:flex">
            <Button onClick={fetchPlanos} variant="outline">Atualizar</Button>
            <Link href="/admin/configuracoes">
              <Button variant="outline">Configurações</Button>
            </Link>
            <Link href="/admin/dashboard">
              <Button variant="outline">Dashboard</Button>
            </Link>
            <Button onClick={handleLogout} variant="outline">Sair</Button>
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
                  <SheetTitle>Menu Planos</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-2 px-4 pb-4">
                  <SheetClose asChild>
                    <Button onClick={fetchPlanos} variant="outline" className="w-full justify-start">Atualizar</Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button asChild variant="outline" className="w-full justify-start">
                      <Link href="/admin/configuracoes">Configurações</Link>
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button asChild variant="outline" className="w-full justify-start">
                      <Link href="/admin/dashboard">Dashboard</Link>
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button onClick={handleLogout} variant="outline" className="w-full justify-start">Sair</Button>
                  </SheetClose>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {message && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3">
            <p className="text-sm text-green-700">{message}</p>
          </div>
        )}

        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Valores dos Planos Base</h2>

          {individualPlan && familiarPlan ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm font-medium text-gray-700">Valor do Plano Individual (R$)</span>
                  <input
                    type="number"
                    min={MIN_CHARGE_VALUE}
                    step="0.01"
                    value={editablePlanos[individualPlan.id]?.valor || ''}
                    onChange={(event) => updateEditablePlan(individualPlan.id, { valor: event.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    disabled={isSavingBaseValues}
                  />
                  <span className="text-xs text-gray-500">Mínimo: R$ 5,00</span>
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-gray-700">Valor do Plano Familiar (R$)</span>
                  <input
                    type="number"
                    min={MIN_CHARGE_VALUE}
                    step="0.01"
                    value={editablePlanos[familiarPlan.id]?.valor || ''}
                    onChange={(event) => updateEditablePlan(familiarPlan.id, { valor: event.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    disabled={isSavingBaseValues}
                  />
                  <span className="text-xs text-gray-500">Mínimo: R$ 5,00</span>
                </label>
              </div>

              <div className="space-y-3 rounded-lg border border-gray-200 p-4">
                <p className="text-sm font-medium text-gray-800">Regra aplicada automaticamente</p>
                <p className="text-xs text-gray-600">
                  O valor configurado em cada plano será usado tanto na taxa de adesão quanto na assinatura recorrente.
                </p>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveBaseValues} disabled={isSavingBaseValues}>
                  {isSavingBaseValues ? 'Salvando...' : 'Salvar valores dos planos base'}
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-amber-700">
              Não foi possível localizar os planos base INDIVIDUAL/FAMILIAR.
            </p>
          )}
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Plano padrão para novos clientes</h2>

          <RadioGroup
            value={defaultPlanType}
            onValueChange={(value) => setDefaultPlanType(value as PlanType)}
            className="space-y-2"
          >
            {allowedPlanTypes.map((planType) => (
              <label key={planType} className="flex items-center gap-3">
                <RadioGroupItem
                  value={planType}
                  id={`plan-${planType}`}
                  disabled={isSavingDefaultPlan}
                />
                <span className="text-sm text-gray-800">{PLAN_TYPE_LABEL[planType]}</span>
              </label>
            ))}
          </RadioGroup>

          <p className="text-xs text-gray-600">Plano familiar permite até 4 dependentes por titular.</p>

          <div className="flex justify-end">
            <Button onClick={handleSaveDefaultPlan} disabled={isSavingDefaultPlan}>
              {isSavingDefaultPlan ? 'Salvando...' : 'Salvar plano padrão'}
            </Button>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Criar novo plano</h2>
          <p className="mt-1 text-sm text-gray-600">O código é gerado automaticamente a partir do nome.</p>

          <form className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4" onSubmit={handleCreatePlano}>
            <label className="md:col-span-2">
              <span className="mb-1 block text-sm font-medium text-gray-700">Nome</span>
              <input
                value={novoPlanoNome}
                onChange={(event) => setNovoPlanoNome(event.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="Ex: Plano Empresarial"
                disabled={isCreating}
                required
              />
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-gray-700">Valor (R$)</span>
              <input
                type="number"
                min={MIN_CHARGE_VALUE}
                step="0.01"
                value={novoPlanoValor}
                onChange={(event) => setNovoPlanoValor(event.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="49.90"
                disabled={isCreating}
                required
              />
            </label>

            <div className="flex items-end">
              <Button type="submit" disabled={isCreating} className="w-full">
                {isCreating ? 'Criando...' : 'Criar Plano'}
              </Button>
            </div>
          </form>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Planos existentes</h2>

          {isLoading ? (
            <p className="mt-4 text-sm text-gray-600">Carregando planos...</p>
          ) : sortedPlanos.length === 0 ? (
            <p className="mt-4 text-sm text-gray-600">Nenhum plano cadastrado.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-600">
                    <th className="py-2 pr-4">Código</th>
                    <th className="py-2 pr-4">Nome</th>
                    <th className="py-2 pr-4">Valor (R$)</th>
                    <th className="py-2 pr-4">Ativo</th>
                    <th className="py-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPlanos.map((plano) => {
                    const editable = editablePlanos[plano.id] || {
                      nome: plano.nome,
                      valor: String(plano.valor),
                      ativo: plano.ativo,
                    }

                    const isSavingThisPlan = savingPlanId === plano.id

                    return (
                      <tr key={plano.id} className="border-b border-gray-100 align-top">
                        <td className="py-2 pr-4 font-mono text-xs text-gray-700">{plano.codigo}</td>
                        <td className="py-2 pr-4">
                          <input
                            value={editable.nome}
                            onChange={(event) => updateEditablePlan(plano.id, { nome: event.target.value })}
                            className="w-full min-w-[180px] rounded-md border border-gray-300 px-2 py-1.5"
                            disabled={isSavingThisPlan}
                          />
                        </td>
                        <td className="py-2 pr-4">
                          <input
                            type="number"
                            min={MIN_CHARGE_VALUE}
                            step="0.01"
                            value={editable.valor}
                            onChange={(event) => updateEditablePlan(plano.id, { valor: event.target.value })}
                            className="w-32 rounded-md border border-gray-300 px-2 py-1.5"
                            disabled={isSavingThisPlan}
                          />
                        </td>
                        <td className="py-2 pr-4">
                          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={editable.ativo}
                              onChange={(event) => updateEditablePlan(plano.id, { ativo: event.target.checked })}
                              disabled={isSavingThisPlan}
                            />
                            {editable.ativo ? 'Sim' : 'Não'}
                          </label>
                        </td>
                        <td className="py-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSavePlano(plano.id)}
                            disabled={isSavingThisPlan}
                          >
                            {isSavingThisPlan ? 'Salvando...' : 'Salvar'}
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
