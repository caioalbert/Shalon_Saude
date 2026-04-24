'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

type BillingType = 'PIX' | 'BOLETO' | 'CREDIT_CARD'
type PlanType = 'INDIVIDUAL' | 'FAMILIAR'
const MIN_CHARGE_VALUE = 5

const BILLING_TYPE_LABEL: Record<BillingType, string> = {
  PIX: 'PIX',
  BOLETO: 'Boleto',
  CREDIT_CARD: 'Cartão de Crédito',
}

const PLAN_TYPE_LABEL: Record<PlanType, string> = {
  INDIVIDUAL: 'Individual',
  FAMILIAR: 'Familiar',
}

export default function AdminCobrancaConfiguracoesPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [allowedBillingTypes, setAllowedBillingTypes] = useState<BillingType[]>(['PIX', 'BOLETO', 'CREDIT_CARD'])
  const [allowedPlanTypes, setAllowedPlanTypes] = useState<PlanType[]>(['INDIVIDUAL', 'FAMILIAR'])
  const [mensalidadeIndividualValue, setMensalidadeIndividualValue] = useState('')
  const [mensalidadeFamiliarValue, setMensalidadeFamiliarValue] = useState('')
  const [defaultPlanType, setDefaultPlanType] = useState<PlanType>('INDIVIDUAL')
  const [mensalidadeBillingTypes, setMensalidadeBillingTypes] = useState<BillingType[]>(['PIX'])
  const [defaultMensalidadeBillingType, setDefaultMensalidadeBillingType] = useState<BillingType>('PIX')
  const [source, setSource] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      setMessage(null)

      const response = await fetch('/api/admin/cobranca-configuracoes')
      const data = await response.json().catch(() => null)

      if (response.status === 401) {
        router.push('/admin/login')
        return
      }

      if (!response.ok) {
        throw new Error(data?.error || 'Erro ao carregar configurações de cobrança.')
      }

      const types = Array.isArray(data?.settings?.mensalidadeBillingTypes)
        ? data.settings.mensalidadeBillingTypes
        : ['PIX']

      setAllowedBillingTypes(
        Array.isArray(data?.allowedBillingTypes) && data.allowedBillingTypes.length > 0
          ? data.allowedBillingTypes
          : ['PIX', 'BOLETO', 'CREDIT_CARD']
      )
      setAllowedPlanTypes(
        Array.isArray(data?.allowedPlanTypes) && data.allowedPlanTypes.length > 0
          ? data.allowedPlanTypes
          : ['INDIVIDUAL', 'FAMILIAR']
      )
      setMensalidadeIndividualValue(
        String(data?.settings?.mensalidadeIndividualValue ?? data?.settings?.mensalidadeValue ?? '')
      )
      setMensalidadeFamiliarValue(
        String(data?.settings?.mensalidadeFamiliarValue ?? data?.settings?.mensalidadeValue ?? '')
      )
      setDefaultPlanType(data?.settings?.defaultPlanType || 'INDIVIDUAL')
      setMensalidadeBillingTypes(types)
      setDefaultMensalidadeBillingType(data?.settings?.defaultMensalidadeBillingType || types[0] || 'PIX')
      setSource(data?.settings?.source || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar configurações de cobrança.')
    } finally {
      setIsLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const sortedSelectedTypes = useMemo(
    () => allowedBillingTypes.filter((type) => mensalidadeBillingTypes.includes(type)),
    [allowedBillingTypes, mensalidadeBillingTypes]
  )

  const handleToggleBillingType = (billingType: BillingType, checked: boolean) => {
    setError(null)
    setMessage(null)

    if (checked) {
      setMensalidadeBillingTypes((prev) => {
        if (prev.includes(billingType)) return prev
        return [...prev, billingType]
      })

      if (!mensalidadeBillingTypes.includes(defaultMensalidadeBillingType)) {
        setDefaultMensalidadeBillingType(billingType)
      }
      return
    }

    setMensalidadeBillingTypes((prev) => {
      const next = prev.filter((type) => type !== billingType)
      if (next.length === 0) {
        return prev
      }

      if (!next.includes(defaultMensalidadeBillingType)) {
        setDefaultMensalidadeBillingType(next[0])
      }
      return next
    })
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      setError(null)
      setMessage(null)

      if (mensalidadeBillingTypes.length === 0) {
        throw new Error('Selecione ao menos uma forma de cobrança de mensalidade.')
      }

      const individualValue = Number(mensalidadeIndividualValue)
      const familiarValue = Number(mensalidadeFamiliarValue)

      if (!Number.isFinite(individualValue) || !Number.isFinite(familiarValue)) {
        throw new Error('Informe valores numéricos válidos para os planos.')
      }

      if (individualValue < MIN_CHARGE_VALUE || familiarValue < MIN_CHARGE_VALUE) {
        throw new Error(
          `O valor mínimo permitido pelo Asaas é R$ ${MIN_CHARGE_VALUE.toFixed(2).replace('.', ',')}.`
        )
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

      const data = await response.json().catch(() => null)

      if (response.status === 401) {
        router.push('/admin/login')
        return
      }

      if (!response.ok) {
        throw new Error(data?.error || 'Erro ao salvar configurações de cobrança.')
      }

      setMessage(data?.message || 'Configurações salvas com sucesso.')
      setSource(data?.settings?.source || null)
      setMensalidadeIndividualValue(
        String(data?.settings?.mensalidadeIndividualValue ?? mensalidadeIndividualValue)
      )
      setMensalidadeFamiliarValue(
        String(data?.settings?.mensalidadeFamiliarValue ?? mensalidadeFamiliarValue)
      )
      setDefaultPlanType(data?.settings?.defaultPlanType || defaultPlanType)
      setMensalidadeBillingTypes(data?.settings?.mensalidadeBillingTypes || mensalidadeBillingTypes)
      setDefaultMensalidadeBillingType(
        data?.settings?.defaultMensalidadeBillingType || defaultMensalidadeBillingType
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar configurações de cobrança.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
      router.push('/admin/login')
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-gray-900 sm:text-2xl">Configurações de Cobrança</h1>
            <p className="text-xs text-gray-600 sm:text-sm">
              Defina os valores por plano (adesão e mensalidade usam o mesmo valor)
            </p>
          </div>
          <div className="hidden items-center gap-2 lg:flex">
            <Link href="/admin/dashboard">
              <Button variant="outline">Voltar ao Dashboard</Button>
            </Link>
            <Link href="/admin/configuracoes">
              <Button variant="outline">Configurações</Button>
            </Link>
            <Button onClick={handleLogout} variant="outline">
              Sair
            </Button>
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
                  <SheetTitle>Menu Cobrança</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-2 px-4 pb-4">
                  <SheetClose asChild>
                    <Button asChild variant="outline" className="w-full justify-start">
                      <Link href="/admin/dashboard">Voltar ao Dashboard</Link>
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button asChild variant="outline" className="w-full justify-start">
                      <Link href="/admin/configuracoes">Configurações</Link>
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button onClick={handleLogout} variant="outline" className="w-full justify-start">
                      Sair
                    </Button>
                  </SheetClose>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-white p-6 shadow space-y-6">
          {isLoading ? (
            <p className="text-sm text-gray-600">Carregando configurações...</p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm font-medium text-gray-700">Valor do Plano Individual (R$)</span>
                  <input
                    type="number"
                    min={MIN_CHARGE_VALUE}
                    step="0.01"
                    value={mensalidadeIndividualValue}
                    onChange={(event) => setMensalidadeIndividualValue(event.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    disabled={isSaving}
                  />
                  <span className="text-xs text-gray-500">Mínimo: R$ 5,00</span>
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-gray-700">Valor do Plano Familiar (R$)</span>
                  <input
                    type="number"
                    min={MIN_CHARGE_VALUE}
                    step="0.01"
                    value={mensalidadeFamiliarValue}
                    onChange={(event) => setMensalidadeFamiliarValue(event.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    disabled={isSaving}
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

              <div className="space-y-3 rounded-lg border border-gray-200 p-4">
                <p className="text-sm font-medium text-gray-800">Plano padrão para novos clientes</p>
                <RadioGroup
                  value={defaultPlanType}
                  onValueChange={(value) => setDefaultPlanType(value as PlanType)}
                  className="space-y-2"
                >
                  {allowedPlanTypes.map((planType) => (
                    <label key={planType} className="flex items-center gap-3">
                      <RadioGroupItem value={planType} id={`plan-${planType}`} disabled={isSaving} />
                      <span className="text-sm text-gray-800">{PLAN_TYPE_LABEL[planType]}</span>
                    </label>
                  ))}
                </RadioGroup>
                <p className="text-xs text-gray-600">
                  Plano familiar permite até 4 dependentes por titular.
                </p>
              </div>

              <div className="space-y-3 rounded-lg border border-gray-200 p-4">
                <p className="text-sm font-medium text-gray-800">Formas de cobrança da mensalidade</p>
                <p className="text-xs text-gray-600">
                  Se houver mais de uma opção marcada, o cliente escolherá no fim da adesão.
                </p>

                <div className="space-y-2">
                  {allowedBillingTypes.map((billingType) => (
                    <label key={billingType} className="flex items-center gap-3">
                      <Checkbox
                        checked={mensalidadeBillingTypes.includes(billingType)}
                        onCheckedChange={(value) =>
                          handleToggleBillingType(billingType, value === true)
                        }
                        disabled={isSaving}
                      />
                      <span className="text-sm text-gray-800">{BILLING_TYPE_LABEL[billingType]}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3 rounded-lg border border-gray-200 p-4">
                <p className="text-sm font-medium text-gray-800">Opção padrão</p>
                <RadioGroup
                  value={defaultMensalidadeBillingType}
                  onValueChange={(value) =>
                    setDefaultMensalidadeBillingType(value as BillingType)
                  }
                  className="space-y-2"
                >
                  {sortedSelectedTypes.map((billingType) => (
                    <label key={billingType} className="flex items-center gap-3">
                      <RadioGroupItem value={billingType} id={`default-${billingType}`} disabled={isSaving} />
                      <span className="text-sm text-gray-800">{BILLING_TYPE_LABEL[billingType]}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              {source && (
                <p className="text-xs text-gray-500">
                  Fonte atual: {source === 'database' ? 'Banco (admin)' : 'Variáveis de ambiente (fallback)'}
                </p>
              )}

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

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving || isLoading}>
                  {isSaving ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
